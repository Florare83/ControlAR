
from sqlalchemy.orm import Session

from app.core.security import hashear_contrasena, verificar_contrasena
from app.models.usuario import Usuario


def get_by_email(db: Session, email: str) -> Usuario | None:
    return (
        db.query(Usuario)
        .filter(Usuario.email == email.strip().lower())
        .first()
    )


def get_by_id(db: Session, usuario_id: int) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def create(
    db: Session,
    nombre: str,
    email: str,
    contrasena: str,
    es_admin: bool = False,
    dni: str | None = None,
) -> Usuario:
    nuevo = Usuario(
        nombre=nombre.strip(),
        email=email.strip().lower(),
        contrasena_hash=hashear_contrasena(contrasena),
        es_admin=es_admin,
        dni=dni,
        dni_verificado=False,  # siempre lo verifica un administrador
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return nuevo


def autenticar(
    db: Session,
    email: str,
    contrasena: str,
) -> Usuario | None:
    usuario = get_by_email(db, email)

    if usuario is None or not usuario.activo:
        return None

    if not verificar_contrasena(contrasena, usuario.contrasena_hash):
        return None

    return usuario
