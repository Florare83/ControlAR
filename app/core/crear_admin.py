# Crea (o promueve) el usuario administrador inicial.
# Uso:  ADMIN_EMAIL=admin@ejemplo.com ADMIN_PASSWORD=unaClaveLarga ADMIN_NOMBRE=Juan python -m app.core.crear_admin
# ADMIN_NOMBRE es el nombre que se ve en el menú ("Hola Juan"). Si no se define, se usa
# "Administrador". Si el usuario ya existe y se define ADMIN_NOMBRE, se le cambia el nombre.
# (en Windows PowerShell: $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; python -m app.core.crear_admin)
import os

from app.core.db import SessionLocal
from app.api.v1.auth import repository as repo

email = os.getenv("ADMIN_EMAIL")
contrasena = os.getenv("ADMIN_PASSWORD")
nombre_elegido = os.getenv("ADMIN_NOMBRE", "").strip()
nombre = nombre_elegido or "Administrador"

if not email or not contrasena:
    raise SystemExit("Definí ADMIN_EMAIL y ADMIN_PASSWORD como variables de entorno.")
if len(contrasena) < 8:
    raise SystemExit("ADMIN_PASSWORD debe tener al menos 8 caracteres.")

db = SessionLocal()
usuario = repo.get_by_email(db, email)
if usuario is None:
    repo.create(db, nombre, email, contrasena, es_admin=True)
    print("Administrador creado correctamente.")
else:
    usuario.es_admin = True
    if nombre_elegido:
        usuario.nombre = nombre_elegido
    db.commit()
    print("El usuario ya existía: ahora es administrador.")
db.close()
