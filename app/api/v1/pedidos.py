# Carrito -> pedido -> pago con Mercado Pago.
from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.api.v1.auth.dependencies import get_current_user
from app.core import mercadopago as mp
from app.core.db import get_db
from app.models.juego import Juego
from app.models.pedido import (
    APROBADO,
    CANCELADO,
    EFECTIVO_TRANSFERENCIA,
    MERCADO_PAGO,
    PENDIENTE,
    RECHAZADO,
    Pedido,
    PedidoItem,
)
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


def _serializar_compra(pedido: Pedido) -> dict:
    """Formato para el historial de compras del cliente."""
    if pedido.estado == APROBADO:
        codigo = "aprobado"
    elif pedido.estado == RECHAZADO:
        codigo = "rechazado"
    elif pedido.estado == CANCELADO:
        codigo = "cancelado"
    else:
        codigo = "pendiente"

    # Fecha de pago si existe; si no, la de creación (si el modelo la tiene).
    fecha = getattr(pedido, "pagado_en", None) or getattr(
        pedido, "creado_en", None
    )

    return {
        "id": pedido.id,
        "estado": codigo,
        "forma_pago": pedido.forma_pago or MERCADO_PAGO,
        "total": pedido.total,
        "fecha": fecha.isoformat() if fecha else None,
        "items": [
            {
                "titulo": i.titulo,
                "precio_unitario": i.precio_unitario,
                "cantidad": i.cantidad,
                "subtotal": round(i.precio_unitario * i.cantidad, 2),
            }
            for i in pedido.items
        ],
    }


def _serializar_venta(pedido: Pedido, usuario: Usuario | None) -> dict:
    """Formato para el panel de ventas del administrador."""
    datos = _serializar_compra(pedido)
    datos["pago_id"] = pedido.pago_id
    datos["forma_pago_texto"] = (
        "Efectivo / Transferencia"
        if datos["forma_pago"] == EFECTIVO_TRANSFERENCIA
        else "Mercado Pago"
    )
    creado = getattr(pedido, "creado_en", None)
    pagado = getattr(pedido, "pagado_en", None)
    datos["creado_en"] = creado.isoformat() if creado else None
    datos["pagado_en"] = pagado.isoformat() if pagado else None
    datos["cliente"] = (
        {"nombre": usuario.nombre, "email": usuario.email}
        if usuario is not None
        else None  # cuenta eliminada
    )
    return datos


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

def _armar_items(db: Session, items: list) -> tuple[list, list, float]:
    """Valida el carrito con los precios y el stock REALES de la base.
    Devuelve (items del pedido, items para Mercado Pago, total)."""
    # Unir renglones repetidos del mismo juego.
    cantidades: dict[int, int] = {}
    for it in items:
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

    return items_pedido, items_mp, total


