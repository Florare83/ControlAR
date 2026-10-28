
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import secrets

from app.core.db import get_db
from app.core.limitador import limite_login
from app.core.security import (
    crear_token,
    hashear_contrasena,
    verificar_contrasena,
)
from app.core.validaciones import escapar_like
from app.models.prestamo import Prestamo
from app.models.usuario import Usuario
from app.models.favorito import Favorito
from . import repository as repo
from .dependencies import get_current_user, require_admin
from .schemas import DniActualizar, Token, UsuarioCreate, UsuarioOut

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class CambiarContrasena(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str


class ConfirmarEliminacion(BaseModel):
    contrasena: str


class UsuarioAdminOut(BaseModel):
    id: int
    nombre: str
    # str y no EmailStr: las cuentas eliminadas quedan con un correo ficticio
    # (cuenta-eliminada-N@invalid.local) que no debe romper el listado.
    email: str
    es_admin: bool
    activo: bool
    dni: str | None = None
    dni_verificado: bool = False
    # Para comparar al verificar: a nombre de quién están los préstamos con ese DNI.
    prestamos_cantidad: int = 0
    prestamo_nombre: str | None = None

    class Config:
        from_attributes = True


class ActualizarUsuarioAdmin(BaseModel):
    es_admin: bool | None = None
    activo: bool | None = None
    # El administrador lo marca después de mirar el DNI físico de la persona.
    dni_verificado: bool | None = None


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
        dni=datos.dni,
    )


@router.post("/login", response_model=Token)
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # Se cuenta por cuenta + conexión: así quien adivina contraseñas se frena,
    # pero no se bloquea a todos los que entran desde la misma red.
    origen = request.client.host if request.client else "desconocido"
    clave = f"{origen}|{form.username.strip().lower()}"

    espera = limite_login.segundos_de_espera(clave)
    if espera:
        minutos = max(1, round(espera / 60))
        raise HTTPException(
            status_code=429,
            detail=(
                "Demasiados intentos fallidos. "
                f"Probá de nuevo en {minutos} {'minuto' if minutos == 1 else 'minutos'}."
            ),
            headers={"Retry-After": str(espera)},
        )

    usuario = repo.autenticar(db, form.username, form.password)

    if usuario is None:
        limite_login.registrar_fallo(clave)
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    limite_login.olvidar(clave)
    return Token(access_token=crear_token(usuario.id))


@router.get("/me", response_model=UsuarioOut)
def perfil(usuario: Usuario = Depends(get_current_user)):
    return usuario


@router.put("/me/dni", response_model=UsuarioOut)
def actualizar_mi_dni(
    datos: DniActualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """La persona carga o corrige su DNI. Si cambia, hay que volver a verificarlo."""
    if usuario.dni != datos.dni:
        usuario.dni = datos.dni
        usuario.dni_verificado = False
        db.commit()
        db.refresh(usuario)

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
    # Se libera el DNI para que pueda verificarse en otra cuenta.
    usuario.dni = None
    usuario.dni_verificado = False

    db.commit()

    return {"mensaje": "La cuenta fue desactivada correctamente"}


# ---------------------------------------------------------
# ADMINISTRACIÓN DE USUARIOS
# ---------------------------------------------------------

def _con_datos_de_prestamos(db: Session, usuarios: list[Usuario]) -> list[UsuarioAdminOut]:
    """Agrega a cada usuario cuántos préstamos hay con su DNI y a nombre de quién
    (el del más reciente), para que el admin lo compare antes de verificar."""

    dnis = {u.dni for u in usuarios if u.dni}
    cantidad: dict[str, int] = {}
    nombre: dict[str, str] = {}

    if dnis:
        filas = (
            db.query(Prestamo.dni, Prestamo.nombre)
            .filter(Prestamo.dni.in_(dnis))
            .order_by(Prestamo.id.desc())
            .all()
        )
        for dni, nombre_prestamo in filas:
            cantidad[dni] = cantidad.get(dni, 0) + 1
            nombre.setdefault(dni, nombre_prestamo)

    return [
        UsuarioAdminOut(
            id=u.id,
            nombre=u.nombre,
            email=u.email,
            es_admin=u.es_admin,
            activo=u.activo,
            dni=u.dni,
            dni_verificado=u.dni_verificado,
            prestamos_cantidad=cantidad.get(u.dni, 0) if u.dni else 0,
            prestamo_nombre=nombre.get(u.dni) if u.dni else None,
        )
        for u in usuarios
    ]


@router.get(
    "/admin/usuarios",
    response_model=list[UsuarioAdminOut],
)
def listar_usuarios_admin(
    buscar: str = Query(default="", max_length=150),
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Lista las cuentas. Se busca por nombre, correo o DNI (también con puntos)."""

    consulta = db.query(Usuario)

    termino = buscar.strip()

    if termino:
        patron = f"%{escapar_like(termino)}%"
        condiciones = [
            Usuario.nombre.ilike(patron, escape="\\"),
            Usuario.email.ilike(patron, escape="\\"),
        ]

        solo_digitos = re.sub(r"[.\s]", "", termino)
        if solo_digitos.isdigit():
            condiciones.append(Usuario.dni.ilike(f"%{solo_digitos}%"))

        consulta = consulta.filter(or_(*condiciones))

    usuarios = consulta.order_by(Usuario.id.desc()).all()

    return _con_datos_de_prestamos(db, usuarios)


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

    if cambios.get("dni_verificado") is True:
        if not usuario.dni:
            raise HTTPException(
                status_code=400,
                detail="La cuenta todavía no tiene un DNI cargado",
            )

        otra = (
            db.query(Usuario)
            .filter(
                Usuario.dni == usuario.dni,
                Usuario.dni_verificado.is_(True),
                Usuario.id != usuario.id,
            )
            .first()
        )

        if otra is not None:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Ese DNI ya está verificado en otra cuenta ({otra.email}). "
                    "Quitale la verificación a esa cuenta primero."
                ),
            )

    if cambios.get("activo") is not None:
        usuario.activo = cambios["activo"]

    if cambios.get("es_admin") is not None:
        usuario.es_admin = cambios["es_admin"]

    if cambios.get("dni_verificado") is not None:
        usuario.dni_verificado = cambios["dni_verificado"]

    try:
        db.commit()
    except IntegrityError:
        # Dos administradores verificando el mismo DNI a la vez.
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ese DNI ya está verificado en otra cuenta",
        )

    db.refresh(usuario)

    return usuario
