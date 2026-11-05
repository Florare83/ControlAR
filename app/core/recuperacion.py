# Enlace de "olvidé mi contraseña": firmado, vence en 1 hora y se puede usar UNA sola vez.
#
#  - Usa una clave derivada de SECRET_KEY y guarda el id en "uid" (no en "sub"), así que no
#    sirve como token de sesión (leer_token() de security.py lo rechaza).
#  - Lleva una "huella" de la contraseña actual: apenas la persona elige una nueva (o la
#    cambia desde su cuenta) la huella ya no coincide y el enlace deja de servir.
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.core.security import ALGORITHM, SECRET_KEY

VENCE_EN = timedelta(hours=1)


def _clave() -> str:
    return f"{SECRET_KEY}:recuperar-contrasena"


def _huella(contrasena_hash: str) -> str:
    return hashlib.sha256(contrasena_hash.encode()).hexdigest()[:16]


def crear_token(usuario) -> str:
    payload = {
        "uid": int(usuario.id),
        "h": _huella(usuario.contrasena_hash),
        "exp": datetime.now(timezone.utc) + VENCE_EN,
    }
    return jwt.encode(payload, _clave(), algorithm=ALGORITHM)


def leer_token(token: str) -> tuple[int, str] | None:
    """Devuelve (id de usuario, huella) si el token es válido y no venció; si no, None."""
    try:
        payload = jwt.decode(token, _clave(), algorithms=[ALGORITHM])
        return int(payload["uid"]), str(payload["h"])
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        return None


def sigue_vigente(usuario, huella: str) -> bool:
    """False si la contraseña ya cambió desde que se pidió el enlace (ya se usó)."""
    return secrets.compare_digest(_huella(usuario.contrasena_hash), huella)
