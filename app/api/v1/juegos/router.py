from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from . import repository as repo
from .schemas import JuegoCreate, JuegoUpdate, JuegoResponse

router = APIRouter(prefix="/juegos", tags=["Juegos"])


@router.get("/", response_model=list[JuegoResponse])
def listar(query: str | None = None, db: Session = Depends(get_db)):
    if query:
        return repo.search_by_titulo(db, query)
    return repo.list_juegos(db)


@router.get("/{juego_id}", response_model=JuegoResponse)
def obtener(juego_id: int, db: Session = Depends(get_db)):
    juego = repo.get_by_id(db, juego_id)
    if juego is None:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    return juego


@router.post("/", response_model=JuegoResponse, status_code=201)
def crear(datos: JuegoCreate, db: Session = Depends(get_db)):
    ok, error = repo.ensure_categoria(db, datos.categoria_id)
    if not ok:
        raise HTTPException(status_code=400, detail=error)
    return repo.create(db, datos)


@router.put("/{juego_id}", response_model=JuegoResponse)
def actualizar(juego_id: int, datos: JuegoUpdate, db: Session = Depends(get_db)):
    if datos.categoria_id is not None:
        ok, error = repo.ensure_categoria(db, datos.categoria_id)
        if not ok:
            raise HTTPException(status_code=400, detail=error)

    juego = repo.update(db, juego_id, datos)
    if juego is None:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    return juego


@router.delete("/{juego_id}", status_code=204)
def eliminar(juego_id: int, db: Session = Depends(get_db)):
    eliminado = repo.delete(db, juego_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Juego no encontrado")