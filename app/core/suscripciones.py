# Suscripción a las novedades del club (eventos y juegos nuevos) y baja con un clic.
#
# Cada correo de novedades lleva un enlace personal de baja. Ese enlace contiene un token
# firmado que SOLO sirve para darse de baja: no es un token de sesión.
#  - usa otra clave derivada de SECRET_KEY, y
#  - guarda el id en "uid" (no en "sub"), así que leer_token() de security.py lo rechaza.
# No vence: un correo viejo tiene que seguir pudiendo darse de baja.
import jwt
from sqlalchemy.orm import Session

from app.core.security import ALGORITHM, SECRET_KEY
from app.models.usuario import Usuario


def _clave() -> str:
    return f"{SECRET_KEY}:baja-novedades"


def token_baja(usuario_id: int) -> str:
    return jwt.encode({"uid": int(usuario_id)}, _clave(), algorithm=ALGORITHM)


def leer_token_baja(token: str) -> int | None:
    """Devuelve el id de usuario si el token de baja es válido; si no, None."""
    try:
        payload = jwt.decode(token, _clave(), algorithms=[ALGORITHM])
        return int(payload["uid"])
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        return None


def suscriptores(db: Session) -> list[Usuario]:
    """Cuentas activas que eligieron recibir las novedades."""
    return (
        db.query(Usuario)
        .filter(Usuario.suscrito_novedades.is_(True), Usuario.activo.is_(True))
        .order_by(Usuario.id)
        .all()
    )
