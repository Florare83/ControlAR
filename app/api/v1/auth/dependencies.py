from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import leer_token
from app.models.usuario import Usuario
from . import repository as repo

# tokenUrl le dice a Swagger (/docs) a qué endpoint llamar desde el botón "Authorize".
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Usuario:
    error = HTTPException(
        status_code=401,
        detail="Sesión inválida o vencida",
        headers={"WWW-Authenticate": "Bearer"},
    )
    usuario_id = leer_token(token)
    if usuario_id is None:
        raise error
    usuario = repo.get_by_id(db, usuario_id)
    if usuario is None or not usuario.activo:
        raise error
    return usuario


def require_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    if not usuario.es_admin:
        raise HTTPException(status_code=403, detail="Necesitás permisos de administrador")
    return usuario
