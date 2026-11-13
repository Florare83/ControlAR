
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
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

    # True si el juego forma parte de la ludoteca y se puede prestar (y reservar)
    # en los eventos. Es distinto de "en_prestamo", que significa "prestado ahora".
    se_presta = Column(Boolean, nullable=False, default=False)

    # URL opcional de la imagen personalizada del juego.
    imagen_url = Column(String(1000), nullable=True)

    # Nota interna de los administradores (ej. "Faltan piezas"): explica por qué un juego
    # no está disponible para préstamo. No se muestra a clientes ni visitantes.
    observaciones = Column(String(300), nullable=True)

    # Cuándo se cargó el juego (para las «novedades» de la portada). Los juegos cargados antes
    # de existir esta columna quedan sin fecha (NULL) y se ordenan por id, que sigue su orden de
    # carga: por eso NO se rellenan con "ahora" al migrar (ver asegurar_esquema).
    creado_en = Column(
        DateTime(timezone=True),
        nullable=True,
        default=lambda: datetime.now(timezone.utc),
        info={"sin_relleno": True},
    )

    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=False)
    categoria = relationship("Categoria")
    