
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import leer_token
from app.models.usuario import Usuario
from . import repository as repo


# Endpoint de inicio de sesión utilizado por Swagger (/docs).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# Igual que oauth2_scheme, pero sin error si no hay sesión (para pantallas públicas).
oauth2_opcional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user_opcional(
    token: str | None = Depends(oauth2_opcional),
    db: Session = Depends(get_db),
) -> Usuario | None:
    """Devuelve el usuario si hay una sesión válida; si no, None (nunca da error)."""
    if not token:
        return None

    usuario_id = leer_token(token)

    if usuario_id is None:
        return None

    usuario = repo.get_by_id(db, usuario_id)

    if usuario is None or not usuario.activo:
        return None

    return usuario


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
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


def require_admin(
    usuario: Usuario = Depends(get_current_user),
) -> Usuario:
    """Permite el acceso únicamente a administradores."""
    if not usuario.es_admin:
        raise HTTPException(
            status_code=403,
            detail="Necesitás permisos de administrador",
        )

    return usuario
