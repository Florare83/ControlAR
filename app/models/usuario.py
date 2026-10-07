# app/models/usuario.py
from sqlalchemy import Column, Integer, String, Boolean
from app.core.db import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    contrasena_hash = Column(String(255), nullable=False)  # nunca la contraseña en texto plano
    es_admin = Column(Boolean, nullable=False, default=False)
    activo = Column(Boolean, nullable=False, default=True)
