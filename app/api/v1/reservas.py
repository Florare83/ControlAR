# Reservas de juegos para retirar en un evento.
#
# Reglas:
#  - Solo se reserva para el próximo evento que permita reservas.
#  - Se puede reservar hasta las 20:00 del día anterior al evento.
#  - Una reserva por persona y por evento; un juego en una sola reserva por evento.
#  - La reserva se guarda hasta 30 minutos después del inicio; pasado ese tiempo vence
#    y el juego queda libre.
#  - Se puede cancelar mientras esté activa.
#  - El préstamo sigue siendo solo durante el evento: el administrador entrega el juego
#    en el lugar y ahí se crea el préstamo.
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api.v1.auth.dependencies import get_current_user, require_admin
from app.api.v1.juegos import repository as juegos_repo
from app.core.db import get_db
from app.core.reservas_reglas import ahora, cierre_reservas, inicio_evento, limite_espera
from app.models.evento import Evento
from app.models.prestamo import ACTIVO as PRESTAMO_ACTIVO
from app.models.prestamo import Prestamo
from app.models.reserva import (
    ACTIVA,
    CANCELADA,
    ENTREGADA,
    VENCIDA,
    Reserva,
)
from app.models.usuario import Usuario

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reservas", tags=["Reservas"])

OCUPAN = (ACTIVA, ENTREGADA)


class ReservaCrear(BaseModel):
    juego_id: int = Field(ge=1)


class EntregarReserva(BaseModel):
    """Datos que el administrador toma en el lugar (la cuenta no tiene DNI ni teléfono)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    dni: str = Field(pattern=r"^\d{6,9}$")
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    sexo: str
    telefono: str = Field(pattern=r"^[0-9+\s()-]{6,30}$")

    @field_validator("sexo")
    @classmethod
    def validar_sexo(cls, valor):
        normalizado = valor.strip().lower()
        if normalizado not in {"femenino", "masculino"}:
            raise ValueError("El sexo debe ser Femenino o Masculino")
        return normalizado.capitalize()


# ---------------------------------------------------------------- utilidades

def vencer_reservas(db: Session) -> None:
    """Pasa a "vencida" toda reserva activa cuya espera ya terminó (así el juego se libera)."""
    momento = ahora()
    activas = (
        db.query(Reserva)
        .options(joinedload(Reserva.evento))
        .filter(Reserva.estado == ACTIVA)
        .all()
    )
    hubo_cambios = False
    for reserva in activas:
        limite = limite_espera(reserva.evento)
        if limite is not None and limite < momento:
            reserva.estado = VENCIDA
            reserva.cerrada_en = momento
            hubo_cambios = True
    if hubo_cambios:
        db.commit()


def evento_actual(db: Session) -> Evento | None:
    """Próximo evento con reservas cuya espera todavía no terminó."""
    momento = ahora()
    candidatos = []
    eventos = (
        db.query(Evento)
        .filter(
            Evento.permite_reservas.is_(True),
            Evento.fecha.is_not(None),
            Evento.hora_inicio.is_not(None),
        )
        .all()
    )
    for evento in eventos:
        limite = limite_espera(evento)
        if limite is not None and limite >= momento:
            candidatos.append(evento)
    return min(candidatos, key=inicio_evento, default=None)


def _evento_dict(evento: Evento | None):
    if evento is None:
        return None
    return {
        "id": evento.id,
        "titulo": evento.titulo,
        "tipo": evento.tipo,
        "fecha": evento.fecha,
        "hora_inicio": evento.hora_inicio,
        "hora_texto": evento.hora_texto,
        "lugar": evento.lugar,
        "direccion": evento.direccion,
    }


def _reserva_dict(reserva: Reserva, con_usuario: bool = False):
    datos = {
        "id": reserva.id,
        "estado": reserva.estado,
        "creada_en": reserva.creada_en,
        "cerrada_en": reserva.cerrada_en,
        "prestamo_id": reserva.prestamo_id,
        "espera_hasta": limite_espera(reserva.evento),
        "juego": {"id": reserva.juego_id, "titulo": reserva.juego.titulo},
        "evento": _evento_dict(reserva.evento),
    }
    if con_usuario:
        datos["usuario"] = {
            "id": reserva.usuario_id,
            "nombre": reserva.usuario.nombre,
            "email": reserva.usuario.email,
        }
    return datos


def _buscar(db: Session, reserva_id: int) -> Reserva:
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reserva


def _formato_cierre(evento: Evento) -> str:
    cierre = cierre_reservas(evento)
    return cierre.strftime("%d/%m a las %H:%M")


# ------------------------------------------------------------------ público

@router.get("/estado")
def estado_reservas(db: Session = Depends(get_db)):
    """Para el catálogo: evento reservable, si siguen abiertas y qué juegos ya están reservados."""
    vencer_reservas(db)
    evento = evento_actual(db)

    if evento is None:
        return {
            "evento": None,
            "reservas_abiertas": False,
            "cierre_reservas": None,
            "espera_hasta": None,
            "juegos_reservados": [],
        }

    reservados = (
        db.query(Reserva.juego_id)
        .filter(Reserva.evento_id == evento.id, Reserva.estado.in_(OCUPAN))
        .all()
    )

    cierre = cierre_reservas(evento)
    return {
        "evento": _evento_dict(evento),
        "reservas_abiertas": ahora() < cierre,
        "cierre_reservas": cierre,
        "espera_hasta": limite_espera(evento),
        "juegos_reservados": [fila[0] for fila in reservados],
    }


# ------------------------------------------------------------------ cliente

@router.get("/mias")
def mis_reservas(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vencer_reservas(db)
    reservas = (
        db.query(Reserva)
        .filter(Reserva.usuario_id == usuario.id)
        .order_by(Reserva.id.desc())
        .all()
    )
    return [_reserva_dict(r) for r in reservas]


@router.post("/", status_code=201)
def reservar(
    datos: ReservaCrear,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vencer_reservas(db)

    evento = evento_actual(db)
    if evento is None:
        raise HTTPException(
            status_code=409,
            detail="Por ahora no hay un evento próximo con reservas.",
        )

    if ahora() >= cierre_reservas(evento):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Las reservas para «{evento.titulo}» cerraron "
                f"el {_formato_cierre(evento)}. Podés pedir el juego en el evento."
            ),
        )

    juego = juegos_repo.get_by_id(db, datos.juego_id)
    if juego is None:
        raise HTTPException(status_code=400, detail=f"El juego {datos.juego_id} no existe")
    if not juego.se_presta:
        raise HTTPException(status_code=400, detail="Ese juego no está disponible para préstamo")

    ya_tiene = (
        db.query(Reserva)
        .filter(
            Reserva.usuario_id == usuario.id,
            Reserva.evento_id == evento.id,
            Reserva.estado.in_(OCUPAN),
        )
        .first()
    )
    if ya_tiene is not None:
        raise HTTPException(
            status_code=409,
            detail="Ya tenés una reserva para este evento. Cancelala si querés elegir otro juego.",
        )

    juego_tomado = (
        db.query(Reserva)
        .filter(
            Reserva.evento_id == evento.id,
            Reserva.juego_id == juego.id,
            Reserva.estado.in_(OCUPAN),
        )
        .first()
    )
    if juego_tomado is not None:
        raise HTTPException(status_code=409, detail="Ese juego ya fue reservado por otra persona.")

    reserva = Reserva(
        usuario_id=usuario.id,
        evento_id=evento.id,
        juego_id=juego.id,
        estado=ACTIVA,
    )

    try:
        db.add(reserva)
        db.commit()
    except IntegrityError as e:
        db.rollback()
        logger.error("Error de integridad al reservar: %s", getattr(e, "orig", e))
        raise HTTPException(
            status_code=409,
            detail="No se pudo guardar la reserva: alguien reservó ese juego o ya tenés una reserva.",
        ) from e

    db.refresh(reserva)
    return _reserva_dict(reserva)


@router.delete("/{reserva_id}")
def cancelar(
    reserva_id: int,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vencer_reservas(db)
    reserva = _buscar(db, reserva_id)

    # Se responde 404 también si es de otra persona, para no revelar que existe.
    if reserva.usuario_id != usuario.id:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if reserva.estado != ACTIVA:
        raise HTTPException(
            status_code=409,
            detail=f"La reserva ya no se puede cancelar (está {reserva.estado}).",
        )

    reserva.estado = CANCELADA
    reserva.cerrada_en = ahora()
    db.commit()
    db.refresh(reserva)
    return _reserva_dict(reserva)


# ------------------------------------------------------------ administración

@router.get("/")
def listar_reservas(
    evento_id: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Reservas de un evento (por defecto, el próximo con reservas) para la lista del panel."""
    vencer_reservas(db)

    if evento_id is not None:
        evento = db.query(Evento).filter(Evento.id == evento_id).first()
        if evento is None:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
    else:
        evento = evento_actual(db)

    if evento is None:
        return {"evento": None, "reservas": []}

    reservas = (
        db.query(Reserva)
        .filter(Reserva.evento_id == evento.id)
        .order_by(Reserva.id)
        .all()
    )
    return {
        "evento": _evento_dict(evento),
        "espera_hasta": limite_espera(evento),
        "reservas": [_reserva_dict(r, con_usuario=True) for r in reservas],
    }


