from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.db import Base


def _ahora():
    return datetime.now(timezone.utc)


class MensajeContacto(Base):
    """Mensaje enviado al equipo (formulario de contacto o "Mis mensajes").

    Si lo escribió un cliente con sesión iniciada queda vinculado a su cuenta
    (usuario_id): así el equipo le responde dentro de la app y se arma una
    conversación. Los visitantes sin cuenta se responden por correo.
    """

    __tablename__ = "mensajes_contacto"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(60), nullable=False)
    apellido = Column(String(60), nullable=False)
    telefono = Column(String(30), nullable=True)
    email = Column(String(120), nullable=True)
    mensaje = Column(Text, nullable=False)

    # "Leído" desde el punto de vista del equipo (administración).
    leido = Column(Boolean, nullable=False, default=False, index=True)
    creado_en = Column(
        DateTime(timezone=True), nullable=False, default=_ahora, index=True
    )
    respondido_en = Column(DateTime(timezone=True), nullable=True)

    # Cuenta del cliente que lo escribió (None = visitante sin cuenta).
    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # El cliente ya vio la última respuesta del equipo (False = tiene una nueva).
    leido_cliente = Column(Boolean, nullable=False, default=True)
    # Última actividad de la conversación (mensaje o respuesta).
    actualizado_en = Column(DateTime(timezone=True), nullable=True)

    respuestas = relationship(
        "RespuestaMensaje",
        back_populates="mensaje_contacto",
        order_by="RespuestaMensaje.creado_en, RespuestaMensaje.id",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )


class RespuestaMensaje(Base):
    """Cada mensaje de una conversación después del primero."""

    __tablename__ = "respuestas_mensaje"

    id = Column(Integer, primary_key=True, index=True)
    mensaje_id = Column(
        Integer,
        ForeignKey("mensajes_contacto.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # "admin" (el equipo) o "cliente"
    autor = Column(String(10), nullable=False)
    texto = Column(Text, nullable=False)
    creado_en = Column(DateTime(timezone=True), nullable=False, default=_ahora)

    mensaje_contacto = relationship("MensajeContacto", back_populates="respuestas")
