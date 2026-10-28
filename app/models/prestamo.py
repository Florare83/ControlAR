from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import relationship

from app.core.db import Base

ACTIVO = "activo"
CERRADO = "cerrado"


def _ahora():
    return datetime.now(timezone.utc)


class Prestamo(Base):
    __tablename__ = "prestamos"

    id = Column(Integer, primary_key=True, index=True)
    dni = Column(String(20), nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    # Ya no se pide ni se muestra. Se conserva la columna solo por los préstamos viejos que
    # ya la tenían cargada (en producción existe); los nuevos quedan en NULL.
    email = Column(String(255), nullable=True, index=True)
    sexo = Column(String(10), nullable=False)  # "Femenino" o "Masculino"
    telefono = Column(String(30), nullable=False)
    estado = Column(String(10), nullable=False, default=ACTIVO)  # "activo" / "cerrado"
    fecha_inicio = Column(DateTime(timezone=True), nullable=False, default=_ahora)
    fecha_cierre = Column(DateTime(timezone=True), nullable=True)

    # Juego actual del préstamo (si la persona lo cambia, se actualiza este campo).
    juego_id = Column(Integer, ForeignKey("juegos.id"), nullable=False)
    juego = relationship("Juego")

    # Copia del título del juego al momento del préstamo (así el historial no cambia si
    # después se edita el juego). La base de producción la tiene como obligatoria.
    titulo_juego = Column(String(100), nullable=True)

    # Reglas que garantiza la propia base de datos, incluso si dos operadores
    # registran a la vez: una persona solo puede tener UN préstamo activo y un
    # juego solo puede estar en UN préstamo activo. Los cerrados no cuentan.
    __table_args__ = (
        Index(
            "uq_prestamo_activo_dni", "dni", unique=True,
            postgresql_where=text("estado = 'activo'"),
            sqlite_where=text("estado = 'activo'"),
        ),
        Index(
            "uq_prestamo_activo_juego", "juego_id", unique=True,
            postgresql_where=text("estado = 'activo'"),
            sqlite_where=text("estado = 'activo'"),
        ),
    )