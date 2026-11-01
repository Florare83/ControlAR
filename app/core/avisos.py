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

from app.core import reservas_reglas, suscripciones
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


# --------------------------------------------------------- olvidé mi contraseña

def correo_recuperar_contrasena(usuario, token: str) -> Correo:
    """Enlace para elegir una contraseña nueva (vale 1 hora y se usa una sola vez)."""
    cuerpo = "\n".join(
        [
            _saludo(usuario),
            "",
            "Recibimos un pedido para elegir una contraseña nueva en El Rincón de Hermes.",
            "Para hacerlo, entrá a este enlace (vale 1 hora y se puede usar una sola vez):",
            "",
            f"{_frontend()}/restablecer?token={token}",
            "",
            "Si no lo pediste vos, ignorá este mensaje: tu contraseña sigue igual.",
            "",
            _FIRMA,
        ]
    )
    return usuario.email, "Elegí una contraseña nueva", cuerpo


# ------------------------------------------------------------------- novedades
# Correos para quienes se suscribieron a las novedades. Cada uno lleva su propio enlace
# de baja, por eso se arma un correo por persona (no un mismo mensaje para todos).

def _pie_novedades(usuario) -> str:
    return (
        "\n\n--\n"
        "Recibís este correo porque te suscribiste a las novedades de El Rincón de Hermes.\n"
        f"Para dejar de recibirlos: {_frontend()}/baja?token={suscripciones.token_baja(usuario.id)}\n"
        f"También podés cambiarlo en Mi cuenta > Novedades: {_frontend()}/cuenta/novedades"
    )


def _lineas_reservas(evento) -> list[str]:
    """Explica en el mismo mail del evento cómo reservar juegos (si el evento lo permite)."""
    if not evento.permite_reservas:
        return []

    cierre = reservas_reglas.cierre_reservas(evento)
    if cierre is not None and reservas_reglas.ahora() >= cierre:
        return ["", "Las reservas de juegos para este evento ya cerraron."]

    lineas = ["", "Ya se pueden reservar juegos para este evento."]
    if cierre is not None:
        lineas.append(
            f"Podés reservar hasta las {cierre.strftime('%H:%M')} h del {_fecha_larga(cierre.date())}."
        )
    lineas += [
        "Para reservar, entrá al catálogo, elegí un juego de la ludoteca y tocá Reservar. Tené en cuenta:",
        "  - Necesitás tener tu DNI cargado y verificado por un administrador (Mi cuenta > Editar DNI).",
        "  - Es una reserva por persona y por evento.",
        "  - El juego se entrega y se juega en el lugar: no sale del evento.",
    ]
    limite = reservas_reglas.limite_espera(evento)
    if limite is not None:
        lineas.append(
            f"  - Te lo guardamos hasta las {limite.strftime('%H:%M')} h del día del evento; "
            "después la reserva vence."
        )
    lineas.append(f"Reservar un juego: {_frontend()}/juegos")
    return lineas


def _fecha_evento(fecha, texto) -> str:
    if fecha:
        return _fecha_larga(fecha)
    return texto or "a confirmar"


def _hora_evento(hora_texto, hora_inicio) -> str:
    base = hora_texto or "a confirmar"
    if hora_inicio:
        return f"{base} (empieza {hora_inicio.strftime('%H:%M')})"
    return base


def _detalle_evento(evento) -> list[str]:
    return [
        f"{evento.tipo}: {evento.titulo}",
        f"Cuándo: {_cuando_evento(evento)}",
        f"Dónde: {evento.lugar} ({evento.direccion})",
    ]


def correo_nuevo_evento(usuario, evento) -> Correo:
    """Aviso de un evento nuevo del club (incluye cómo reservar juegos, si se puede)."""
    lineas = [
        _saludo(usuario),
        "",
        "¡Cargamos un nuevo evento en el club!",
        "",
        *_detalle_evento(evento),
    ]
    if evento.descripcion:
        lineas += ["", evento.descripcion]
    if evento.aporte:
        lineas.append(f"Aporte: {evento.aporte}")
    if evento.inscripcion:
        lineas.append("Requiere inscripción previa.")
    lineas += _lineas_reservas(evento)
    lineas += ["", "Más información:", f"{_frontend()}/club", "", _FIRMA]

    cuerpo = "\n".join(lineas) + _pie_novedades(usuario)
    return usuario.email, f"Nuevo evento: {evento.titulo}", cuerpo


