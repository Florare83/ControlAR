# Cambia la contraseña de un usuario que ya existe.
# Uso (Git Bash):
#   EMAIL=usuario@ejemplo.com NUEVA_PASSWORD=una-clave-larga python -m app.core.cambiar_contrasena
# (PowerShell: $env:EMAIL="..."; $env:NUEVA_PASSWORD="..."; python -m app.core.cambiar_contrasena)
import os

from app.core.db import SessionLocal
from app.core.security import hashear_contrasena
from app.api.v1.auth import repository as repo

email = os.getenv("EMAIL")
nueva = os.getenv("NUEVA_PASSWORD")

if not email or not nueva:
    raise SystemExit("Definí EMAIL y NUEVA_PASSWORD como variables de entorno.")
if len(nueva) < 8:
    raise SystemExit("NUEVA_PASSWORD debe tener al menos 8 caracteres.")

db = SessionLocal()
usuario = repo.get_by_email(db, email)
if usuario is None:
    db.close()
    raise SystemExit("No existe ningún usuario con ese correo.")

usuario.contrasena_hash = hashear_contrasena(nueva)
db.commit()
db.close()
print("Contraseña actualizada correctamente.")
