
from sqlalchemy import Boolean, Column, Index, Integer, String, text
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

    # DNI de la persona. Lo carga ella misma; sirve para mostrarle sus préstamos
    # ("Mis préstamos"), pero SOLO cuando un administrador lo verificó mirando el DNI físico.
    dni = Column(String(20), nullable=True, index=True)
    dni_verificado = Column(Boolean, nullable=False, default=False)

    # Un mismo DNI solo puede estar verificado en UNA cuenta. Las cuentas sin verificar
    # no cuentan: así nadie puede "ocupar" el DNI de otra persona.
    __table_args__ = (
        Index(
            "uq_usuario_dni_verificado", "dni", unique=True,
            postgresql_where=text("dni_verificado = true"),
            sqlite_where=text("dni_verificado = 1"),
        ),
    )

    @property
    def rol(self) -> str:
        """Devuelve únicamente uno de los dos roles: admin o cliente."""
        return "admin" if self.es_admin else "cliente"
