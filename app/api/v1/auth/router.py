
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
import secrets

from app.core.db import get_db
from app.core.security import (
    crear_token,
    hashear_contrasena,
    verificar_contrasena,
)
from app.models.usuario import Usuario
from app.models.favorito import Favorito
from . import repository as repo
from .dependencies import get_current_user
from .schemas import Token, UsuarioCreate, UsuarioOut

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class CambiarContrasena(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str


class ConfirmarEliminacion(BaseModel):
    contrasena: str


@router.post("/register", response_model=UsuarioOut, status_code=201)
def registrar(datos: UsuarioCreate, db: Session = Depends(get_db)):
    if repo.get_by_email(db, datos.email) is not None:
        raise HTTPException(
            status_code=409,
            detail="Ya existe una cuenta con ese correo",
        )

    return repo.create(
        db,
        datos.nombre,
        datos.email,
        datos.contrasena,
    )


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    usuario = repo.autenticar(db, form.username, form.password)

    if usuario is None:
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return Token(access_token=crear_token(usuario.id))


@router.get("/me", response_model=UsuarioOut)
def perfil(usuario: Usuario = Depends(get_current_user)):
    return usuario


@router.post("/cambiar-contrasena")
def cambiar_contrasena(
    datos: CambiarContrasena,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if not verificar_contrasena(
        datos.contrasena_actual,
        usuario.contrasena_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual es incorrecta",
        )

    if len(datos.contrasena_nueva) < 8:
        raise HTTPException(
            status_code=400,
            detail="La nueva contraseña debe tener al menos 8 caracteres",
        )

    if datos.contrasena_nueva == datos.contrasena_actual:
        raise HTTPException(
            status_code=400,
            detail="La nueva contraseña debe ser diferente de la actual",
        )

    usuario.contrasena_hash = hashear_contrasena(
        datos.contrasena_nueva
    )
    db.commit()

    return {"mensaje": "Contraseña cambiada correctamente"}


@router.delete("/me")
def eliminar_cuenta(
    datos: ConfirmarEliminacion,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if not verificar_contrasena(
        datos.contrasena,
        usuario.contrasena_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail="La contraseña es incorrecta",
        )

    # Conservamos los préstamos históricos, pero quitamos los favoritos.
    db.query(Favorito).filter(
        Favorito.usuario_id == usuario.id
    ).delete(synchronize_session=False)

    # Desactivamos y anonimizamos la cuenta.
    usuario.nombre = "Cuenta eliminada"
    usuario.email = f"cuenta-eliminada-{usuario.id}@invalid.local"
    usuario.contrasena_hash = hashear_contrasena(
        secrets.token_urlsafe(32)
    )
    usuario.activo = False

    db.commit()

    return {
        "mensaje": "La cuenta fue desactivada correctamente"
    }
