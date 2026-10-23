# Eventos del club. Lectura pública; crear, editar, duplicar y borrar: solo administradores.
from datetime import date, time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from app.api.v1.auth.dependencies import require_admin
from app.api.v1.juegos.schemas import validar_url_imagen
from app.core.db import get_db
from app.models.evento import Evento
from app.models.reserva import Reserva

router = APIRouter(prefix="/eventos", tags=["Eventos"])


class EventoBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    tipo: str = Field(default="Tarde de juegos", min_length=2, max_length=30)
    titulo: str = Field(min_length=2, max_length=120)
    descripcion: str | None = Field(default=None, max_length=500)
    fecha: date | None = None
    fecha_texto: str | None = Field(default=None, max_length=60)
    mes_corto: str | None = Field(default=None, max_length=3)
    hora_inicio: time | None = None
    hora_texto: str = Field(default="", max_length=40)
    lugar: str = Field(min_length=2, max_length=120)
    direccion: str = Field(min_length=2, max_length=160)
    inscripcion: bool = False
    aporte: str | None = Field(default=None, max_length=200)
    imagen_url: str | None = Field(default=None, max_length=1000)
    permite_reservas: bool = False

    _validar_imagen = field_validator("imagen_url")(validar_url_imagen)

    @field_validator("descripcion", "fecha_texto", "mes_corto", "aporte")
    @classmethod
    def vacio_es_nulo(cls, valor):
        return valor or None

    @model_validator(mode="after")
    def validar_reservas(self):
        if self.permite_reservas and (self.fecha is None or self.hora_inicio is None):
            raise ValueError(
                "Para permitir reservas el evento necesita fecha exacta y hora de inicio"
            )
        return self


class EventoCrear(EventoBase):
    pass


class EventoActualizar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    tipo: str | None = Field(default=None, min_length=2, max_length=30)
    titulo: str | None = Field(default=None, min_length=2, max_length=120)
    descripcion: str | None = Field(default=None, max_length=500)
    fecha: date | None = None
    fecha_texto: str | None = Field(default=None, max_length=60)
    mes_corto: str | None = Field(default=None, max_length=3)
    hora_inicio: time | None = None
    hora_texto: str | None = Field(default=None, max_length=40)
    lugar: str | None = Field(default=None, min_length=2, max_length=120)
    direccion: str | None = Field(default=None, min_length=2, max_length=160)
    inscripcion: bool | None = None
    aporte: str | None = Field(default=None, max_length=200)
    imagen_url: str | None = Field(default=None, max_length=1000)
    permite_reservas: bool | None = None

    _validar_imagen = field_validator("imagen_url")(validar_url_imagen)


class EventoDuplicar(BaseModel):
    fecha: date
    hora_inicio: time | None = None


class EventoRespuesta(BaseModel):
    id: int
    tipo: str
    titulo: str
    descripcion: str | None
    fecha: date | None
    fecha_texto: str | None
    mes_corto: str | None
    hora_inicio: time | None
    hora_texto: str
    lugar: str
    direccion: str
    inscripcion: bool
    aporte: str | None
    imagen_url: str | None
    permite_reservas: bool

    model_config = ConfigDict(from_attributes=True)


def _buscar(db: Session, evento_id: int) -> Evento:
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if evento is None:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return evento


@router.get("/", response_model=list[EventoRespuesta])
def listar(db: Session = Depends(get_db)):
    return db.query(Evento).order_by(Evento.fecha.desc(), Evento.id.desc()).all()


@router.post("/", response_model=EventoRespuesta, status_code=201)
def crear(datos: EventoCrear, db: Session = Depends(get_db), _=Depends(require_admin)):
    evento = Evento(**datos.model_dump())
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento


@router.put("/{evento_id}", response_model=EventoRespuesta)
def actualizar(
    evento_id: int,
    datos: EventoActualizar,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    evento = _buscar(db, evento_id)

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(evento, campo, valor)

    if evento.permite_reservas and (evento.fecha is None or evento.hora_inicio is None):
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail="Para permitir reservas el evento necesita fecha exacta y hora de inicio",
        )

    db.commit()
    db.refresh(evento)
    return evento


@router.post("/{evento_id}/duplicar", response_model=EventoRespuesta, status_code=201)
def duplicar(
    evento_id: int,
    datos: EventoDuplicar,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Copia un evento con otra fecha (sin las reservas)."""
    original = _buscar(db, evento_id)

    copia = Evento(
        tipo=original.tipo,
        titulo=original.titulo,
        descripcion=original.descripcion,
        fecha=datos.fecha,
        fecha_texto=None,
        mes_corto=None,
        hora_inicio=datos.hora_inicio or original.hora_inicio,
        hora_texto=original.hora_texto,
        lugar=original.lugar,
        direccion=original.direccion,
        inscripcion=original.inscripcion,
        aporte=original.aporte,
        imagen_url=original.imagen_url,
        permite_reservas=original.permite_reservas and (datos.hora_inicio or original.hora_inicio) is not None,
    )
    db.add(copia)
    db.commit()
    db.refresh(copia)
    return copia


@router.delete("/{evento_id}", status_code=204)
def eliminar(evento_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    evento = _buscar(db, evento_id)

    if db.query(Reserva.id).filter(Reserva.evento_id == evento_id).first() is not None:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar: el evento tiene reservas registradas",
        )

    db.delete(evento)
    db.commit()
