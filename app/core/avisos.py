# Correos automáticos para el cliente: reserva, pedido y compra.
#
# Cómo se usa: en el endpoint se ARMA el correo con una función correo_*() mientras la
# sesión de la base sigue abierta (devuelve texto plano, sin objetos de la base) y se
# ENVÍA en segundo plano con enviar_aviso(), para no demorar la respuesta.
#
#     correo = avisos.correo_reserva(usuario, reserva)
#     tareas.add_task(avisos.enviar_aviso, *correo)
#
# Un fallo de correo (sin configurar, Brevo caído, etc.) se registra en el log pero NUNCA
# rompe la operación: la reserva o el pedido ya quedaron guardados.
import logging
import os
from datetime import date

from app.core.correo import enviar_correo
from app.core.reservas_reglas import limite_espera

log = logging.getLogger("uvicorn.error")

_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
_MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

Correo = tuple[str, str, str]  # (destinatario, asunto, cuerpo)


def _frontend() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def _fecha_larga(dia: date) -> str:
    return f"{_DIAS[dia.weekday()]} {dia.day} de {_MESES[dia.month - 1]}"


def _dinero(valor: float) -> str:
    # 12345.5 -> "$12.345,50" (formato argentino)
    texto = f"{float(valor):,.2f}"
    return "$" + texto.replace(",", "X").replace(".", ",").replace("X", ".")


def _primer_nombre(usuario) -> str:
    partes = (usuario.nombre or "").split()
    return partes[0] if partes else ""


def _saludo(usuario) -> str:
    nombre = _primer_nombre(usuario)
    return f"¡Hola {nombre}!" if nombre else "¡Hola!"


def _detalle_pedido(pedido) -> str:
    lineas = []
    for item in pedido.items:
        subtotal = round(item.precio_unitario * item.cantidad, 2)
        lineas.append(f"  - {item.titulo} × {item.cantidad}: {_dinero(subtotal)}")
    lineas.append(f"  Total: {_dinero(pedido.total)}")
    return "\n".join(lineas)


_FIRMA = "El Rincón de Hermes"


# --------------------------------------------------------------------- reserva

def correo_reserva(usuario, reserva) -> Correo:
    """Confirmación de una reserva de juego para un evento."""
    evento = reserva.evento
    juego = reserva.juego

    cuando = []
    if evento.fecha:
        cuando.append(_fecha_larga(evento.fecha))
    if evento.hora_texto:
        cuando.append(evento.hora_texto)
    cuando_texto = " · ".join(cuando) if cuando else "a confirmar"

    limite = limite_espera(evento)
    aviso_espera = (
        f"Te guardamos el juego hasta las {limite.strftime('%H:%M')} h del día del evento; "
        "pasado ese horario la reserva vence y el juego queda libre para otras personas.\n\n"
        if limite
        else ""
    )

    cuerpo = (
        f"{_saludo(usuario)}\n\n"
        "Tu reserva quedó confirmada.\n\n"
        f"Juego: {juego.titulo}\n"
        f"Evento: {evento.titulo}\n"
        f"Cuándo: {cuando_texto}\n"
        f"Dónde: {evento.lugar} ({evento.direccion})\n"
        f"N.º de reserva: {reserva.id}\n\n"
        f"{aviso_espera}"
        "El juego se entrega en el lugar, durante el evento. "
        "Si ya no vas a ir, cancelá la reserva desde \"Mis reservas\" para que "
        "otra persona pueda usarlo:\n"
        f"{_frontend()}/mis-reservas\n\n"
        f"¡Te esperamos!\n{_FIRMA}"
    )
    return usuario.email, f"Reserva confirmada: {juego.titulo}", cuerpo


def _cuando_evento(evento) -> str:
    partes = []
    if evento.fecha:
        partes.append(_fecha_larga(evento.fecha))
    if evento.hora_texto:
        partes.append(evento.hora_texto)
    return " · ".join(partes) if partes else "a confirmar"


def correo_reserva_cancelada(usuario, reserva) -> Correo:
    """La persona canceló su reserva: se confirma que el juego quedó libre."""
    evento = reserva.evento
    juego = reserva.juego
    cuerpo = (
        f"{_saludo(usuario)}\n\n"
        "Cancelamos tu reserva, tal como lo pediste.\n\n"
        f"Juego: {juego.titulo}\n"
        f"Evento: {evento.titulo} ({_cuando_evento(evento)})\n"
        f"N.º de reserva: {reserva.id}\n\n"
        "El juego quedó libre para otras personas. Si todavía hay reservas "
        "abiertas, podés hacer una nueva desde el catálogo:\n"
        f"{_frontend()}/juegos\n\n"
        f"{_FIRMA}"
    )
    return usuario.email, f"Reserva cancelada: {juego.titulo}", cuerpo


