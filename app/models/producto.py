from dataclasses import dataclass


@dataclass
class Producto:
    id: int
    nombre: str
    precio: float
    stock: int
    categoria_id: int
    activo: bool = True