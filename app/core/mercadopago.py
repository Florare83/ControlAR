# Cliente mínimo de Mercado Pago (Checkout Pro) usando httpx.
# Con credenciales de PRUEBA todo funciona en modo sandbox: no se mueve dinero real.
import os

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

MP_API = "https://api.mercadopago.com"
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# Solo se usa si el backend es accesible desde internet (Render, ngrok, etc.).
BACKEND_URL = os.getenv("BACKEND_URL", "").rstrip("/")


def _headers(extra: dict | None = None) -> dict:
    if not MP_ACCESS_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Los pagos no están configurados (falta MP_ACCESS_TOKEN).",
        )
    return {"Authorization": f"Bearer {MP_ACCESS_TOKEN}", **(extra or {})}


def crear_preferencia(pedido_id: int, items: list[dict]) -> dict:
    """Crea la preferencia de pago y devuelve la respuesta de Mercado Pago
    (incluye `id` y `init_point`, la URL a la que hay que mandar al cliente)."""
    back = f"{FRONTEND_URL}/compra/resultado?pedido={pedido_id}"

    cuerpo = {
        "items": items,
        "external_reference": str(pedido_id),
        "back_urls": {"success": back, "failure": back, "pending": back},
        "statement_descriptor": "RINCON DE HERMES",
    }

    # Mercado Pago rechaza auto_return con URLs que no son https (ej. localhost).
    if FRONTEND_URL.startswith("https://"):
        cuerpo["auto_return"] = "approved"

    # El webhook solo sirve si Mercado Pago puede llegar a tu backend.
    if BACKEND_URL.startswith("https://"):
        cuerpo["notification_url"] = f"{BACKEND_URL}/pagos/webhook"

    try:
        r = httpx.post(
            f"{MP_API}/checkout/preferences",
            json=cuerpo,
            headers=_headers({"X-Idempotency-Key": f"pedido-{pedido_id}"}),
            timeout=15,
        )
    except httpx.HTTPError:
        raise HTTPException(502, "No se pudo conectar con Mercado Pago.")

    if r.status_code not in (200, 201):
        raise HTTPException(
            502, f"Mercado Pago rechazó la operación ({r.status_code})."
        )
    return r.json()


def obtener_pago(pago_id: str) -> dict | None:
    """Consulta un pago directamente a Mercado Pago (la fuente de verdad)."""
    try:
        r = httpx.get(
            f"{MP_API}/v1/payments/{pago_id}", headers=_headers(), timeout=15
        )
    except httpx.HTTPError:
        raise HTTPException(502, "No se pudo conectar con Mercado Pago.")

    if r.status_code == 404:
        return None
    if r.status_code != 200:
        raise HTTPException(
            502, f"No se pudo verificar el pago ({r.status_code})."
        )
    return r.json()