# Campos del evento que, si cambian, justifican avisar.
def foto_evento(evento) -> dict:
    """Copia de los datos del evento que importan, para comparar antes y después de editarlo."""
    return {
        "titulo": evento.titulo,
        "fecha": evento.fecha,
        "fecha_texto": evento.fecha_texto,
        "hora_texto": evento.hora_texto,
        "hora_inicio": evento.hora_inicio,
        "lugar": evento.lugar,
        "direccion": evento.direccion,
    }


def cambios_de_evento(antes: dict, evento) -> list[str]:
    """Qué cambió de importante (nombre, fecha, horario, lugar). Vacío = nada que avisar."""
    cambios = []

    if antes["titulo"] != evento.titulo:
        cambios.append(f"Nombre: {antes['titulo']} → {evento.titulo}")

    if (antes["fecha"], antes["fecha_texto"]) != (evento.fecha, evento.fecha_texto):
        cambios.append(
            f"Fecha: {_fecha_evento(antes['fecha'], antes['fecha_texto'])} → "
            f"{_fecha_evento(evento.fecha, evento.fecha_texto)}"
        )

    if (antes["hora_texto"], antes["hora_inicio"]) != (evento.hora_texto, evento.hora_inicio):
        cambios.append(
            f"Horario: {_hora_evento(antes['hora_texto'], antes['hora_inicio'])} → "
            f"{_hora_evento(evento.hora_texto, evento.hora_inicio)}"
        )

    if (antes["lugar"], antes["direccion"]) != (evento.lugar, evento.direccion):
        cambios.append(
            f"Lugar: {antes['lugar']} ({antes['direccion']}) → {evento.lugar} ({evento.direccion})"
        )

    return cambios


def correo_evento_modificado(usuario, evento, cambios: list[str], con_reserva: bool = False) -> Correo:
    """Aviso de que un evento cambió de fecha, horario o lugar. También le llega a quien tiene
    una reserva activa para ese evento, aunque no esté suscripto."""
    lineas = [
        _saludo(usuario),
        "",
        "Hubo cambios en un evento del club.",
        "",
        "Qué cambió:",
        *[f"  - {cambio}" for cambio in cambios],
        "",
        "Cómo queda:",
        *_detalle_evento(evento),
    ]
    if con_reserva:
        lineas += [
            "",
            "Tenés una reserva de juego para este evento. Si con el cambio ya no podés ir, "
            "cancelala desde Mis reservas para que otra persona pueda usar el juego:",
            f"{_frontend()}/mis-reservas",
        ]
    lineas += ["", "Más información:", f"{_frontend()}/club", "", _FIRMA]

    cuerpo = "\n".join(lineas)
    if usuario.suscrito_novedades:
        cuerpo += _pie_novedades(usuario)
    else:
        cuerpo += "\n\n--\nTe escribimos porque tenés una reserva activa para este evento."
    return usuario.email, f"Cambios en el evento: {evento.titulo}", cuerpo


def correo_evento_cancelado(usuario, evento) -> Correo:
    """Aviso de que un evento próximo se canceló (solo a suscriptores: un evento con
    reservas no se puede eliminar, así que no hay reservas que avisar)."""
    lineas = [
        _saludo(usuario),
        "",
        "Lamentablemente cancelamos un evento del club:",
        "",
        *_detalle_evento(evento),
        "",
        "Si sale una nueva fecha te vamos a avisar. Mientras tanto, mirá los próximos eventos:",
        f"{_frontend()}/club",
        "",
        _FIRMA,
    ]
    cuerpo = "\n".join(lineas) + _pie_novedades(usuario)
    return usuario.email, f"Evento cancelado: {evento.titulo}", cuerpo


def correo_nuevo_juego(usuario, juego) -> Correo:
    """Aviso de un juego nuevo en el catálogo."""
    lineas = [
        _saludo(usuario),
        "",
        "¡Sumamos un juego nuevo al catálogo!",
        "",
        juego.titulo,
    ]
    if juego.editorial:
        lineas.append(f"Editorial: {juego.editorial}")
    if juego.categoria is not None:
        lineas.append(f"Categoría: {juego.categoria.nombre}")
    lineas += [
        f"Jugadores: {juego.cantidad_jugadores}",
        f"Duración: {juego.duracion_minutos} min",
        f"Edad mínima: {juego.edad_minima}+",
    ]
    if juego.en_venta:
        lineas += ["", f"Está a la venta: {_dinero(juego.precio)}."]
    if juego.se_presta:
        lineas += ["", "Lo vas a poder reservar y jugar en nuestros eventos."]
    lineas += ["", "Verlo en el catálogo:", f"{_frontend()}/juegos", "", _FIRMA]

    cuerpo = "\n".join(lineas) + _pie_novedades(usuario)
    return usuario.email, f"Nuevo juego: {juego.titulo}", cuerpo


