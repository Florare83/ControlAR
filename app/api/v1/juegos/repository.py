from sqlalchemy.orm import Session
from app.models.juego import Juego
from app.models.categoria import Categoria
from app.models.prestamo import ACTIVO, Prestamo


def _find_categoria(db: Session, categoria_id: int) -> Categoria | None:
    return db.query(Categoria).filter(Categoria.id == categoria_id).first()


def ensure_categoria(db: Session, categoria_id: int):
    categoria = _find_categoria(db, categoria_id)
    if categoria is None:
        return False, f"La categoria {categoria_id} no existe"
    return True, None


# --- Disponibilidad: un juego está "en préstamo" si tiene un préstamo activo ---
def marcar_en_prestamo(db: Session, juegos: list[Juego]) -> list[Juego]:
    """Le agrega a cada juego el dato en_prestamo (True/False) que lee JuegoResponse.
    Es UNA consulta para toda la lista, no una por juego."""
    filas = db.query(Prestamo.juego_id).filter(Prestamo.estado == ACTIVO).all()
    ids_en_prestamo = {fila[0] for fila in filas}
    for juego in juegos:
        juego.en_prestamo = juego.id in ids_en_prestamo
    return juegos


def _buscar(db: Session, juego_id: int) -> Juego | None:
    return db.query(Juego).filter(Juego.id == juego_id).first()


def list_juegos(db: Session) -> list[Juego]:
    return marcar_en_prestamo(db, db.query(Juego).all())


def search_by_titulo(db: Session, query: str) -> list[Juego]:
    juegos = db.query(Juego).filter(Juego.titulo.ilike(f"%{query}%")).all()
    return marcar_en_prestamo(db, juegos)


def get_by_id(db: Session, juego_id: int) -> Juego | None:
    juego = _buscar(db, juego_id)
    if juego is not None:
        marcar_en_prestamo(db, [juego])
    return juego


def tiene_prestamos(db: Session, juego_id: int) -> bool:
    """True si el juego tiene préstamos, activos o ya cerrados (historial)."""
    return db.query(Prestamo.id).filter(Prestamo.juego_id == juego_id).first() is not None


def create(db: Session, datos) -> Juego:
    nuevo = Juego(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    marcar_en_prestamo(db, [nuevo])
    return nuevo


def update(db: Session, juego_id: int, datos) -> Juego | None:
    juego = _buscar(db, juego_id)
    if juego is None:
        return None

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(juego, campo, valor)

    db.commit()
    db.refresh(juego)
    marcar_en_prestamo(db, [juego])
    return juego


def delete(db: Session, juego_id: int) -> bool:
    juego = _buscar(db, juego_id)
    if juego is None:
        return False
    db.delete(juego)
    db.commit()
    return True