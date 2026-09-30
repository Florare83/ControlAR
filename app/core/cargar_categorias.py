from app.core.db import SessionLocal
from app.models.categoria import Categoria

db = SessionLocal()

categorias = [
    "Infantil",
    "Familiar",
    "Experto",
]

for nombre in categorias:
    existe = db.query(Categoria).filter(Categoria.nombre == nombre).first()

    if not existe:
        db.add(Categoria(nombre=nombre))

db.commit()
db.close()

print("Categorías cargadas correctamente.")