from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from app.core.db import Base


def _ahora():
    return datetime.now(timezone.utc)


class Cliente(Base):
    """Persona del club registrada por un administrador a partir de su DNI.

    No es una cuenta: no tiene correo ni contraseña, así que NO puede iniciar sesión (eso es
    justamente lo que la distingue de "usuarios"). Sirve para tener a cada persona identificada
    por su DNI y consultar su historial de préstamos, que también se cruza por DNI.
    """

    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    # Una sola ficha por DNI.
    dni = Column(String(20), nullable=False, unique=True, index=True)
    nombre = Column(String(100), nullable=False)
    sexo = Column(String(10), nullable=True)  # "Femenino" o "Masculino"
    telefono = Column(String(30), nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, default=_ahora)