# Máximo de renglones por sección del resumen (el resto se resuelve con el enlace al catálogo).
_MAX_RESUMEN = 15


def _renglon_juego(juego) -> str:
    datos = [juego.cantidad_jugadores + " jugadores", f"{juego.duracion_minutos} min"]
    if juego.categoria is not None:
        datos.insert(0, juego.categoria.nombre)
    texto = f"  - {juego.titulo} ({', '.join(datos)})"
    if juego.en_venta:
        texto += f" — a la venta: {_dinero(juego.precio)}"
    return texto


def correo_resumen(usuario, eventos, juegos_nuevos, favoritos) -> Correo:
    """Resumen de novedades: próximos eventos, juegos nuevos y, para cada persona, sus
    favoritos que ya están a la venta (o volvieron a tener stock). Solo trae las secciones
    que tienen algo."""
    lineas = [_saludo(usuario), "", "Te resumimos lo que hay de nuevo en el club."]

    if eventos:
        lineas += ["", "PRÓXIMOS EVENTOS"]
        for evento in eventos[:_MAX_RESUMEN]:
            lineas.append(
                f"  - {evento.titulo} · {_cuando_evento(evento)} · {evento.lugar} ({evento.direccion})"
            )
            cierre = reservas_reglas.cierre_reservas(evento)
            if evento.permite_reservas and (cierre is None or reservas_reglas.ahora() < cierre):
                hasta = (
                    f" hasta las {cierre.strftime('%H:%M')} h del {_fecha_larga(cierre.date())}"
                    if cierre
                    else ""
                )
                lineas.append(f"    Reservas de juegos abiertas{hasta}.")
        lineas += ["", f"Eventos: {_frontend()}/club"]

    if juegos_nuevos:
        lineas += ["", "JUEGOS NUEVOS"]
        lineas += [_renglon_juego(j) for j in juegos_nuevos[:_MAX_RESUMEN]]
        if len(juegos_nuevos) > _MAX_RESUMEN:
            lineas.append(f"  ...y {len(juegos_nuevos) - _MAX_RESUMEN} más.")
        lineas += ["", f"Catálogo: {_frontend()}/juegos"]

    if favoritos:
        lineas += [
            "",
            "TUS FAVORITOS",
            "Estos juegos que marcaste como favoritos ya están a la venta o volvieron a tener stock:",
        ]
        lineas += [f"  - {j.titulo}: {_dinero(j.precio)}" for j in favoritos]
        lineas += ["", f"Tienda: {_frontend()}/juegos"]

    lineas += ["", _FIRMA]
    cuerpo = "\n".join(lineas) + _pie_novedades(usuario)
    return usuario.email, "Las novedades de El Rincón de Hermes", cuerpo


def avisar_novedad(db, tareas, armar, objeto, usuarios=None) -> int:
    """Arma un correo por persona ahora (con la sesión abierta) y programa el envío en
    segundo plano. `armar(usuario, objeto)` devuelve el correo. Por defecto le avisa a todos
    los suscriptores; `usuarios` permite elegir otra lista. Devuelve a cuántas personas."""
    if usuarios is None:
        usuarios = suscripciones.suscriptores(db)
    correos = [armar(usuario, objeto) for usuario in usuarios]
    if correos:
        tareas.add_task(enviar_avisos, correos)
    return len(correos)


# ---------------------------------------------------------------------- envío

def enviar_aviso(destinatario: str, asunto: str, cuerpo: str) -> None:
    """Envía el correo sin dejar que un error se propague (se usa en segundo plano)."""
    try:
        enviar_correo(destinatario, asunto, cuerpo)
    except Exception as e:  # noqa: BLE001 - un correo fallido no debe romper nada
        detalle = getattr(e, "detail", None) or repr(e)
        log.warning("Aviso por correo no enviado (%s): %s", asunto, detalle)


def enviar_avisos(correos: list[Correo]) -> None:
    """Envía varios correos uno por uno; si uno falla, los demás igual salen."""
    for correo in correos:
        enviar_aviso(*correo)
