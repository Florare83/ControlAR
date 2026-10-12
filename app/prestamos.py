from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict, field_validator
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.api.v1.auth.dependencies import require_admin
from app.models.prestamo import Prestamo

router = APIRouter(prefix="/prestamos", tags=["Préstamos"], dependencies=[Depends(require_admin)])


class PrestamoCrear(BaseModel):
    titulo_juego: str = Field(min_length=1, max_length=100)
    dni: str = Field(min_length=5, max_length=20)
    telefono: str = Field(min_length=6, max_length=30)
    genero: str
    devuelto: bool = False

    @field_validator("genero")
    @classmethod
    def validar_genero(cls, valor):
        normalizado = valor.strip().lower()
        if normalizado not in {"femenino", "masculino"}:
            raise ValueError("El género debe ser Femenino o Masculino")
        return normalizado.capitalize()

    model_config = ConfigDict(str_strip_whitespace=True)


class PrestamoActualizar(BaseModel):
    devuelto: bool


class PrestamoRespuesta(BaseModel):
    id: int
    titulo_juego: str
    dni: str
    telefono: str
    genero: str
    devuelto: bool

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=list[PrestamoRespuesta])
def listar_prestamos(db: Session = Depends(get_db)):
    return db.query(Prestamo).order_by(Prestamo.id.desc()).all()


@router.post("/", response_model=PrestamoRespuesta, status_code=201)
def crear_prestamo(datos: PrestamoCrear, db: Session = Depends(get_db)):
    prestamo = Prestamo(
        titulo_juego=datos.titulo_juego.strip(), dni=datos.dni.strip(),
        telefono=datos.telefono.strip(), genero=datos.genero,
        devuelto=datos.devuelto,
    )
    db.add(prestamo)
    db.commit()
    db.refresh(prestamo)
    return prestamo


@router.patch("/{prestamo_id}", response_model=PrestamoRespuesta)
def actualizar_devolucion(prestamo_id: int, datos: PrestamoActualizar, db: Session = Depends(get_db)):
    prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if prestamo is None:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    prestamo.devuelto = datos.devuelto
    db.commit()
    db.refresh(prestamo)
    return prestamo
