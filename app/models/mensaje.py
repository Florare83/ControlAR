from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.core.db import Base


def _ahora():
    return datetime.now(timezone.utc)


class MensajeContacto(Base):
    """Mensaje enviado desde el formulario de contacto."""

    __tablename__ = "mensajes_contacto"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(60), nullable=False)
    apellido = Column(String(60), nullable=False)
    telefono = Column(String(30), nullable=True)
    email = Column(String(120), nullable=True)
    mensaje = Column(Text, nullable=False)
    leido = Column(Boolean, nullable=False, default=False, index=True)
    creado_en = Column(
        DateTime(timezone=True), nullable=False, default=_ahora, index=True
    )