@router.post("/checkout", status_code=201)
def crear_checkout(
    datos: CheckoutIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Valida el carrito con los precios y el stock REALES de la base,
    crea el pedido y la preferencia de pago de Mercado Pago."""
    items_pedido, items_mp, total = _armar_items(db, datos.items)

    pedido = Pedido(
        usuario_id=usuario.id,
        total=round(total, 2),
        estado=PENDIENTE,
        forma_pago=MERCADO_PAGO,
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


@router.post("/efectivo", status_code=201)
def crear_pedido_efectivo(
    datos: CheckoutIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Pedido para pagar en efectivo o por transferencia. Queda PENDIENTE y
    sin tocar el stock: el administrador lo confirma cuando se concreta el
    pago (ver /{pedido_id}/marcar-pagado)."""
    items_pedido, _items_mp, total = _armar_items(db, datos.items)

    pedido = Pedido(
        usuario_id=usuario.id,
        total=round(total, 2),
        estado=PENDIENTE,
        forma_pago=EFECTIVO_TRANSFERENCIA,
        items=items_pedido,
    )
    db.add(pedido)
    db.commit()
    db.refresh(pedido)

    return {"pedido_id": pedido.id, "total": pedido.total}


def _pedido_efectivo_pendiente(
    db: Session, pedido_id: int, usuario: Usuario
) -> Pedido:
    """Pedido bloqueado para modificar. Solo administradores, solo pedidos
    en efectivo/transferencia que sigan pendientes."""
    if not getattr(usuario, "es_admin", False):
        raise HTTPException(403, "Solo los administradores pueden hacer esto.")

    pedido = (
        db.query(Pedido)
        .filter(Pedido.id == pedido_id)
        .with_for_update()
        .first()
    )
    if pedido is None:
        raise HTTPException(404, "Pedido no encontrado")

    if pedido.forma_pago != EFECTIVO_TRANSFERENCIA:
        raise HTTPException(
            400,
            "Los pedidos de Mercado Pago se acreditan solos; "
            "no se confirman a mano.",
        )
    if pedido.estado != PENDIENTE:
        raise HTTPException(
            409, f"El pedido ya está {pedido.estado}: no se puede modificar."
        )
    return pedido


@router.post("/{pedido_id}/marcar-pagado")
def marcar_pedido_pagado(
    pedido_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """El administrador confirma que el pago en efectivo/transferencia se
    concretó. Recién acá se descuenta el stock."""
    pedido = _pedido_efectivo_pendiente(db, pedido_id, usuario)

    # Primero se verifica todo; recién después se descuenta.
    a_descontar = []
    for item in pedido.items:
        if item.juego_id is None:
            continue
        juego = (
            db.query(Juego)
            .filter(Juego.id == item.juego_id)
            .with_for_update()
            .first()
        )
        if juego is None:
            continue  # el juego se borró del catálogo
        if juego.stock < item.cantidad:
            raise HTTPException(
                409,
                f"No hay stock suficiente de \"{juego.titulo}\" "
                f"(quedan {juego.stock}, el pedido pide {item.cantidad}).",
            )
        a_descontar.append((juego, item.cantidad))

    for juego, cantidad in a_descontar:
        juego.stock = max(0, juego.stock - cantidad)

    pedido.estado = APROBADO
    pedido.pagado_en = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pedido)

    cliente = db.query(Usuario).filter(Usuario.id == pedido.usuario_id).first()
    return _serializar_venta(pedido, cliente)


@router.post("/{pedido_id}/cancelar")
def cancelar_pedido_efectivo(
    pedido_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """El administrador cancela un pedido en efectivo/transferencia que no
    se concretó. No toca el stock (nunca se había descontado)."""
    pedido = _pedido_efectivo_pendiente(db, pedido_id, usuario)

    pedido.estado = CANCELADO
    db.commit()
    db.refresh(pedido)

    cliente = db.query(Usuario).filter(Usuario.id == pedido.usuario_id).first()
    return _serializar_venta(pedido, cliente)


# IMPORTANTE: las rutas fijas ("/admin/ventas", "/mis-compras") deben ir
# ANTES de "/{pedido_id}", si no FastAPI intentaría interpretarlas como un
# número de pedido.
@router.get("/admin/ventas")
def listar_ventas(
    estado: str | None = None,
    buscar: str | None = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Panel de ventas (solo administradores): resumen general + listado
    filtrable por estado y por cliente / correo / número de pedido."""
    if not getattr(usuario, "es_admin", False):
        raise HTTPException(403, "Solo los administradores pueden ver las ventas.")

    estados = {
        "aprobado": APROBADO,
        "pendiente": PENDIENTE,
        "rechazado": RECHAZADO,
        "cancelado": CANCELADO,
    }
    if estado and estado not in estados:
        raise HTTPException(400, "Estado inválido.")

    # ---- Resumen (siempre sobre todos los pedidos, sin filtros) ----
    todos = db.query(Pedido).options(selectinload(Pedido.items)).all()
    pagados = [p for p in todos if p.estado == APROBADO]
    ahora = datetime.now(timezone.utc)

    ingresos_total = round(sum(p.total for p in pagados), 2)
    ingresos_mes = round(
        sum(
            p.total
            for p in pagados
            if p.pagado_en
            and p.pagado_en.year == ahora.year
            and p.pagado_en.month == ahora.month
        ),
        2,
    )

    unidades = Counter()
    for p in pagados:
        for item in p.items:
            unidades[item.titulo] += item.cantidad

    resumen = {
        "ingresos_total": ingresos_total,
        "ingresos_mes": ingresos_mes,
        "pagados": len(pagados),
        "pendientes": sum(1 for p in todos if p.estado == PENDIENTE),
        "rechazados": sum(1 for p in todos if p.estado == RECHAZADO),
        "cancelados": sum(1 for p in todos if p.estado == CANCELADO),
        "ticket_promedio": (
            round(ingresos_total / len(pagados), 2) if pagados else 0
        ),
        "mas_vendidos": [
            {"titulo": titulo, "cantidad": cantidad}
            for titulo, cantidad in unidades.most_common(5)
        ],
    }

    # ---- Listado filtrado ----
    consulta = (
        db.query(Pedido, Usuario)
        .outerjoin(Usuario, Usuario.id == Pedido.usuario_id)
        .options(selectinload(Pedido.items))
    )

    if estado:
        consulta = consulta.filter(Pedido.estado == estados[estado])

    termino = (buscar or "").strip()
    if termino:
        condiciones = [
            Usuario.nombre.ilike(f"%{termino}%"),
            Usuario.email.ilike(f"%{termino}%"),
        ]
        if termino.isdigit():
            condiciones.append(Pedido.id == int(termino))
        consulta = consulta.filter(or_(*condiciones))

    filas = consulta.order_by(Pedido.id.desc()).limit(200).all()

    return {
        "resumen": resumen,
        "pedidos": [_serializar_venta(p, u) for p, u in filas],
    }


# IMPORTANTE: esta ruta debe ir ANTES de "/{pedido_id}", si no FastAPI
# intentaría interpretar "mis-compras" como un número de pedido.
@router.get("/mis-compras")
def listar_mis_compras(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Historial de compras del cliente autenticado (más recientes primero)."""
    pedidos = (
        db.query(Pedido)
        .filter(Pedido.usuario_id == usuario.id)
        .order_by(Pedido.id.desc())
        .all()
    )
    return [_serializar_compra(p) for p in pedidos]


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
        pedido = sincronizar_pago(db, pedido.id, pago) or pedido

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
