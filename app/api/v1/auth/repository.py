from sqlalchemy.orm import Session

from app.core.security import hashear_contrasena, verificar_contrasena
from app.models.usuario import Usuario


def get_by_email(db: Session, email: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.email == email.lower()).first()


def get_by_id(db: Session, usuario_id: int) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def create(db: Session, nombre: str, email: str, contrasena: str, es_admin: bool = False) -> Usuario:
    nuevo = Usuario(
        nombre=nombre,
        email=email.lower(),
        contrasena_hash=hashear_contrasena(contrasena),
        es_admin=es_admin,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def autenticar(db: Session, email: str, contrasena: str) -> Usuario | None:
    usuario = get_by_email(db, email)
    if usuario is None or not usuario.activo:
        return None
    if not verificar_contrasena(contrasena, usuario.contrasena_hash):
        return None
    return usuario
