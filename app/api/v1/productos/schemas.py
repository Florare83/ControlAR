# app/api/v1/productos/schemas.py
from pydantic import BaseModel, Field


class ProductoBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    precio: float = Field(ge=0)


class ProductoCreate(ProductoBase):
    stock: int = Field(ge=0)
    categoria_id: int = Field(ge=1)


class ProductoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    precio: float | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    categoria_id: int | None = Field(default=None, ge=1)
    activo: bool | None = None


class CategoriaOut(BaseModel):
    id: int
    nombre: str


class ProductoResponse(ProductoBase):
    id: int
    stock: int
    activo: bool
    categoria: CategoriaOut