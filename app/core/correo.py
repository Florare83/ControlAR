# Envío de correos por SMTP (respuestas del administrador a los mensajes de contacto).
#
# Variables de entorno (backend/.env):
#   SMTP_HOST       servidor SMTP (ej. smtp.gmail.com)
#   SMTP_PORT       puerto (587 con STARTTLS, 465 con SSL). Por defecto 587
#   SMTP_USER       usuario de la cuenta (normalmente el mail completo)
#   SMTP_PASSWORD   contraseña o "contraseña de aplicación"
#   SMTP_FROM       dirección que figura como remitente (por defecto SMTP_USER)
#   SMTP_FROM_NAME  nombre del remitente (por defecto "ControlAR")
#   SMTP_SECURITY   starttls (por defecto) | ssl | none
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

TIMEOUT_SEGUNDOS = 15


def _config() -> dict:
    return {
        "host": os.getenv("SMTP_HOST", "").strip(),
        "port": int(os.getenv("SMTP_PORT", "587") or 587),
        "user": os.getenv("SMTP_USER", "").strip(),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from": (os.getenv("SMTP_FROM") or os.getenv("SMTP_USER", "")).strip(),
        "from_name": os.getenv("SMTP_FROM_NAME", "ControlAR").strip(),
        "security": os.getenv("SMTP_SECURITY", "starttls").strip().lower(),
    }


def _una_linea(texto: str) -> str:
    # Evita inyección de cabeceras: ningún salto de línea en asunto/destinatario.
    return " ".join(texto.split())


def enviar_correo(
    destinatario: str,
    asunto: str,
    cuerpo: str,
    responder_a: str | None = None,
) -> None:
    cfg = _config()

    if not cfg["host"] or not cfg["from"]:
        raise HTTPException(
            status_code=503,
            detail="El envío de correos no está configurado (faltan SMTP_HOST / SMTP_USER).",
        )

    mensaje = EmailMessage()
    mensaje["From"] = formataddr((cfg["from_name"], cfg["from"]))
    mensaje["To"] = _una_linea(destinatario)
    mensaje["Subject"] = _una_linea(asunto)
    mensaje["Date"] = formatdate(localtime=True)
    mensaje["Message-ID"] = make_msgid(domain=cfg["from"].split("@")[-1])
    if responder_a:
        mensaje["Reply-To"] = _una_linea(responder_a)
    mensaje.set_content(cuerpo)

    try:
        if cfg["security"] == "ssl":
            servidor = smtplib.SMTP_SSL(
                cfg["host"],
                cfg["port"],
                timeout=TIMEOUT_SEGUNDOS,
                context=ssl.create_default_context(),
            )
        else:
            servidor = smtplib.SMTP(cfg["host"], cfg["port"], timeout=TIMEOUT_SEGUNDOS)

        with servidor:
            if cfg["security"] == "starttls":
                servidor.starttls(context=ssl.create_default_context())
            if cfg["user"]:
                servidor.login(cfg["user"], cfg["password"])
            servidor.send_message(mensaje)

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            502, "El servidor de correo rechazó el usuario o la contraseña (SMTP)."
        )
    except smtplib.SMTPRecipientsRefused:
        raise HTTPException(400, "El servidor rechazó la dirección de destino.")
    except (smtplib.SMTPException, OSError):
        raise HTTPException(
            502, "No se pudo enviar el correo. Revisá la configuración SMTP."
        )
