# app/core/crear_tablas.py
from app.core.db import Base, engine
from app.models.categoria import Categoria
from app.models.juego import Juego  # antes decía "recurso"

Base.metadata.create_all(bind=engine)
print("Tablas creadas correctamente.")