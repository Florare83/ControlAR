
from sqlalchemy import Column, Integer, String, Text, DateTime, func

from app.core.db import Base


class MensajeContacto(Base):
    __tablename__ = "mensajes_contacto"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    telefono = Column(String(30), nullable=True)
    email = Column(String(255), nullable=True)
    mensaje = Column(Text, nullable=False)

    fecha_creacion = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
