
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base


class Juego(Base):
    __tablename__ = "juegos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(100), nullable=False)
    editorial = Column(String(100), nullable=True)
    cantidad_jugadores = Column(String(20), nullable=False)  # ej: "2-4"
    duracion_minutos = Column(Integer, nullable=False)
    edad_minima = Column(Integer, nullable=False)
    en_venta = Column(Boolean, default=False)
    stock = Column(Integer, nullable=False, default=0)
    precio = Column(Float, nullable=False)

    # URL opcional de la imagen personalizada del juego.
    imagen_url = Column(String(1000), nullable=True)

    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=False)
    categoria = relationship("Categoria")
    