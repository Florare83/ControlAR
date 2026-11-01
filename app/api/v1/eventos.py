# Eventos del club. Lectura pública; crear, editar, duplicar y borrar: solo administradores.
from datetime import date, time

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from app.api.v1.auth.dependencies import require_admin
from app.api.v1.juegos.schemas import validar_url_imagen
from app.core import avisos, suscripciones
from app.core.db import get_db
from app.models.evento import Evento
from app.models.reserva import ACTIVA, Reserva
from app.models.usuario import Usuario

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


def _es_proximo(evento: Evento) -> bool:
    """Un evento sin fecha exacta o con fecha de hoy en adelante todavía no pasó."""
    return evento.fecha is None or evento.fecha >= date.today()


def _reservantes_activos(db: Session, evento_id: int) -> list[Usuario]:
    """Personas con una reserva activa para el evento."""
    return (
        db.query(Usuario)
        .join(Reserva, Reserva.usuario_id == Usuario.id)
        .filter(
            Reserva.evento_id == evento_id,
            Reserva.estado == ACTIVA,
            Usuario.activo.is_(True),
        )
        .distinct()
        .all()
    )


def _buscar(db: Session, evento_id: int) -> Evento:
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if evento is None:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return evento


@router.get("/", response_model=list[EventoRespuesta])
def listar(db: Session = Depends(get_db)):
    return db.query(Evento).order_by(Evento.fecha.desc(), Evento.id.desc()).all()


@router.post("/", response_model=EventoRespuesta, status_code=201)
def crear(
    datos: EventoCrear,
    tareas: BackgroundTasks,
    avisar: bool = False,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Crea el evento. Con ?avisar=true se manda un correo a quienes se suscribieron a las
    novedades (solo si el evento todavía no pasó: cargar uno anterior no avisa a nadie)."""
    evento = Evento(**datos.model_dump())
    db.add(evento)
    db.commit()
    db.refresh(evento)

    if avisar and _es_proximo(evento):
        avisos.avisar_novedad(db, tareas, avisos.correo_nuevo_evento, evento)

    return evento


@router.put("/{evento_id}", response_model=EventoRespuesta)
def actualizar(
    evento_id: int,
    datos: EventoActualizar,
    tareas: BackgroundTasks,
    avisar: bool = False,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Actualiza el evento. Con ?avisar=true, si cambió el nombre, la fecha, el horario o el
    lugar, se avisa a los suscriptores y a quienes tienen una reserva activa (aunque no estén
    suscriptos). Cambiar solo la descripción, el aporte, etc. no manda nada."""
    evento = _buscar(db, evento_id)
    antes = avisos.foto_evento(evento)

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

    if avisar and _es_proximo(evento):
        cambios = avisos.cambios_de_evento(antes, evento)
        if cambios:
            reservantes = _reservantes_activos(db, evento.id)
            con_reserva = {u.id for u in reservantes}
            destinatarios = {u.id: u for u in suscripciones.suscriptores(db)}
            for usuario in reservantes:
                destinatarios.setdefault(usuario.id, usuario)

            avisos.avisar_novedad(
                db,
                tareas,
                lambda usuario, ev: avisos.correo_evento_modificado(
                    usuario, ev, cambios, con_reserva=usuario.id in con_reserva
                ),
                evento,
                usuarios=list(destinatarios.values()),
            )

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
def eliminar(
    evento_id: int,
    tareas: BackgroundTasks,
    avisar: bool = False,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Elimina el evento. Con ?avisar=true se avisa a los suscriptores que se canceló (solo
    si todavía no había pasado). Un evento con reservas no se puede eliminar."""
    evento = _buscar(db, evento_id)

    if db.query(Reserva.id).filter(Reserva.evento_id == evento_id).first() is not None:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar: el evento tiene reservas registradas",
        )

    # El correo se arma antes de borrar (después el evento ya no existe) y se manda
    # solo si el borrado salió bien.
    correos = []
    if avisar and _es_proximo(evento):
        correos = [
            avisos.correo_evento_cancelado(usuario, evento)
            for usuario in suscripciones.suscriptores(db)
        ]

    db.delete(evento)
    db.commit()

    if correos:
        tareas.add_task(avisos.enviar_avisos, correos)
