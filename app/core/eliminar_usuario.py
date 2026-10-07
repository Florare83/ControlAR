# Elimina un usuario, o solo le quita el permiso de administrador.
# Uso (Git Bash):
#   EMAIL=usuario@ejemplo.com python -m app.core.eliminar_usuario
#   EMAIL=usuario@ejemplo.com SOLO_QUITAR_ADMIN=1 python -m app.core.eliminar_usuario
# (PowerShell: $env:EMAIL="..."; python -m app.core.eliminar_usuario)
import os

from app.core.db import SessionLocal
from app.models.usuario import Usuario
from app.api.v1.auth import repository as repo

email = os.getenv("EMAIL")
solo_quitar_admin = os.getenv("SOLO_QUITAR_ADMIN") == "1"

if not email:
    raise SystemExit("Definí EMAIL como variable de entorno.")

db = SessionLocal()
usuario = repo.get_by_email(db, email)
if usuario is None:
    db.close()
    raise SystemExit("No existe ningún usuario con ese correo.")

# Protección: nunca dejar el sitio sin ningún administrador.
if usuario.es_admin:
    admins = db.query(Usuario).filter(Usuario.es_admin.is_(True)).count()
    if admins <= 1:
        db.close()
        raise SystemExit("Es el único administrador: creá otro antes de quitarlo o eliminarlo.")

if solo_quitar_admin:
    usuario.es_admin = False
    db.commit()
    print("Listo: el usuario sigue existiendo pero ya no es administrador.")
else:
    db.delete(usuario)
    db.commit()
    print("Usuario eliminado correctamente.")
db.close()
