# Carrito -> pedido -> pago con Mercado Pago.
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1.auth.dependencies import get_current_user
from app.core import mercadopago as mp
from app.core.db import get_db
from app.models.juego import Juego
from app.models.pedido import APROBADO, PENDIENTE, RECHAZADO, Pedido, PedidoItem
from app.models.usuario import Usuario

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])
router_pagos = APIRouter(prefix="/pagos", tags=["Pagos"])


# ---------- Schemas ----------

class ItemCarrito(BaseModel):
    juego_id: int = Field(ge=1)
    cantidad: int = Field(ge=1, le=99)


class CheckoutIn(BaseModel):
    items: list[ItemCarrito] = Field(min_length=1)


class ConfirmarIn(BaseModel):
    pago_id: str | None = None


# ---------- Ayudas ----------

def _serializar(pedido: Pedido) -> dict:
    return {
        "id": pedido.id,
        "estado": pedido.estado,
        "total": pedido.total,
        "items": [
            {
                "titulo": i.titulo,
                "precio_unitario": i.precio_unitario,
                "cantidad": i.cantidad,
            }
            for i in pedido.items
        ],
    }


def sincronizar_pago(db: Session, pedido_id: int, pago: dict) -> Pedido | None:
    """Actualiza el pedido según un pago REAL traído de Mercado Pago.
    Es idempotente: si el webhook y la vuelta del cliente llegan a la vez,
    el stock se descuenta una sola vez."""
    pedido = (
        db.query(Pedido)
        .filter(Pedido.id == pedido_id)
        .with_for_update()
        .first()
    )
    if pedido is None:
        return None

    # El pago tiene que ser de este pedido y por el monto correcto.
    if pago.get("external_reference") != str(pedido.id):
        raise HTTPException(400, "El pago no corresponde a este pedido.")
    if abs(float(pago.get("transaction_amount", 0)) - pedido.total) > 0.01:
        raise HTTPException(400, "El monto del pago no coincide con el pedido.")

    if pedido.estado == APROBADO:
        return pedido  # ya procesado

    estado_mp = pago.get("status")
    pedido.pago_id = str(pago.get("id"))

    if estado_mp == "approved":
        pedido.estado = APROBADO
        pedido.pagado_en = datetime.now(timezone.utc)
        for item in pedido.items:
            if item.juego_id is None:
                continue
            juego = db.query(Juego).filter(Juego.id == item.juego_id).first()
            if juego is not None:
                juego.stock = max(0, juego.stock - item.cantidad)
    elif estado_mp in ("rejected", "cancelled"):
        pedido.estado = RECHAZADO
    else:
        pedido.estado = PENDIENTE  # in_process, pending, authorized...

    db.commit()
    db.refresh(pedido)
    return pedido


# ---------- Endpoints ----------

@router.post("/checkout", status_code=201)
def crear_checkout(
    datos: CheckoutIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Valida el carrito con los precios y el stock REALES de la base,
    crea el pedido y la preferencia de pago de Mercado Pago."""
    # Unir renglones repetidos del mismo juego.
    cantidades: dict[int, int] = {}
    for it in datos.items:
        cantidades[it.juego_id] = cantidades.get(it.juego_id, 0) + it.cantidad

    juegos = db.query(Juego).filter(Juego.id.in_(cantidades)).all()
    por_id = {j.id: j for j in juegos}

    items_pedido, items_mp = [], []
    total = 0.0

    for juego_id, cantidad in cantidades.items():
        juego = por_id.get(juego_id)
        if juego is None or not juego.en_venta:
            raise HTTPException(
                409, "Uno de los juegos ya no está disponible en tienda."
            )
        if cantidad > juego.stock:
            raise HTTPException(
                409,
                f"Stock insuficiente de \"{juego.titulo}\" "
                f"(quedan {juego.stock}).",
            )
        if juego.precio <= 0:
            raise HTTPException(
                409, f"\"{juego.titulo}\" no tiene un precio válido."
            )

        total += round(juego.precio, 2) * cantidad
        items_pedido.append(
            PedidoItem(
                juego_id=juego.id,
                titulo=juego.titulo,
                precio_unitario=round(juego.precio, 2),
                cantidad=cantidad,
            )
        )
        items_mp.append(
            {
                "id": str(juego.id),
                "title": juego.titulo,
                "quantity": cantidad,
                "unit_price": round(juego.precio, 2),
                "currency_id": "ARS",
            }
        )

    pedido = Pedido(
        usuario_id=usuario.id,
        total=round(total, 2),
        estado=PENDIENTE,
        items=items_pedido,
    )
    db.add(pedido)
    db.commit()
    db.refresh(pedido)

    preferencia = mp.crear_preferencia(pedido.id, items_mp)
    pedido.preferencia_id = preferencia.get("id")
    db.commit()

    return {
        "pedido_id": pedido.id,
        "total": pedido.total,
        "init_point": preferencia["init_point"],
    }


@router.get("/{pedido_id}")
def obtener_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    pedido = (
        db.query(Pedido)
        .filter(Pedido.id == pedido_id, Pedido.usuario_id == usuario.id)
        .first()
    )
    if pedido is None:
        raise HTTPException(404, "Pedido no encontrado")
    return _serializar(pedido)


@router.post("/{pedido_id}/confirmar")
def confirmar_pedido(
    pedido_id: int,
    datos: ConfirmarIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Se llama al volver de Mercado Pago. NO confía en lo que dice la URL:
    vuelve a consultar el pago a Mercado Pago antes de aprobar nada."""
    pedido = (
        db.query(Pedido)
        .filter(Pedido.id == pedido_id, Pedido.usuario_id == usuario.id)
        .first()
    )
    if pedido is None:
        raise HTTPException(404, "Pedido no encontrado")

    if datos.pago_id and pedido.estado != APROBADO:
        pago = mp.obtener_pago(datos.pago_id)
        if pago is None:
            raise HTTPException(404, "Pago no encontrado en Mercado Pago.")
        pedido = sincronizar_pago(db, pedido.id, pago)

    return _serializar(pedido)


@router_pagos.post("/webhook")
async def webhook(request: Request, db: Session = Depends(get_db)):
    """Aviso de Mercado Pago (IPN/webhook). Solo funciona con BACKEND_URL público.
    No es necesario validar la firma: el estado se vuelve a pedir a Mercado Pago
    con nuestro token, así que un aviso falso no puede aprobar un pedido."""
    pago_id = request.query_params.get("data.id")
    tipo = request.query_params.get("type") or request.query_params.get("topic")

    if pago_id is None:
        try:
            cuerpo = await request.json()
            pago_id = str((cuerpo.get("data") or {}).get("id") or "") or None
            tipo = tipo or cuerpo.get("type")
        except Exception:
            pass

    if pago_id and tipo == "payment":
        pago = mp.obtener_pago(pago_id)
        ref = (pago or {}).get("external_reference")
        if pago and ref and ref.isdigit():
            try:
                sincronizar_pago(db, int(ref), pago)
            except HTTPException:
                pass  # aviso inconsistente: se ignora, siempre respondemos 200

    return {"ok": True}
