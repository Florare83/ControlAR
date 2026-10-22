
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
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
from .dependencies import get_current_user, require_admin
from .schemas import Token, UsuarioCreate, UsuarioOut

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class CambiarContrasena(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str


class ConfirmarEliminacion(BaseModel):
    contrasena: str


class UsuarioAdminOut(BaseModel):
    id: int
    nombre: str
    email: EmailStr
    es_admin: bool
    activo: bool

    class Config:
        from_attributes = True


class ActualizarUsuarioAdmin(BaseModel):
    es_admin: bool | None = None
    activo: bool | None = None


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

    db.query(Favorito).filter(
        Favorito.usuario_id == usuario.id
    ).delete(synchronize_session=False)

    usuario.nombre = "Cuenta eliminada"
    usuario.email = f"cuenta-eliminada-{usuario.id}@invalid.local"
    usuario.contrasena_hash = hashear_contrasena(
        secrets.token_urlsafe(32)
    )
    usuario.activo = False

    db.commit()

    return {"mensaje": "La cuenta fue desactivada correctamente"}


# ---------------------------------------------------------
# ADMINISTRACIÓN DE USUARIOS
# ---------------------------------------------------------

@router.get(
    "/admin/usuarios",
    response_model=list[UsuarioAdminOut],
)
def listar_usuarios_admin(
    buscar: str = Query(default="", max_length=150),
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    consulta = db.query(Usuario)

    termino = buscar.strip()

    if termino:
        patron = f"%{termino}%"
        consulta = consulta.filter(
            (Usuario.nombre.ilike(patron))
            | (Usuario.email.ilike(patron))
        )

    return consulta.order_by(Usuario.id.desc()).all()


@router.patch(
    "/admin/usuarios/{usuario_id}",
    response_model=UsuarioAdminOut,
)
def actualizar_usuario_admin(
    usuario_id: int,
    datos: ActualizarUsuarioAdmin,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    usuario = repo.get_by_id(db, usuario_id)

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el usuario",
        )

    cambios = datos.model_dump(exclude_unset=True)

    if not cambios:
        raise HTTPException(
            status_code=400,
            detail="No se indicaron cambios",
        )

    if usuario.id == admin.id:
        if cambios.get("activo") is False:
            raise HTTPException(
                status_code=400,
                detail="No podés desactivar tu propia cuenta",
            )

        if cambios.get("es_admin") is False:
            raise HTTPException(
                status_code=400,
                detail="No podés quitarte tu propio rol de administrador",
            )

    if cambios.get("activo") is not None:
        usuario.activo = cambios["activo"]

    if cambios.get("es_admin") is not None:
        usuario.es_admin = cambios["es_admin"]

    db.commit()
    db.refresh(usuario)

    return usuario
