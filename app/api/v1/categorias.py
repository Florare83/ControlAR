from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.categoria import Categoria
from app.api.v1.juegos.schemas import CategoriaOut

router = APIRouter(prefix="/categorias", tags=["Categorías"])


@router.get("/", response_model=list[CategoriaOut])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).order_by(Categoria.id).all()