
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.api.v1.auth.dependencies import get_current_user
from app.models.usuario import Usuario
from app.models.juego import Juego
from app.models.favorito import Favorito


router = APIRouter(prefix="/favoritos", tags=["Favoritos"])


@router.get("/")
def listar_favoritos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Devuelve los identificadores de los juegos favoritos del usuario."""
    favoritos = (
        db.query(Favorito.juego_id)
        .filter(Favorito.usuario_id == usuario.id)
        .order_by(Favorito.id.desc())
        .all()
    )

    return [fila[0] for fila in favoritos]


@router.post("/{juego_id}")
def agregar_favorito(
    juego_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Guarda un juego en los favoritos del usuario."""
    juego = db.query(Juego).filter(Juego.id == juego_id).first()

    if juego is None:
        raise HTTPException(
            status_code=404,
            detail="Juego no encontrado",
        )

    existente = (
        db.query(Favorito)
        .filter(
            Favorito.usuario_id == usuario.id,
            Favorito.juego_id == juego_id,
        )
        .first()
    )

    if existente:
        return {
            "mensaje": "El juego ya estaba en tus favoritos",
            "juego_id": juego_id,
        }

    favorito = Favorito(
        usuario_id=usuario.id,
        juego_id=juego_id,
    )

    db.add(favorito)
    db.commit()

    return {
        "mensaje": "Juego agregado a favoritos",
        "juego_id": juego_id,
    }


@router.delete("/{juego_id}")
def quitar_favorito(
    juego_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Quita un juego de los favoritos del usuario."""
    favorito = (
        db.query(Favorito)
        .filter(
            Favorito.usuario_id == usuario.id,
            Favorito.juego_id == juego_id,
        )
        .first()
    )

    if favorito is None:
        raise HTTPException(
            status_code=404,
            detail="Ese juego no está en tus favoritos",
        )

    db.delete(favorito)
    db.commit()

    return {
        "mensaje": "Juego quitado de favoritos",
        "juego_id": juego_id,
    }
