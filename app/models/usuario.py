from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.sql import expression
from app.core.db import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    contrasena_hash = Column(String(255), nullable=False)  # nunca la contraseña en texto plano
    es_admin = Column(Boolean, nullable=False, default=False)
    # Operador = voluntario que registra préstamos. El server_default permite agregar
    # la columna a una tabla que ya tiene usuarios (ver app/core/migrar_entrega5.py).
    es_operador = Column(
        Boolean, nullable=False, default=False, server_default=expression.false()
    )
    activo = Column(Boolean, nullable=False, default=True)

    @property
    def rol(self) -> str:
        """Rol efectivo: "admin", "operador" o "cliente". El admin tiene prioridad."""
        if self.es_admin:
            return "admin"
        if self.es_operador:
            return "operador"
        return "cliente"