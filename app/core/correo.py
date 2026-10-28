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
#
# Envío por API HTTPS (recomendado en Render):
#   BREVO_API_KEY   clave de API de Brevo (https://app.brevo.com). Si está definida,
#                   los correos se envían por HTTPS (puerto 443) y NO por SMTP.
#                   Usa SMTP_FROM / SMTP_FROM_NAME como remitente, que debe estar
#                   verificado en Brevo (Settings > Senders).
#
# Por qué: los servicios gratuitos de Render bloquean las salidas a los puertos SMTP
# (25, 465 y 587) y la conexión queda esperando hasta agotar el tiempo. HTTPS no se bloquea.
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

# Mismo logger que usa uvicorn, para que el detalle aparezca en los logs de Render.
log = logging.getLogger("uvicorn.error")

TIMEOUT_SEGUNDOS = 15
BREVO_URL_POR_DEFECTO = "https://api.brevo.com/v3/smtp/email"


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


def _enviar_por_brevo(
    clave: str,
    cfg: dict,
    destinatario: str,
    asunto: str,
    cuerpo: str,
    responder_a: str | None,
) -> None:
    """Envía el correo por la API HTTPS de Brevo (no usa puertos SMTP)."""
    if not cfg["from"]:
        raise HTTPException(
            status_code=503,
            detail="Falta SMTP_FROM: el remitente (verificado en Brevo) no está configurado.",
        )

    datos = {
        "sender": {"name": cfg["from_name"], "email": cfg["from"]},
        "to": [{"email": _una_linea(destinatario)}],
        "subject": _una_linea(asunto),
        "textContent": cuerpo,
    }
    if responder_a:
        datos["replyTo"] = {"email": _una_linea(responder_a)}

    url = os.getenv("BREVO_API_URL", BREVO_URL_POR_DEFECTO).strip()

    try:
        respuesta = httpx.post(
            url,
            json=datos,
            headers={"api-key": clave, "accept": "application/json"},
            timeout=TIMEOUT_SEGUNDOS,
        )
    except httpx.HTTPError as e:
        log.error("Correo (Brevo): no se pudo conectar con %s: %r", url, e)
        raise HTTPException(
            502, "No se pudo conectar con el servicio de correo. Probá de nuevo en un momento."
        )

    if respuesta.status_code in (200, 201, 202):
        return

    # El detalle técnico queda en los logs; al usuario se le da un mensaje claro.
    log.error(
        "Correo (Brevo): respondió %s: %s", respuesta.status_code, respuesta.text[:500]
    )

    if respuesta.status_code in (401, 403):
        raise HTTPException(
            502, "El servicio de correo rechazó la clave de API (revisá BREVO_API_KEY)."
        )
    if respuesta.status_code == 400:
        raise HTTPException(
            502,
            "El servicio de correo rechazó el envío. Revisá que el remitente "
            "(SMTP_FROM) esté verificado en Brevo.",
        )
    raise HTTPException(502, "No se pudo enviar el correo. Intentá de nuevo más tarde.")


def enviar_correo(
    destinatario: str,
    asunto: str,
    cuerpo: str,
    responder_a: str | None = None,
) -> None:
    cfg = _config()

    # Con BREVO_API_KEY el envío va por HTTPS (funciona en el plan gratuito de Render).
    clave_brevo = os.getenv("BREVO_API_KEY", "").strip()
    if clave_brevo:
        _enviar_por_brevo(clave_brevo, cfg, destinatario, asunto, cuerpo, responder_a)
        return

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

    except smtplib.SMTPAuthenticationError as e:
        log.error("Correo (SMTP): autenticación rechazada en %s:%s: %r", cfg["host"], cfg["port"], e)
        raise HTTPException(
            502, "El servidor de correo rechazó el usuario o la contraseña (SMTP)."
        )
    except smtplib.SMTPRecipientsRefused as e:
        log.error("Correo (SMTP): destinatario rechazado: %r", e)
        raise HTTPException(400, "El servidor rechazó la dirección de destino.")
    except TimeoutError as e:
        log.error(
            "Correo (SMTP): sin respuesta de %s:%s (%s) tras %s s: %r. "
            "En el plan gratuito de Render los puertos SMTP 25/465/587 están bloqueados.",
            cfg["host"], cfg["port"], cfg["security"], TIMEOUT_SEGUNDOS, e,
        )
        raise HTTPException(
            502,
            "El servidor de correo no respondió a tiempo. Si el servicio está en el plan "
            "gratuito de Render, el envío por SMTP está bloqueado: configurá BREVO_API_KEY "
            "o usá un plan pago.",
        )
    except (smtplib.SMTPException, OSError) as e:
        log.error(
            "Correo (SMTP): falló el envío por %s:%s (%s): %r",
            cfg["host"], cfg["port"], cfg["security"], e,
        )
        raise HTTPException(
            502, "No se pudo enviar el correo. Revisá la configuración SMTP."
        )
