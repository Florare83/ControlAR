from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import relationship

from app.core.db import Base

ACTIVA = "activa"
CANCELADA = "cancelada"
ENTREGADA = "entregada"
VENCIDA = "vencida"


def _ahora():
    return datetime.now(timezone.utc)


class Reserva(Base):
    """Reserva de un juego para retirarlo en un evento (el préstamo sigue siendo
    solo durante el evento y en el lugar)."""

    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False, index=True)
    juego_id = Column(Integer, ForeignKey("juegos.id"), nullable=False, index=True)

    estado = Column(String(10), nullable=False, default=ACTIVA)
    creada_en = Column(DateTime(timezone=True), nullable=False, default=_ahora)
    # Cuándo se canceló, venció o se entregó.
    cerrada_en = Column(DateTime(timezone=True), nullable=True)

    # Préstamo que se generó al entregar el juego.
    prestamo_id = Column(Integer, ForeignKey("prestamos.id"), nullable=True)

    usuario = relationship("Usuario")
    evento = relationship("Evento")
    juego = relationship("Juego")

    # Reglas que garantiza la base de datos aunque dos personas reserven a la vez:
    # una reserva por persona y por evento, y un juego en una sola reserva por evento.
    # Las canceladas y vencidas no cuentan.
    __table_args__ = (
        Index(
            "uq_reserva_persona_evento", "usuario_id", "evento_id", unique=True,
            postgresql_where=text("estado IN ('activa', 'entregada')"),
            sqlite_where=text("estado IN ('activa', 'entregada')"),
        ),
        Index(
            "uq_reserva_juego_evento", "evento_id", "juego_id", unique=True,
            postgresql_where=text("estado IN ('activa', 'entregada')"),
            sqlite_where=text("estado IN ('activa', 'entregada')"),
        ),
    )