@router.post("/{reserva_id}/entregar")
def entregar(
    reserva_id: int,
    datos: EntregarReserva,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Entrega el juego reservado: crea el préstamo y cierra la reserva en una sola operación."""
    vencer_reservas(db)
    reserva = _buscar(db, reserva_id)

    if reserva.estado != ACTIVA:
        raise HTTPException(
            status_code=409,
            detail=f"La reserva no se puede entregar (está {reserva.estado}).",
        )

    persona_con_prestamo = (
        db.query(Prestamo)
        .filter(Prestamo.dni == datos.dni, Prestamo.estado == PRESTAMO_ACTIVO)
        .first()
    )
    if persona_con_prestamo is not None:
        raise HTTPException(status_code=409, detail="Esa persona ya tiene un préstamo activo")

    juego = juegos_repo.get_by_id(db, reserva.juego_id)
    if juego is None:
        raise HTTPException(status_code=400, detail="El juego de la reserva ya no existe")
    if juego.en_prestamo:
        raise HTTPException(status_code=409, detail="Ese juego ya está en préstamo")

    email = (reserva.usuario.email or "").strip().lower() or None

    prestamo = Prestamo(
        dni=datos.dni,
        nombre=datos.nombre or reserva.usuario.nombre,
        email=email,
        sexo=datos.sexo,
        telefono=datos.telefono,
        juego_id=juego.id,
        titulo_juego=juego.titulo,
        estado=PRESTAMO_ACTIVO,
    )

    try:
        db.add(prestamo)
        db.flush()  # obtiene el id del préstamo sin cerrar todavía la transacción

        reserva.estado = ENTREGADA
        reserva.cerrada_en = ahora()
        reserva.prestamo_id = prestamo.id

        db.commit()
    except IntegrityError as e:
        db.rollback()
        logger.error("Error de integridad al entregar reserva %s: %s", reserva_id, getattr(e, "orig", e))
        raise HTTPException(
            status_code=409,
            detail="No se pudo registrar la entrega por un conflicto con los datos. Revisá los logs del backend.",
        ) from e

    db.refresh(reserva)
    return _reserva_dict(reserva, con_usuario=True)
