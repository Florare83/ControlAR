
# Endpoints del sistema de préstamos. Solo los administradores pueden usarlos.

import logging
import re
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api.v1.auth.dependencies import require_admin
from app.api.v1.juegos import repository as juegos_repo
from app.core.db import get_db
from app.models.prestamo import ACTIVO, CERRADO, Prestamo


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/prestamos",
    tags=["Préstamos"],
    dependencies=[Depends(require_admin)],
)


class PrestamoCrear(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    dni: str = Field(pattern=r"^\d{6,9}$")
    nombre: str = Field(min_length=2, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    sexo: str
    telefono: str = Field(pattern=r"^[0-9+\s()-]{6,30}$")
    juego_id: int = Field(ge=1)

    @field_validator("sexo")
    @classmethod
    def validar_sexo(cls, valor):
        normalizado = valor.strip().lower()

        if normalizado not in {"femenino", "masculino"}:
            raise ValueError("El sexo debe ser Femenino o Masculino")

        return normalizado.capitalize()


class PrestamoCambiarJuego(BaseModel):
    juego_id: int = Field(ge=1)


class JuegoResumen(BaseModel):
    id: int
    titulo: str

    model_config = ConfigDict(from_attributes=True)


class PrestamoRespuesta(BaseModel):
    id: int
    dni: str
    nombre: str
    email: str | None = None
    sexo: str
    telefono: str
    estado: str
    fecha_inicio: datetime
    fecha_cierre: datetime | None
    juego: JuegoResumen

    model_config = ConfigDict(from_attributes=True)


def _registrar_error_integridad(operacion: str, error: IntegrityError):
    """Registra información técnica del error para diagnosticarlo en Render."""

    original = getattr(error, "orig", None)
    diagnostico = getattr(original, "diag", None)

    logger.error(
        "Error de integridad en operación '%s'. "
        "Restricción=%s; código PostgreSQL=%s; detalle=%s",
        operacion,
        getattr(diagnostico, "constraint_name", None),
        getattr(original, "pgcode", None),
        getattr(diagnostico, "message_primary", None),
    )


def _buscar(db: Session, prestamo_id: int) -> Prestamo:
    prestamo = (
        db.query(Prestamo)
        .filter(Prestamo.id == prestamo_id)
        .first()
    )

    if prestamo is None:
        raise HTTPException(
            status_code=404,
            detail="Préstamo no encontrado",
        )

    return prestamo


def _juego_libre(db: Session, juego_id: int):
    juego = juegos_repo.get_by_id(db, juego_id)

    if juego is None:
        raise HTTPException(
            status_code=400,
            detail=f"El juego {juego_id} no existe",
        )

    if not juego.se_presta:
        raise HTTPException(
            status_code=400,
            detail="Ese juego no está disponible para préstamo",
        )

    if juego.en_prestamo:
        raise HTTPException(
            status_code=409,
            detail="Ese juego ya está en préstamo",
        )

    return juego


@router.get("/buscar-persona/{dni}")
def buscar_persona_por_dni(
    dni: str,
    db: Session = Depends(get_db),
):
    """Busca los datos del cliente en préstamos anteriores."""

    if not dni.isdigit() or not 6 <= len(dni) <= 9:
        raise HTTPException(
            status_code=422,
            detail="Ingresá un DNI válido, de 6 a 9 números",
        )

    prestamo = (
        db.query(Prestamo)
        .filter(Prestamo.dni == dni)
        .order_by(Prestamo.id.desc())
        .first()
    )

    if prestamo is None:
        return {"encontrado": False}

    return {
        "encontrado": True,
        "dni": prestamo.dni,
        "nombre": prestamo.nombre,
        "email": prestamo.email,
        "sexo": prestamo.sexo,
        "telefono": prestamo.telefono,
    }


def _escapar_like(texto: str) -> str:
    """Evita que % y _ escritos en la búsqueda funcionen como comodines."""
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _fila_historial(p: Prestamo) -> dict:
    return {
        "id": p.id,
        "dni": p.dni,
        "nombre": p.nombre,
        "email": p.email or "",
        "telefono": p.telefono,
        "titulo_juego": (
            p.titulo_juego
            or (p.juego.titulo if p.juego else "Juego no disponible")
        ),
        "estado": p.estado,
        "fecha_inicio": p.fecha_inicio,
        "fecha_cierre": p.fecha_cierre,
    }


# Historial para el administrador (las rutas fijas van antes que las de "/{prestamo_id}/...").
@router.get("/historial")
def historial_prestamos(
    buscar: str = Query("", max_length=100),
    estado: Literal["activo", "cerrado"] | None = None,
    limite: int = Query(20, ge=1, le=100),
    desplazamiento: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Historial completo de préstamos, con búsqueda por nombre, DNI, email o juego."""

    consulta = db.query(Prestamo).options(joinedload(Prestamo.juego))

    termino = buscar.strip()
    if termino:
        patron = f"%{_escapar_like(termino)}%"
        condiciones = [
            Prestamo.nombre.ilike(patron, escape="\\"),
            Prestamo.email.ilike(patron, escape="\\"),
            Prestamo.titulo_juego.ilike(patron, escape="\\"),
            Prestamo.dni.ilike(patron, escape="\\"),
        ]

        # Permite buscar un DNI escrito con puntos o espacios (12.345.678).
        solo_digitos = re.sub(r"[.\s]", "", termino)
        if solo_digitos.isdigit():
            condiciones.append(Prestamo.dni.ilike(f"%{solo_digitos}%"))

        consulta = consulta.filter(or_(*condiciones))

    if estado:
        consulta = consulta.filter(Prestamo.estado == estado)

    total = consulta.count()
    prestamos = (
        consulta.order_by(Prestamo.fecha_inicio.desc(), Prestamo.id.desc())
        .offset(desplazamiento)
        .limit(limite)
        .all()
    )

    return {"items": [_fila_historial(p) for p in prestamos], "total": total}


@router.get("/historial/persona")
def historial_de_persona(
    dni: str | None = Query(None, max_length=20),
    email: str | None = Query(None, max_length=255),
    db: Session = Depends(get_db),
):
    """Todos los préstamos de una persona, buscada por DNI o, si no hay DNI, por email.

    Por email se usa el mismo criterio que la pantalla "Mis préstamos" del cliente,
    así el administrador ve lo mismo que ve el cliente.
    """

    dni = (dni or "").strip()
    email = (email or "").strip().lower()

    if not dni and not email:
        raise HTTPException(
            status_code=422,
            detail="Indicá un DNI o un email para ver el historial",
        )

    consulta = db.query(Prestamo).options(joinedload(Prestamo.juego))

    if dni:
        consulta = consulta.filter(Prestamo.dni == dni)
    else:
        consulta = consulta.filter(func.lower(func.trim(Prestamo.email)) == email)

    # Tope de seguridad: una sola persona no debería acercarse a esta cantidad.
    prestamos = (
        consulta.order_by(Prestamo.fecha_inicio.desc(), Prestamo.id.desc())
        .limit(500)
        .all()
    )

    activos = sum(1 for p in prestamos if p.estado == ACTIVO)

    # Los datos de contacto se toman del préstamo más reciente.
    persona = None
    if prestamos:
        ultimo = prestamos[0]
        persona = {
            "dni": ultimo.dni,
            "nombre": ultimo.nombre,
            "email": ultimo.email or "",
            "telefono": ultimo.telefono,
        }

    return {
        "persona": persona,
        "resumen": {
            "total": len(prestamos),
            "activos": activos,
            "devueltos": len(prestamos) - activos,
        },
        "items": [_fila_historial(p) for p in prestamos],
    }


@router.get("/", response_model=list[PrestamoRespuesta])
def listar_prestamos(
    estado: Literal["activo", "cerrado"] | None = None,
    db: Session = Depends(get_db),
):
    # Las filas del diseño anterior que no se pudieron vincular a un juego se omiten,
    # porque la respuesta exige un juego y fallaría con un error 500.
    consulta = db.query(Prestamo).filter(Prestamo.juego_id.is_not(None))

    if estado:
        consulta = consulta.filter(Prestamo.estado == estado)

    return consulta.order_by(Prestamo.id.desc()).all()


@router.post("/", response_model=PrestamoRespuesta, status_code=201)
def registrar_prestamo(
    datos: PrestamoCrear,
    db: Session = Depends(get_db),
):
    activo = (
        db.query(Prestamo)
        .filter(
            Prestamo.dni == datos.dni,
            Prestamo.estado == ACTIVO,
        )
        .first()
    )

    if activo is not None:
        raise HTTPException(
            status_code=409,
            detail="Esa persona ya tiene un préstamo activo",
        )

    # Validar el juego y recuperar su título.
    juego = _juego_libre(db, datos.juego_id)

    datos_limpios = datos.model_dump()

    if datos_limpios.get("email"):
        datos_limpios["email"] = datos_limpios["email"].strip().lower()
    else:
        datos_limpios["email"] = None

    # titulo_juego es obligatorio en la base de datos.
    prestamo = Prestamo(
        **datos_limpios,
        titulo_juego=juego.titulo,
        estado=ACTIVO,
    )

    try:
        db.add(prestamo)
        db.commit()

    except IntegrityError as e:
        db.rollback()
        _registrar_error_integridad("registrar préstamo", e)

        raise HTTPException(
            status_code=409,
            detail=(
                "No se pudo guardar el préstamo por un conflicto "
                "con los datos o las restricciones de la base de datos. "
                "Revisá los logs del backend."
            ),
        ) from e

    db.refresh(prestamo)
    return prestamo


@router.put("/{prestamo_id}/juego", response_model=PrestamoRespuesta)
def cambiar_juego(
    prestamo_id: int,
    datos: PrestamoCambiarJuego,
    db: Session = Depends(get_db),
):
    prestamo = _buscar(db, prestamo_id)

    if prestamo.estado != ACTIVO:
        raise HTTPException(
            status_code=409,
            detail="El préstamo ya está cerrado",
        )

    if datos.juego_id == prestamo.juego_id:
        raise HTTPException(
            status_code=400,
            detail="El préstamo ya tiene ese juego",
        )

    # Recuperar también el título del nuevo juego.
    juego = _juego_libre(db, datos.juego_id)

    try:
        prestamo.juego_id = datos.juego_id
        prestamo.titulo_juego = juego.titulo
        db.commit()

    except IntegrityError as e:
        db.rollback()
        _registrar_error_integridad("cambiar juego del préstamo", e)

        raise HTTPException(
            status_code=409,
            detail=(
                "No se pudo cambiar el juego por un conflicto "
                "con los datos o las restricciones de la base de datos. "
                "Revisá los logs del backend."
            ),
        ) from e

    db.refresh(prestamo)
    return prestamo


@router.post("/{prestamo_id}/devolver", response_model=PrestamoRespuesta)
def devolver_prestamo(
    prestamo_id: int,
    db: Session = Depends(get_db),
):
    prestamo = _buscar(db, prestamo_id)

    if prestamo.estado != ACTIVO:
        raise HTTPException(
            status_code=409,
            detail="El préstamo ya estaba cerrado",
        )

    try:
        prestamo.estado = CERRADO
        prestamo.fecha_cierre = datetime.now(timezone.utc)

        db.commit()

    except IntegrityError as e:
        db.rollback()
        _registrar_error_integridad("devolver préstamo", e)

        raise HTTPException(
            status_code=409,
            detail="No se pudo registrar la devolución.",
        ) from e

    db.refresh(prestamo)
    return prestamo