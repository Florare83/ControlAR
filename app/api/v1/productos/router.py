# app/api/v1/productos/router.py
from fastapi import APIRouter, HTTPException, status

from app.api.v1.productos import repository
from app.api.v1.productos.schemas import (
    ProductoCreate,
    ProductoUpdate,
    ProductoResponse,
)

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get("", response_model=list[ProductoResponse])
def get_productos(query: str | None = None, categoria_id: int | None = None):
    if query:
        resultados = repository.search_by_nombre(query)
    else:
        resultados = repository.list_productos()

    if categoria_id is not None:
        resultados = [
            p for p in resultados
            if p["categoria"] is not None and p["categoria"]["id"] == categoria_id
        ]

    return resultados


@router.get("/{id}", response_model=ProductoResponse)
def get_producto(id: int):
    producto = repository.get_by_id(id)
    if producto is None:
        raise HTTPException(status_code=404, detail=f"El producto {id} no existe")
    return producto


@router.post("", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def create_producto(data: ProductoCreate):
    ok, error = repository.ensure_categoria(data.categoria_id)
    if not ok:
        raise HTTPException(status_code=400, detail=error)

    return repository.create(data)


@router.put("/{id}", response_model=ProductoResponse)
def update_producto(id: int, data: ProductoUpdate):
    if data.categoria_id is not None:
        ok, error = repository.ensure_categoria(data.categoria_id)
        if not ok:
            raise HTTPException(status_code=400, detail=error)

    producto = repository.update(id, data)
    if producto is None:
        raise HTTPException(status_code=404, detail=f"El producto {id} no existe")

    return producto


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_producto(id: int):
    ok = repository.delete(id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"El producto {id} no existe")
    return None