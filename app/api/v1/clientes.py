# Clientes sin cuenta: el administrador registra a una persona a partir de su DNI (sin correo)
# y desde ahí llega a su historial de préstamos. Solo administradores.
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.auth.dependencies import require_admin
from app.core.db import get_db
from app.core.validaciones import escapar_like
from app.models.cliente import Cliente
from app.models.prestamo import ACTIVO, Prestamo
from app.models.usuario import Usuario

router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"],
    dependencies=[Depends(require_admin)],
)


def _vacio_a_none(valor):
    if isinstance(valor, str) and not valor.strip():
        return None
    return valor


class ClienteEditar(BaseModel):
    """Datos que se pueden corregir. El DNI no: es lo que une a la persona con sus préstamos."""

    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str = Field(min_length=2, max_length=100)
    sexo: str | None = None
    telefono: str | None = Field(default=None, pattern=r"^[0-9+\s()-]{6,30}$")

    @field_validator("sexo", "telefono", mode="before")
    @classmethod
    def _vacios(cls, valor):
        return _vacio_a_none(valor)

    @field_validator("sexo")
    @classmethod
    def _validar_sexo(cls, valor):
        if valor is None:
            return None
        normalizado = valor.strip().lower()
        if normalizado not in {"femenino", "masculino"}:
            raise ValueError("El sexo debe ser Femenino o Masculino")
        return normalizado.capitalize()


class ClienteCrear(ClienteEditar):
    dni: str = Field(pattern=r"^\d{6,9}$")


def _buscar(db: Session, cliente_id: int) -> Cliente:
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


def _salida(clientes: list[Cliente], db: Session) -> list[dict]:
    """Agrega a cada cliente sus préstamos y si además tiene cuenta en la web.
    Son dos consultas para toda la lista, no una por cliente."""
    dnis = [c.dni for c in clientes]
    totales: dict[str, int] = {}
    activos: dict[str, int] = {}
    con_cuenta: set[str] = set()

    if dnis:
        for dni, estado, cantidad in (
            db.query(Prestamo.dni, Prestamo.estado, func.count(Prestamo.id))
            .filter(Prestamo.dni.in_(dnis))
            .group_by(Prestamo.dni, Prestamo.estado)
            .all()
        ):
            totales[dni] = totales.get(dni, 0) + cantidad
            if estado == ACTIVO:
                activos[dni] = cantidad

        con_cuenta = {
            fila[0]
            for fila in db.query(Usuario.dni)
            .filter(Usuario.dni.in_(dnis), Usuario.dni_verificado.is_(True))
            .all()
        }

    return [
        {
            "id": c.id,
            "dni": c.dni,
            "nombre": c.nombre,
            "sexo": c.sexo,
            "telefono": c.telefono,
            "creado_en": c.creado_en,
            "prestamos_total": totales.get(c.dni, 0),
            "prestamos_activos": activos.get(c.dni, 0),
            "con_cuenta": c.dni in con_cuenta,
        }
        for c in clientes
    ]


@router.get("/")
def listar_clientes(
    buscar: str = Query(default="", max_length=100),
    limite: int = Query(default=20, ge=1, le=100),
    desplazamiento: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Clientes registrados, por orden alfabético. Se busca por nombre o DNI (también con puntos)."""
    consulta = db.query(Cliente)

    termino = buscar.strip()
    if termino:
        condiciones = [Cliente.nombre.ilike(f"%{escapar_like(termino)}%", escape="\\")]
        solo_digitos = re.sub(r"[.\s]", "", termino)
        if solo_digitos.isdigit():
            condiciones.append(Cliente.dni.ilike(f"%{solo_digitos}%"))
        consulta = consulta.filter(or_(*condiciones))

    total = consulta.count()
    clientes = (
        consulta.order_by(func.lower(Cliente.nombre), Cliente.id)
        .offset(desplazamiento)
        .limit(limite)
        .all()
    )
    return {"total": total, "items": _salida(clientes, db)}


@router.post("/", status_code=201)
def registrar_cliente(datos: ClienteCrear, db: Session = Depends(get_db)):
    """Registra a una persona por su DNI, sin correo ni contraseña (no tiene acceso a una cuenta)."""
    if db.query(Cliente).filter(Cliente.dni == datos.dni).first() is not None:
        raise HTTPException(status_code=409, detail="Ya hay un cliente registrado con ese DNI")

    cliente = Cliente(**datos.model_dump())
    try:
        db.add(cliente)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya hay un cliente registrado con ese DNI")

    db.refresh(cliente)
    return _salida([cliente], db)[0]


@router.put("/{cliente_id}")
def editar_cliente(cliente_id: int, datos: ClienteEditar, db: Session = Depends(get_db)):
    cliente = _buscar(db, cliente_id)
    cliente.nombre = datos.nombre
    cliente.sexo = datos.sexo
    cliente.telefono = datos.telefono
    db.commit()
    db.refresh(cliente)
    return _salida([cliente], db)[0]


@router.delete("/{cliente_id}", status_code=204)
def eliminar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """Sirve para corregir un DNI mal cargado. Con préstamos no se borra: se perdería el vínculo."""
    cliente = _buscar(db, cliente_id)
    if db.query(Prestamo.id).filter(Prestamo.dni == cliente.dni).first() is not None:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar: el cliente tiene préstamos registrados",
        )
    db.delete(cliente)
    db.commit()
    return Response(status_code=204)
