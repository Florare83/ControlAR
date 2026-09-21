from sqlalchemy.orm import Session
from app.models.juego import Juego
from app.models.categoria import Categoria


def _find_categoria(db: Session, categoria_id: int) -> Categoria | None:
    return db.query(Categoria).filter(Categoria.id == categoria_id).first()


def ensure_categoria(db: Session, categoria_id: int):
    categoria = _find_categoria(db, categoria_id)
    if categoria is None:
        return False, f"La categoria {categoria_id} no existe"
    return True, None


def list_juegos(db: Session) -> list[Juego]:
    return db.query(Juego).all()


def search_by_titulo(db: Session, query: str) -> list[Juego]:
    return db.query(Juego).filter(Juego.titulo.ilike(f"%{query}%")).all()


def get_by_id(db: Session, juego_id: int) -> Juego | None:
    return db.query(Juego).filter(Juego.id == juego_id).first()


def create(db: Session, datos) -> Juego:
    nuevo = Juego(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def update(db: Session, juego_id: int, datos) -> Juego | None:
    juego = get_by_id(db, juego_id)
    if juego is None:
        return None

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(juego, campo, valor)

    db.commit()
    db.refresh(juego)
    return juego


def delete(db: Session, juego_id: int) -> bool:
    juego = get_by_id(db, juego_id)
    if juego is None:
        return False
    db.delete(juego)
    db.commit()
    return True