def correo_reserva_vencida(usuario, reserva) -> Correo:
    """La reserva venció porque no se retiró dentro del tiempo de espera."""
    evento = reserva.evento
    juego = reserva.juego
    limite = limite_espera(evento)
    hasta = f"hasta las {limite.strftime('%H:%M')} h" if limite else "durante el tiempo de espera"
    cuerpo = (
        f"{_saludo(usuario)}\n\n"
        "Tu reserva venció: no retiraste el juego dentro del tiempo de espera.\n\n"
        f"Juego: {juego.titulo}\n"
        f"Evento: {evento.titulo} ({_cuando_evento(evento)})\n"
        f"N.º de reserva: {reserva.id}\n\n"
        f"Te lo guardamos {hasta} y, pasado ese horario, el juego queda libre "
        "para otras personas. Si todavía estás en el evento, consultanos: "
        "puede que podamos prestártelo igual.\n\n"
        f"{_FIRMA}"
    )
    return usuario.email, f"Tu reserva venció: {juego.titulo}", cuerpo


# ---------------------------------------------------------------------- pedido

def correo_pedido_efectivo(usuario, pedido) -> Correo:
    """Confirmación de un pedido que se paga en efectivo o por transferencia."""
    cuerpo = (
        f"{_saludo(usuario)}\n\n"
        f"Recibimos tu pedido #{pedido.id}. Quedó pendiente de pago.\n\n"
        f"{_detalle_pedido(pedido)}\n\n"
        "Elegiste pagar en efectivo o por transferencia: coordiná el pago con "
        "nosotros y, apenas lo acreditemos, te enviamos otro correo confirmando "
        "tu compra. Hasta ese momento no se reserva el stock.\n\n"
        "Podés ver el estado de tu pedido en \"Mis compras\":\n"
        f"{_frontend()}/mis-compras\n\n"
        f"Gracias por elegirnos.\n{_FIRMA}"
    )
    return usuario.email, f"Recibimos tu pedido #{pedido.id}", cuerpo


def correo_compra_confirmada(usuario, pedido) -> Correo:
    """Pago acreditado: se manda cuando el pedido pasa a pagado (Mercado Pago o
    confirmación manual del administrador en efectivo/transferencia)."""
    if pedido.forma_pago == "efectivo_transferencia":
        cierre = "Acreditamos tu pago en efectivo/transferencia."
    else:
        cierre = "Recibimos tu pago por Mercado Pago."

    cuerpo = (
        f"{_saludo(usuario)}\n\n"
        f"{cierre} ¡Tu compra #{pedido.id} está confirmada!\n\n"
        f"{_detalle_pedido(pedido)}\n\n"
        "Tené este correo a mano para retirar tus juegos. Cualquier duda, "
        "respondé desde la sección Contacto de la web.\n\n"
        "Ver mis compras:\n"
        f"{_frontend()}/mis-compras\n\n"
        f"¡Gracias por tu compra!\n{_FIRMA}"
    )
    return usuario.email, f"Compra confirmada #{pedido.id}", cuerpo


def correo_pedido_cancelado(usuario, pedido) -> Correo:
    """Un pedido en efectivo/transferencia que no se concretó fue cancelado."""
    cuerpo = (
        f"{_saludo(usuario)}\n\n"
        f"Cancelamos tu pedido #{pedido.id} porque el pago no se concretó.\n\n"
        f"{_detalle_pedido(pedido)}\n\n"
        "No se te cobró nada y no se descontó stock. Si todavía querés los "
        "juegos, podés hacer un pedido nuevo desde la tienda:\n"
        f"{_frontend()}/juegos\n\n"
        "Si creés que fue un error, escribinos desde la sección Contacto.\n\n"
        f"{_FIRMA}"
    )
    return usuario.email, f"Pedido #{pedido.id} cancelado", cuerpo


# ---------------------------------------------------------------------- envío

def enviar_aviso(destinatario: str, asunto: str, cuerpo: str) -> None:
    """Envía el correo sin dejar que un error se propague (se usa en segundo plano)."""
    try:
        enviar_correo(destinatario, asunto, cuerpo)
    except Exception as e:  # noqa: BLE001 - un correo fallido no debe romper nada
        detalle = getattr(e, "detail", None) or repr(e)
        log.warning("Aviso por correo no enviado (%s): %s", asunto, detalle)
