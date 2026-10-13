
from sqlalchemy import Column, Integer, String, Boolean
from app.core.db import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    contrasena_hash = Column(String(255), nullable=False)

    # Si es True, el usuario es administrador.
    # Si es False, el usuario es cliente.
    es_admin = Column(Boolean, nullable=False, default=False)

    activo = Column(Boolean, nullable=False, default=True)

    @property
    def rol(self) -> str:
        """Devuelve únicamente uno de los dos roles: admin o cliente."""
        return "admin" if self.es_admin else "cliente"
