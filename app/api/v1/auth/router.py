from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import crear_token
from app.models.usuario import Usuario
from . import repository as repo
from .dependencies import get_current_user
from .schemas import Token, UsuarioCreate, UsuarioOut

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/register", response_model=UsuarioOut, status_code=201)
def registrar(datos: UsuarioCreate, db: Session = Depends(get_db)):
    if repo.get_by_email(db, datos.email) is not None:
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo")
    # El registro público siempre crea usuarios comunes (es_admin=False).
    return repo.create(db, datos.nombre, datos.email, datos.contrasena)


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    # OAuth2PasswordRequestForm usa el campo "username": acá es el email.
    usuario = repo.autenticar(db, form.username, form.password)
    if usuario is None:
        # Mismo mensaje si falla el email o la contraseña (no revelar cuál).
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=crear_token(usuario.id))


@router.get("/me", response_model=UsuarioOut)
def perfil(usuario: Usuario = Depends(get_current_user)):
    return usuario
