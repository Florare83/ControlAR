
# Endpoints del sistema de préstamos. Solo los administradores pueden usarlos.

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.auth.dependencies import require_admin
from app.api.v1.juegos import repository as juegos_repo
from app.core.db import get_db
from app.models.prestamo import ACTIVO, CERRADO, Prestamo

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


CONFLICTO_SIMULTANEO = (
    "No se pudo guardar: otro administrador registró un préstamo "
    "al mismo tiempo. Actualizá la lista e intentá de nuevo."
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


@router.get("/", response_model=list[PrestamoRespuesta])
def listar_prestamos(
    estado: Literal["activo", "cerrado"] | None = None,
    db: Session = Depends(get_db),
):
    consulta = db.query(Prestamo)

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

    _juego_libre(db, datos.juego_id)

    datos_limpios = datos.model_dump()

    if datos_limpios.get("email"):
        datos_limpios["email"] = datos_limpios["email"].strip().lower()
    else:
        datos_limpios["email"] = None

    prestamo = Prestamo(
        **datos_limpios,
        estado=ACTIVO,
    )

    try:
        db.add(prestamo)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=CONFLICTO_SIMULTANEO,
        )

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

    _juego_libre(db, datos.juego_id)

    try:
        prestamo.juego_id = datos.juego_id
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=CONFLICTO_SIMULTANEO,
        )

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

    prestamo.estado = CERRADO
    prestamo.fecha_cierre = datetime.now(timezone.utc)

    db.commit()
    db.refresh(prestamo)

    return prestamo
