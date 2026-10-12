from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.core.db import Base


class Prestamo(Base):
    __tablename__ = "prestamos"

    id = Column(Integer, primary_key=True, index=True)
    titulo_juego = Column(String(100), nullable=False)
    dni = Column(String(20), nullable=False, index=True)
    telefono = Column(String(30), nullable=False)
    genero = Column(String(10), nullable=False)  # Femenino o Masculino
    devuelto = Column(Boolean, nullable=False, default=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
