# app/core/db.py
from app.models.categoria import Categoria
from app.models.producto import Producto

# ---------- "Tablas" en memoria ----------

categorias: list[Categoria] = [
    Categoria(id=1, nombre="INFANTIL"),
    Categoria(id=2, nombre="FAMILIAR"),
    Categoria(id=3, nombre="EXPERTO"),
]

productos: list[Producto] = [
    Producto(id=1, nombre="EL LAVARROPAS", precio=32600.0, stock=10, categoria_id=1),
    Producto(id=2, nombre="EL TIBURON", precio=42000.0, stock=30, categoria_id=1),
    Producto(id=3, nombre="VIRUS", precio=31100.0, stock=15, categoria_id=2),
    Producto(id=4, nombre="ACTUA RAPIDO", precio=20700.0, stock=8, categoria_id=2),
    Producto(id=5, nombre="FARAWAY", precio=55000.0, stock=20, categoria_id=3),
    Producto(id=6, nombre="IERUSALEM: ANNO DOMINI", precio=100000.0, stock=50, categoria_id=3),
]

# ---------- Simulación de SERIAL ----------

_ultimo_id_producto: int = max((p.id for p in productos), default=0)


def bump_producto_id() -> int:
    """
    Devuelve el próximo id disponible para un Producto y lo incrementa,
    simulando el comportamiento de un SERIAL/AUTOINCREMENT de una BD real.
    """
    global _ultimo_id_producto
    _ultimo_id_producto += 1
    return _ultimo_id_producto