
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


# Todas las rutas de este archivo requieren permisos de administrador.
# Sin token: 401. Cliente común: 403. Administrador: acceso permitido.
router = APIRouter(
    prefix="/prestamos",
    tags=["Préstamos"],
    dependencies=[Depends(require_admin)],
)


# ---------- Schemas ----------

class PrestamoCrear(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    dni: str = Field(pattern=r"^\d{6,9}$")  # Solo números, sin puntos
    nombre: str = Field(min_length=2, max_length=100)
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
    sexo: str
    telefono: str
    estado: str  # "activo" / "cerrado"
    fecha_inicio: datetime
    fecha_cierre: datetime | None
    juego: JuegoResumen  # El juego actual del préstamo

    model_config = ConfigDict(from_attributes=True)


# ---------- Ayudas ----------

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
    """Devuelve el juego si existe y no está en préstamo."""
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


# ---------- Endpoints ----------

@router.get("/", response_model=list[PrestamoRespuesta])
def listar_prestamos(
    estado: Literal["activo", "cerrado"] | None = None,
    db: Session = Depends(get_db),
):
    consulta = db.query(Prestamo)

    if estado:
        consulta = consulta.filter(Prestamo.estado == estado)

    return consulta.order_by(Prestamo.id.desc()).all()


# 1. Registrar un préstamo nuevo

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

    prestamo = Prestamo(
        **datos.model_dump(),
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


# 2. Cambiar el juego de un préstamo activo

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


# 3. Devolver un juego: cierra el préstamo y libera el juego

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
