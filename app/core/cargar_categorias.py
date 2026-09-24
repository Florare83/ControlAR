from app.core.db import SessionLocal
from app.models.categoria import Categoria

db = SessionLocal()
db.add_all([
    Categoria(nombre="Infantil"),
    Categoria(nombre="Familiar"),
    Categoria(nombre="Experto"),
])
db.commit()
db.close()
print("Categorías cargadas.")