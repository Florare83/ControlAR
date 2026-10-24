from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.api.v1.auth.dependencies import get_current_user_opcional, require_admin
from app.models.usuario import Usuario
from . import repository as repo
from .schemas import JuegoCreate, JuegoUpdate, JuegoResponse

router = APIRouter(prefix="/juegos", tags=["Juegos"])


def _segun_usuario(juegos, usuario: Usuario | None):
    """Arma la respuesta; las observaciones internas solo las ve un administrador."""
    es_admin = usuario is not None and usuario.es_admin
    salida = [JuegoResponse.model_validate(j) for j in juegos]
    if not es_admin:
        salida = [j.model_copy(update={"observaciones": None}) for j in salida]
    return salida


@router.get("/", response_model=list[JuegoResponse])
def listar(
    query: str | None = None,
    db: Session = Depends(get_db),
    usuario: Usuario | None = Depends(get_current_user_opcional),
):
    juegos = repo.search_by_titulo(db, query) if query else repo.list_juegos(db)
    return _segun_usuario(juegos, usuario)


# Va antes de "/{juego_id}": si no, "populares" se tomaría como un id y daría error 422.
@router.get("/populares", response_model=list[JuegoResponse])
def populares(limite: int = Query(2, ge=1, le=12), db: Session = Depends(get_db)):
    """Juegos de la tienda más populares (los que más "me gusta" tienen). Público."""
    return _segun_usuario(repo.list_populares(db, limite), None)


@router.get("/{juego_id}", response_model=JuegoResponse)
def obtener(
    juego_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario | None = Depends(get_current_user_opcional),
):
    juego = repo.get_by_id(db, juego_id)
    if juego is None:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    return _segun_usuario([juego], usuario)[0]


@router.post("/", response_model=JuegoResponse, status_code=201)
def crear(datos: JuegoCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    ok, error = repo.ensure_categoria(db, datos.categoria_id)
    if not ok:
        raise HTTPException(status_code=400, detail=error)
    return repo.create(db, datos)


@router.put("/{juego_id}", response_model=JuegoResponse)
def actualizar(
    juego_id: int, datos: JuegoUpdate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    if datos.categoria_id is not None:
        ok, error = repo.ensure_categoria(db, datos.categoria_id)
        if not ok:
            raise HTTPException(status_code=400, detail=error)

    juego = repo.update(db, juego_id, datos)
    if juego is None:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    return juego


@router.delete("/{juego_id}", status_code=204)
def eliminar(juego_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    if repo.get_by_id(db, juego_id) is None:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    # Un juego con préstamos (activos o históricos) no se borra: se perdería el registro.
    if repo.tiene_prestamos(db, juego_id):
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar: el juego tiene préstamos registrados",
        )
    if repo.tiene_reservas(db, juego_id):
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar: el juego tiene reservas registradas",
        )
    repo.delete(db, juego_id)