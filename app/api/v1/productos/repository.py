# app/api/v1/productos/repository.py
from app.core.db import categorias, productos, bump_producto_id
from app.models.categoria import Categoria
from app.models.producto import Producto
from app.api.v1.productos.schemas import ProductoCreate, ProductoUpdate


# ---------- Helpers privados ----------

def _find_categoria(categoria_id: int) -> Categoria | None:
    """Busca una categoría por id en la 'tabla' categorias. None si no existe."""
    for c in categorias:
        if c.id == categoria_id:
            return c
    return None


def _to_dict(p: Producto) -> dict:
    """
    Arma el dict de un producto con la categoría resuelta (anidada),
    listo para validar contra ProductoResponse.
    """
    categoria = _find_categoria(p.categoria_id)
    return {
        "id": p.id,
        "nombre": p.nombre,
        "precio": p.precio,
        "stock": p.stock,
        "activo": p.activo,
        "categoria": {
            "id": categoria.id,
            "nombre": categoria.nombre,
        } if categoria else None,
    }


def _find_producto(producto_id: int) -> Producto | None:
    """Busca el dataclass Producto por id. None si no existe."""
    for p in productos:
        if p.id == producto_id:
            return p
    return None


# ---------- Lecturas ----------

def list_productos() -> list[dict]:
    return [_to_dict(p) for p in productos]


def get_by_id(producto_id: int) -> dict | None:
    p = _find_producto(producto_id)
    return _to_dict(p) if p else None


def search_by_nombre(query: str) -> list[dict]:
    query_lower = query.lower()
    return [
        _to_dict(p)
        for p in productos
        if query_lower in p.nombre.lower()
    ]


# ---------- Validaciones ----------

def ensure_categoria(categoria_id: int) -> tuple[bool, str | None]:
    """
    Verifica que la categoría exista.
    Retorna (True, None) si es válida, o (False, mensaje) si no existe.
    """
    if _find_categoria(categoria_id) is None:
        return False, f"La categoria {categoria_id} no existe"
    return True, None


# ---------- Escrituras ----------

def create(data: ProductoCreate) -> dict:
    nuevo = Producto(
        id=bump_producto_id(),
        nombre=data.nombre,
        precio=data.precio,
        stock=data.stock,
        categoria_id=data.categoria_id,
        activo=True,
    )
    productos.append(nuevo)
    return _to_dict(nuevo)


def update(producto_id: int, data: ProductoUpdate) -> dict | None:
    p = _find_producto(producto_id)
    if p is None:
        return None

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(p, field, value)

    return _to_dict(p)


def delete(producto_id: int) -> bool:
    p = _find_producto(producto_id)
    if p is None:
        return False
    productos.remove(p)
    return True