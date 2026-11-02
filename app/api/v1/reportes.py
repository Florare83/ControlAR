# Reportes para el administrador: préstamos, ventas, reservas y una tabla dinámica.
#
# Todos aceptan un período (desde / hasta, inclusive, en horario argentino) y, cuando se
# indican las dos fechas, devuelven también el período anterior de la misma duración para
# poder comparar. Las consultas traen solo las columnas necesarias (no objetos completos).
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.v1.auth.dependencies import require_admin
from app.core.db import get_db
from app.models.categoria import Categoria
from app.models.evento import Evento
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
from app.models.prestamo import ACTIVO, CERRADO, Prestamo
from app.models.reserva import ACTIVA, CANCELADA, ENTREGADA, VENCIDA, Reserva
from app.models.usuario import Usuario

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes"],
    dependencies=[Depends(require_admin)],
)

# Argentina no usa horario de verano: las fechas se leen en UTC-3.
ZONA_ARGENTINA = timezone(timedelta(hours=-3))

TOP = 10
MAX_DIAS_POR_DIA = 62  # hasta 62 días el gráfico va día por día; más que eso, mes por mes
MAX_MESES = 36
MAX_FILAS_TABLA = 200
MAX_COLUMNAS_TABLA = 20
DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
SIN_DATO = "Sin dato"


# ============================================================ utilidades de fechas

def _con_zona(fecha: datetime) -> datetime:
    """Algunas bases devuelven fechas sin zona horaria: se asume UTC."""
    return fecha if fecha.tzinfo else fecha.replace(tzinfo=timezone.utc)


def _dia(fecha: datetime) -> date:
    return _con_zona(fecha).astimezone(ZONA_ARGENTINA).date()


def _validar_periodo(desde: date | None, hasta: date | None) -> None:
    if desde and hasta and desde > hasta:
        raise HTTPException(
            status_code=422,
            detail="La fecha «Desde» no puede ser posterior a «Hasta»",
        )


def _limites(desde: date | None, hasta: date | None):
    """Convierte el período a instantes UTC: [inicio, fin). Cualquiera puede ser None."""
    inicio = fin = None
    if desde:
        inicio = datetime.combine(desde, time.min, tzinfo=ZONA_ARGENTINA).astimezone(timezone.utc)
    if hasta:
        fin = datetime.combine(
            hasta + timedelta(days=1), time.min, tzinfo=ZONA_ARGENTINA
        ).astimezone(timezone.utc)
    return inicio, fin


def _filtrar(consulta, columna, desde: date | None, hasta: date | None):
    inicio, fin = _limites(desde, hasta)
    if inicio is not None:
        consulta = consulta.filter(columna >= inicio)
    if fin is not None:
        consulta = consulta.filter(columna < fin)
    return consulta


def _periodo_anterior(desde: date | None, hasta: date | None):
    """Mismo largo, inmediatamente antes. Solo existe si el período tiene las dos fechas."""
    if not (desde and hasta):
        return None
    dias = (hasta - desde).days + 1
    fin = desde - timedelta(days=1)
    return fin - timedelta(days=dias - 1), fin


def _clave(dia: date, granularidad: str) -> str:
    return dia.isoformat() if granularidad == "dia" else dia.strftime("%Y-%m")


def _claves_serie(desde: date | None, hasta: date | None, dias_con_datos: list[date]):
    """Eje de tiempo del gráfico: día por día en períodos cortos, mes por mes en largos.
    Incluye los días sin movimiento (en cero) para que el gráfico no engañe."""
    inicio = desde or (min(dias_con_datos) if dias_con_datos else None)
    fin = hasta or (max(dias_con_datos) if dias_con_datos else None)
    if inicio is None or fin is None:
        return "dia", []

    if (fin - inicio).days + 1 <= MAX_DIAS_POR_DIA:
        return "dia", [(inicio + timedelta(days=i)).isoformat() for i in range((fin - inicio).days + 1)]

    claves, actual = [], inicio.replace(day=1)
    while actual <= fin:
        claves.append(actual.strftime("%Y-%m"))
        actual = (actual.replace(day=28) + timedelta(days=4)).replace(day=1)
    return "mes", claves[-MAX_MESES:]


def _categorias_de(db: Session, juego_ids) -> dict[int, str]:
    ids = {i for i in juego_ids if i is not None}
    if not ids:
        return {}
    filas = (
        db.query(Juego.id, Categoria.nombre)
        .join(Categoria, Categoria.id == Juego.categoria_id)
        .filter(Juego.id.in_(ids))
        .all()
    )
    return {juego_id: nombre for juego_id, nombre in filas}


def _eventos_por_dia(db: Session) -> dict[date, list[str]]:
    mapa: dict[date, list[str]] = defaultdict(list)
    for fecha, titulo in db.query(Evento.fecha, Evento.titulo).filter(Evento.fecha.isnot(None)).all():
        mapa[fecha].append(titulo)
    return mapa


# ================================================================= PRÉSTAMOS

def _cargar_prestamos(db: Session, desde: date | None, hasta: date | None) -> list[dict]:
    consulta = db.query(
        Prestamo.id,
        Prestamo.dni,
        Prestamo.nombre,
        Prestamo.telefono,
        Prestamo.sexo,
        Prestamo.estado,
        Prestamo.fecha_inicio,
        Prestamo.fecha_cierre,
        Prestamo.juego_id,
        Prestamo.titulo_juego,
    )
    consulta = _filtrar(consulta, Prestamo.fecha_inicio, desde, hasta)

    filas = []
    for p in consulta.all():
        duracion = None
        if p.estado == CERRADO and p.fecha_cierre is not None:
            duracion = (_con_zona(p.fecha_cierre) - _con_zona(p.fecha_inicio)).total_seconds() / 60
        filas.append(
            {
                "id": p.id,
                "dni": p.dni,
                "nombre": p.nombre,
                "telefono": p.telefono,
                "sexo": p.sexo,
                "estado": p.estado,
                "inicio": p.fecha_inicio,
                "dia": _dia(p.fecha_inicio),
                "duracion": duracion,
                "juego_id": p.juego_id,
                "juego": p.titulo_juego or "Juego no disponible",
            }
        )
    return filas


def _resumen_prestamos(filas: list[dict], hoy: date) -> dict:
    activos = [f for f in filas if f["estado"] == ACTIVO]
    duraciones = [f["duracion"] for f in filas if f["duracion"] is not None]
    return {
        "total": len(filas),
        "activos": len(activos),
        "devueltos": sum(1 for f in filas if f["estado"] == CERRADO),
        "sin_devolver": sum(1 for f in activos if f["dia"] < hoy),
        "personas": len({f["dni"] for f in filas}),
        # Minutos entre el retiro y la devolución (solo préstamos devueltos).
        "duracion_promedio_minutos": round(sum(duraciones) / len(duraciones)) if duraciones else None,
    }


@router.get("/prestamos")
def reporte_prestamos(
    desde: date | None = None,
    hasta: date | None = None,
    db: Session = Depends(get_db),
):
    """Préstamos según la fecha de retiro: totales, evolución, juegos y categorías más
    prestados, perfil de las personas, movimiento por evento y pendientes de devolución."""
    _validar_periodo(desde, hasta)

    hoy = datetime.now(ZONA_ARGENTINA).date()
    filas = _cargar_prestamos(db, desde, hasta)
    resumen = _resumen_prestamos(filas, hoy)

    # Período anterior (para las flechas de variación).
    anterior = None
    previo = _periodo_anterior(desde, hasta)
    if previo:
        anterior = _resumen_prestamos(_cargar_prestamos(db, *previo), hoy)

    # Personas que ya habían retirado juegos antes del período vs. las que vienen por primera vez.
    if desde:
        inicio, _ = _limites(desde, None)
        dnis_antes = {
            d
            for (d,) in db.query(Prestamo.dni)
            .filter(Prestamo.fecha_inicio < inicio)
            .distinct()
            .all()
        }
        dnis = {f["dni"] for f in filas}
        resumen["personas_que_vuelven"] = len(dnis & dnis_antes)
        resumen["personas_nuevas"] = len(dnis - dnis_antes)
    else:
        resumen["personas_que_vuelven"] = None
        resumen["personas_nuevas"] = None

    # ---- Evolución en el tiempo
    granularidad, claves = _claves_serie(desde, hasta, [f["dia"] for f in filas])
    por_clave = {c: {"clave": c, "prestamos": 0, "_dnis": set()} for c in claves}
    for f in filas:
        punto = por_clave.get(_clave(f["dia"], granularidad))
        if punto is not None:
            punto["prestamos"] += 1
            punto["_dnis"].add(f["dni"])
    serie = [
        {"clave": p["clave"], "prestamos": p["prestamos"], "personas": len(p["_dnis"])}
        for p in por_clave.values()
    ]

    # ---- Juegos más prestados
    por_juego: dict = defaultdict(lambda: {"titulo": "", "cantidad": 0, "_dnis": set()})
    for f in filas:
        clave = f["juego_id"] if f["juego_id"] is not None else f"t:{f['juego']}"
        fila = por_juego[clave]
        fila["titulo"] = f["juego"]
        fila["cantidad"] += 1
        fila["_dnis"].add(f["dni"])
    juegos_mas_prestados = [
        {"titulo": j["titulo"], "cantidad": j["cantidad"], "personas": len(j["_dnis"])}
        for j in sorted(por_juego.values(), key=lambda j: (-j["cantidad"], j["titulo"].lower()))[:TOP]
    ]

    # ---- Categorías, día de la semana y sexo
    categorias = _categorias_de(db, (f["juego_id"] for f in filas))
    por_categoria = Counter(categorias.get(f["juego_id"], "Sin categoría") for f in filas)
    por_dia_semana = Counter(f["dia"].weekday() for f in filas)
    por_sexo = Counter(f["sexo"] or SIN_DATO for f in filas)

    # ---- Movimiento por día (y evento de ese día, si lo hubo)
    por_dia: dict = defaultdict(lambda: {"cantidad": 0, "dnis": set()})
    for f in filas:
        por_dia[f["dia"]]["cantidad"] += 1
        por_dia[f["dia"]]["dnis"].add(f["dni"])
    dias = sorted(por_dia.keys(), reverse=True)[:30]
    eventos = _eventos_por_dia(db)
    por_evento = [
        {
            "fecha": d.isoformat(),
            "evento": " / ".join(eventos.get(d, [])) or None,
            "cantidad": por_dia[d]["cantidad"],
            "personas": len(por_dia[d]["dnis"]),
        }
        for d in dias
    ]

    # ---- Juegos de la ludoteca que no salieron nunca en el período
    prestados_ids = {f["juego_id"] for f in filas if f["juego_id"] is not None}
    ludoteca = db.query(Juego.id, Juego.titulo).filter(Juego.se_presta.is_(True)).all()
    sin_movimiento = sorted(t for i, t in ludoteca if i not in prestados_ids)

    # ---- Pendientes de devolución (siempre al día de hoy, sin filtro de fechas)
    pendientes = []
    for p in (
        db.query(
            Prestamo.id, Prestamo.nombre, Prestamo.dni, Prestamo.telefono,
            Prestamo.titulo_juego, Prestamo.fecha_inicio,
        )
        .filter(Prestamo.estado == ACTIVO)
        .order_by(Prestamo.fecha_inicio.asc())
        .all()
    ):
        dias_fuera = (hoy - _dia(p.fecha_inicio)).days
        if dias_fuera >= 1:
            pendientes.append(
                {
                    "id": p.id,
                    "nombre": p.nombre,
                    "dni": p.dni,
                    "telefono": p.telefono,
                    "titulo": p.titulo_juego or "Juego no disponible",
                    "desde": _dia(p.fecha_inicio).isoformat(),
                    "dias": dias_fuera,
                }
            )

    return {
        "resumen": resumen,
        "anterior": anterior,
        "granularidad": granularidad,
        "serie": serie,
        "juegos_mas_prestados": juegos_mas_prestados,
        "por_categoria": [{"nombre": n, "cantidad": c} for n, c in por_categoria.most_common()],
        "por_dia_semana": [
            {"dia": DIAS_SEMANA[i], "cantidad": por_dia_semana.get(i, 0)} for i in range(7)
        ],
        "por_sexo": [{"nombre": n, "cantidad": c} for n, c in por_sexo.most_common()],
        "por_evento": por_evento,
        "sin_movimiento": {
            "cantidad": len(sin_movimiento),
            "total_ludoteca": len(ludoteca),
            "ejemplos": sin_movimiento[:TOP],
        },
        "pendientes": {"total": len(pendientes), "items": pendientes[:20]},
    }


# =================================================================== VENTAS

def _fecha_pedido(p) -> datetime:
    """Un pedido pagado cuenta el día que se pagó; el resto, el día que se creó."""
    return p.pagado_en if (p.estado == APROBADO and p.pagado_en) else p.creado_en


def _cargar_pedidos(db: Session, desde: date | None, hasta: date | None) -> list[dict]:
    inicio, fin = _limites(desde, hasta)
    consulta = db.query(
        Pedido.id,
        Pedido.usuario_id,
        Pedido.total,
        Pedido.estado,
        Pedido.forma_pago,
        Pedido.creado_en,
        Pedido.pagado_en,
    )
    filas = []
    for p in consulta.all():
        momento = _con_zona(_fecha_pedido(p))
        if (inicio is not None and momento < inicio) or (fin is not None and momento >= fin):
            continue
        filas.append(
            {
                "id": p.id,
                "usuario_id": p.usuario_id,
                "total": float(p.total or 0),
                "estado": p.estado,
                "forma_pago": p.forma_pago,
                "dia": _dia(momento),
            }
        )
    return filas


def _resumen_ventas(pedidos: list[dict], items: list[dict]) -> dict:
    pagados = [p for p in pedidos if p["estado"] == APROBADO]
    ingresos = round(sum(p["total"] for p in pagados), 2)
    cerrados = len(pagados) + sum(1 for p in pedidos if p["estado"] in (RECHAZADO, CANCELADO))
    return {
        "ingresos": ingresos,
        "pedidos_pagados": len(pagados),
        "unidades": sum(i["cantidad"] for i in items),
        "ticket_promedio": round(ingresos / len(pagados), 2) if pagados else 0,
        "compradores": len({p["usuario_id"] for p in pagados}),
        "pendientes": sum(1 for p in pedidos if p["estado"] == PENDIENTE),
        "rechazados": sum(1 for p in pedidos if p["estado"] == RECHAZADO),
        "cancelados": sum(1 for p in pedidos if p["estado"] == CANCELADO),
        # De los pedidos que ya se resolvieron (pagados + rechazados + cancelados): cuántos se pagaron.
        "tasa_pago": round(100 * len(pagados) / cerrados) if cerrados else None,
    }


def _cargar_items_pagados(db: Session, pedidos: list[dict]) -> list[dict]:
    pagados = {p["id"]: p for p in pedidos if p["estado"] == APROBADO}
    if not pagados:
        return []
    items = []
    filas = (
        db.query(
            PedidoItem.pedido_id,
            PedidoItem.juego_id,
            PedidoItem.titulo,
            PedidoItem.precio_unitario,
            PedidoItem.cantidad,
        )
        .filter(PedidoItem.pedido_id.in_(list(pagados)))
        .all()
    )
    for fila in filas:
        pedido = pagados[fila.pedido_id]
        items.append(
            {
                "pedido_id": fila.pedido_id,
                "usuario_id": pedido["usuario_id"],
                "forma_pago": pedido["forma_pago"],
                "dia": pedido["dia"],
                "juego_id": fila.juego_id,
                "juego": fila.titulo,
                "cantidad": int(fila.cantidad),
                "subtotal": round(float(fila.precio_unitario) * int(fila.cantidad), 2),
            }
        )
    return items


@router.get("/ventas")
def reporte_ventas(
    desde: date | None = None,
    hasta: date | None = None,
    db: Session = Depends(get_db),
):
    """Ventas de la tienda. Los pedidos pagados cuentan el día del pago; los demás, el día
    en que se crearon. Los ingresos y los rankings salen solo de pedidos pagados."""
    _validar_periodo(desde, hasta)

    pedidos = _cargar_pedidos(db, desde, hasta)
    items = _cargar_items_pagados(db, pedidos)
    resumen = _resumen_ventas(pedidos, items)

    anterior = None
    previo = _periodo_anterior(desde, hasta)
    if previo:
        pedidos_previos = _cargar_pedidos(db, *previo)
        anterior = _resumen_ventas(pedidos_previos, _cargar_items_pagados(db, pedidos_previos))

    # ---- Evolución
    pagados = [p for p in pedidos if p["estado"] == APROBADO]
    granularidad, claves = _claves_serie(desde, hasta, [p["dia"] for p in pagados])
    por_clave = {c: {"clave": c, "ingresos": 0.0, "pedidos": 0, "unidades": 0} for c in claves}
    for p in pagados:
        punto = por_clave.get(_clave(p["dia"], granularidad))
        if punto is not None:
            punto["ingresos"] = round(punto["ingresos"] + p["total"], 2)
            punto["pedidos"] += 1
    for i in items:
        punto = por_clave.get(_clave(i["dia"], granularidad))
        if punto is not None:
            punto["unidades"] += i["cantidad"]

    # ---- Rankings
    por_juego: dict = defaultdict(lambda: {"titulo": "", "unidades": 0, "ingresos": 0.0})
    for i in items:
        clave = i["juego_id"] if i["juego_id"] is not None else f"t:{i['juego']}"
        fila = por_juego[clave]
        fila["titulo"] = i["juego"]
        fila["unidades"] += i["cantidad"]
        fila["ingresos"] = round(fila["ingresos"] + i["subtotal"], 2)
    mas_vendidos = sorted(
        por_juego.values(), key=lambda j: (-j["unidades"], -j["ingresos"], j["titulo"].lower())
    )[:TOP]

    categorias = _categorias_de(db, (i["juego_id"] for i in items))
    por_categoria: dict = defaultdict(float)
    for i in items:
        por_categoria[categorias.get(i["juego_id"], "Sin categoría")] += i["subtotal"]

    por_forma: dict = defaultdict(lambda: {"pedidos": 0, "ingresos": 0.0})
    for p in pagados:
        por_forma[p["forma_pago"]]["pedidos"] += 1
        por_forma[p["forma_pago"]]["ingresos"] = round(por_forma[p["forma_pago"]]["ingresos"] + p["total"], 2)

    por_dia_semana = defaultdict(lambda: {"pedidos": 0, "ingresos": 0.0})
    for p in pagados:
        dia = p["dia"].weekday()
        por_dia_semana[dia]["pedidos"] += 1
        por_dia_semana[dia]["ingresos"] = round(por_dia_semana[dia]["ingresos"] + p["total"], 2)

    por_estado = Counter(p["estado"] for p in pedidos)

    # ---- Stock bajo (de hoy, no depende del período)
    stock_bajo = [
        {"titulo": titulo, "stock": stock}
        for titulo, stock in db.query(Juego.titulo, Juego.stock)
        .filter(Juego.en_venta.is_(True), Juego.stock <= 2)
        .order_by(Juego.stock.asc(), Juego.titulo.asc())
        .limit(TOP)
        .all()
    ]

    return {
        "resumen": resumen,
        "anterior": anterior,
        "granularidad": granularidad,
        "serie": list(por_clave.values()),
        "mas_vendidos": mas_vendidos,
        "por_categoria": [
            {"nombre": n, "ingresos": round(v, 2)}
            for n, v in sorted(por_categoria.items(), key=lambda kv: -kv[1])
        ],
        "por_forma_pago": [
            {"forma": f, "pedidos": v["pedidos"], "ingresos": v["ingresos"]}
            for f, v in sorted(por_forma.items(), key=lambda kv: -kv[1]["ingresos"])
        ],
        "por_dia_semana": [
            {
                "dia": DIAS_SEMANA[i],
                "pedidos": por_dia_semana[i]["pedidos"] if i in por_dia_semana else 0,
                "ingresos": por_dia_semana[i]["ingresos"] if i in por_dia_semana else 0,
            }
            for i in range(7)
        ],
        "por_estado": [{"estado": e, "cantidad": c} for e, c in por_estado.most_common()],
        "stock_bajo": stock_bajo,
    }


# ================================================================= RESERVAS

def _cargar_reservas(db: Session, desde: date | None, hasta: date | None) -> list[dict]:
    consulta = (
        db.query(
            Reserva.id,
            Reserva.usuario_id,
            Reserva.evento_id,
            Reserva.juego_id,
            Reserva.estado,
            Reserva.creada_en,
            Evento.titulo.label("evento"),
            Evento.fecha.label("evento_fecha"),
            Juego.titulo.label("juego"),
        )
        .join(Evento, Evento.id == Reserva.evento_id)
        .join(Juego, Juego.id == Reserva.juego_id)
    )
    consulta = _filtrar(consulta, Reserva.creada_en, desde, hasta)
    return [
        {
            "id": r.id,
            "usuario_id": r.usuario_id,
            "evento_id": r.evento_id,
            "evento": r.evento,
            "evento_fecha": r.evento_fecha,
            "juego_id": r.juego_id,
            "juego": r.juego,
            "estado": r.estado,
            "dia": _dia(r.creada_en),
        }
        for r in consulta.all()
    ]


def _resumen_reservas(filas: list[dict]) -> dict:
    por_estado = Counter(f["estado"] for f in filas)
    retiradas, vencidas = por_estado[ENTREGADA], por_estado[VENCIDA]
    return {
        "total": len(filas),
        "activas": por_estado[ACTIVA],
        "entregadas": retiradas,
        "vencidas": vencidas,
        "canceladas": por_estado[CANCELADA],
        "personas": len({f["usuario_id"] for f in filas}),
        # De las reservas que ya terminaron sin cancelarse: cuántas terminaron en un retiro.
        "tasa_retiro": round(100 * retiradas / (retiradas + vencidas)) if (retiradas + vencidas) else None,
    }


@router.get("/reservas")
def reporte_reservas(
    desde: date | None = None,
    hasta: date | None = None,
    db: Session = Depends(get_db),
):
    """Reservas según el día en que se hicieron: cuántas se retiraron, vencieron o se cancelaron."""
    _validar_periodo(desde, hasta)

    filas = _cargar_reservas(db, desde, hasta)
    resumen = _resumen_reservas(filas)

    anterior = None
    previo = _periodo_anterior(desde, hasta)
    if previo:
        anterior = _resumen_reservas(_cargar_reservas(db, *previo))

    granularidad, claves = _claves_serie(desde, hasta, [f["dia"] for f in filas])
    por_clave = {c: {"clave": c, "reservas": 0} for c in claves}
    for f in filas:
        punto = por_clave.get(_clave(f["dia"], granularidad))
        if punto is not None:
            punto["reservas"] += 1

    por_evento: dict = {}
    for f in filas:
        e = por_evento.setdefault(
            f["evento_id"],
            {
                "evento": f["evento"],
                "fecha": f["evento_fecha"].isoformat() if f["evento_fecha"] else None,
                "reservas": 0,
                "entregadas": 0,
                "vencidas": 0,
                "canceladas": 0,
                "activas": 0,
            },
        )
        e["reservas"] += 1
        clave = {ENTREGADA: "entregadas", VENCIDA: "vencidas", CANCELADA: "canceladas", ACTIVA: "activas"}[f["estado"]]
        e[clave] += 1

    eventos = sorted(por_evento.values(), key=lambda e: (e["fecha"] or "", e["evento"]), reverse=True)[:20]

    por_juego = Counter((f["juego_id"], f["juego"]) for f in filas)
    juegos = [
        {"titulo": titulo, "cantidad": cantidad}
        for (_, titulo), cantidad in sorted(por_juego.items(), key=lambda kv: (-kv[1], kv[0][1].lower()))[:TOP]
    ]

    return {
        "resumen": resumen,
        "anterior": anterior,
        "granularidad": granularidad,
        "serie": list(por_clave.values()),
        "por_estado": [
            {"estado": e, "cantidad": resumen[k]}
            for e, k in (
                (ENTREGADA, "entregadas"),
                (VENCIDA, "vencidas"),
                (CANCELADA, "canceladas"),
                (ACTIVA, "activas"),
            )
        ],
        "por_evento": eventos,
        "juegos_mas_reservados": juegos,
    }


# ======================================================= TABLA DINÁMICA

def _texto_estado_prestamo(valor: str) -> str:
    return "Devuelto" if valor == CERRADO else "En préstamo"


def _texto_forma_pago(valor: str) -> str:
    return {
        MERCADO_PAGO: "Mercado Pago",
        EFECTIVO_TRANSFERENCIA: "Efectivo / transferencia",
    }.get(valor, valor)


def _texto_estado_reserva(valor: str) -> str:
    return {ENTREGADA: "Retirada", VENCIDA: "Vencida", CANCELADA: "Cancelada", ACTIVA: "Activa"}.get(valor, valor)


# Cada fuente declara sus dimensiones (por qué se puede agrupar) y medidas (qué se calcula).
# "tipo": "tiempo" se ordena cronológicamente, "semana" de lunes a domingo, el resto por total.
FUENTES = {
    "prestamos": {
        "titulo": "Préstamos",
        "dimensiones": {
            "juego": ("Juego", "texto"),
            "categoria": ("Categoría", "texto"),
            "mes": ("Mes", "tiempo"),
            "fecha": ("Día", "tiempo"),
            "dia_semana": ("Día de la semana", "semana"),
            "evento": ("Evento", "texto"),
            "persona": ("Persona", "texto"),
            "sexo": ("Sexo", "texto"),
            "estado": ("Estado", "texto"),
        },
        "medidas": {
            "cantidad": ("Cantidad de préstamos", "numero"),
            "personas": ("Personas distintas", "numero"),
            "duracion_promedio": ("Duración promedio (min)", "numero"),
        },
    },
    "ventas": {
        "titulo": "Ventas (pedidos pagados)",
        "dimensiones": {
            "juego": ("Juego", "texto"),
            "categoria": ("Categoría", "texto"),
            "mes": ("Mes", "tiempo"),
            "fecha": ("Día", "tiempo"),
            "dia_semana": ("Día de la semana", "semana"),
            "forma_pago": ("Forma de pago", "texto"),
            "cliente": ("Cliente", "texto"),
        },
        "medidas": {
            "ingresos": ("Ingresos ($)", "dinero"),
            "unidades": ("Unidades vendidas", "numero"),
            "pedidos": ("Cantidad de pedidos", "numero"),
        },
    },
    "reservas": {
        "titulo": "Reservas",
        "dimensiones": {
            "juego": ("Juego", "texto"),
            "categoria": ("Categoría", "texto"),
            "mes": ("Mes", "tiempo"),
            "fecha": ("Día", "tiempo"),
            "dia_semana": ("Día de la semana", "semana"),
            "evento": ("Evento", "texto"),
            "persona": ("Persona", "texto"),
            "estado": ("Estado", "texto"),
        },
        "medidas": {
            "cantidad": ("Cantidad de reservas", "numero"),
            "personas": ("Personas distintas", "numero"),
        },
    },
}


def _dimensiones_comunes(dia: date) -> dict:
    return {
        "mes": dia.strftime("%Y-%m"),
        "fecha": dia.isoformat(),
        "dia_semana": DIAS_SEMANA[dia.weekday()],
    }


def _filas_tabla_prestamos(db, desde, hasta) -> list[dict]:
    filas = _cargar_prestamos(db, desde, hasta)
    categorias = _categorias_de(db, (f["juego_id"] for f in filas))
    eventos = _eventos_por_dia(db)
    return [
        {
            **_dimensiones_comunes(f["dia"]),
            "juego": f["juego"],
            "categoria": categorias.get(f["juego_id"], "Sin categoría"),
            "evento": " / ".join(eventos.get(f["dia"], [])) or "Sin evento cargado",
            "persona": f["nombre"],
            "sexo": f["sexo"] or SIN_DATO,
            "estado": _texto_estado_prestamo(f["estado"]),
            "_dni": f["dni"],
            "_duracion": f["duracion"],
        }
        for f in filas
    ]


def _filas_tabla_ventas(db, desde, hasta) -> list[dict]:
    pedidos = _cargar_pedidos(db, desde, hasta)
    items = _cargar_items_pagados(db, pedidos)
    categorias = _categorias_de(db, (i["juego_id"] for i in items))
    usuarios = {}
    ids = {i["usuario_id"] for i in items}
    if ids:
        usuarios = dict(db.query(Usuario.id, Usuario.nombre).filter(Usuario.id.in_(ids)).all())
    return [
        {
            **_dimensiones_comunes(i["dia"]),
            "juego": i["juego"],
            "categoria": categorias.get(i["juego_id"], "Sin categoría"),
            "forma_pago": _texto_forma_pago(i["forma_pago"]),
            "cliente": usuarios.get(i["usuario_id"], SIN_DATO),
            "_pedido": i["pedido_id"],
            "_cantidad": i["cantidad"],
            "_subtotal": i["subtotal"],
        }
        for i in items
    ]


def _filas_tabla_reservas(db, desde, hasta) -> list[dict]:
    filas = _cargar_reservas(db, desde, hasta)
    categorias = _categorias_de(db, (f["juego_id"] for f in filas))
    usuarios = {}
    ids = {f["usuario_id"] for f in filas}
    if ids:
        usuarios = dict(db.query(Usuario.id, Usuario.nombre).filter(Usuario.id.in_(ids)).all())
    return [
        {
            **_dimensiones_comunes(f["dia"]),
            "juego": f["juego"],
            "categoria": categorias.get(f["juego_id"], "Sin categoría"),
            "evento": f["evento"],
            "persona": usuarios.get(f["usuario_id"], SIN_DATO),
            "estado": _texto_estado_reserva(f["estado"]),
            "_usuario": f["usuario_id"],
        }
        for f in filas
    ]


def _promedio(valores):
    valores = [v for v in valores if v is not None]
    return round(sum(valores) / len(valores)) if valores else None


# medida -> función que calcula el valor de un conjunto de filas
MEDIDAS = {
    "prestamos": {
        "cantidad": lambda fs: len(fs),
        "personas": lambda fs: len({f["_dni"] for f in fs}),
        "duracion_promedio": lambda fs: _promedio(f["_duracion"] for f in fs),
    },
    "ventas": {
        "ingresos": lambda fs: round(sum(f["_subtotal"] for f in fs), 2),
        "unidades": lambda fs: sum(f["_cantidad"] for f in fs),
        "pedidos": lambda fs: len({f["_pedido"] for f in fs}),
    },
    "reservas": {
        "cantidad": lambda fs: len(fs),
        "personas": lambda fs: len({f["_usuario"] for f in fs}),
    },
}

CARGADORES = {
    "prestamos": _filas_tabla_prestamos,
    "ventas": _filas_tabla_ventas,
    "reservas": _filas_tabla_reservas,
}


@router.get("/tabla-dinamica/opciones")
def opciones_tabla_dinamica():
    """Qué se puede cruzar en la tabla dinámica, para armar los selectores."""
    return {
        fuente: {
            "titulo": datos["titulo"],
            "dimensiones": [
                {"valor": k, "nombre": nombre, "tipo": tipo}
                for k, (nombre, tipo) in datos["dimensiones"].items()
            ],
            "medidas": [
                {"valor": k, "nombre": nombre, "formato": formato}
                for k, (nombre, formato) in datos["medidas"].items()
            ],
        }
        for fuente, datos in FUENTES.items()
    }


def _ordenar_etiquetas(etiquetas, tipo: str, totales: dict):
    if tipo == "tiempo":
        return sorted(etiquetas)
    if tipo == "semana":
        return sorted(etiquetas, key=lambda e: DIAS_SEMANA.index(e) if e in DIAS_SEMANA else 99)
    return sorted(etiquetas, key=lambda e: (-(totales.get(e) or 0), str(e).lower()))


@router.get("/tabla-dinamica")
def tabla_dinamica(
    fuente: str = Query(...),
    filas: str = Query(...),
    medida: str = Query(...),
    columnas: str = Query(default=""),
    desde: date | None = None,
    hasta: date | None = None,
    db: Session = Depends(get_db),
):
    """Cruza los datos por una o dos dimensiones (filas y, opcional, columnas) y calcula una
    medida en cada celda, con totales por fila, por columna y general."""
    _validar_periodo(desde, hasta)

    if fuente not in FUENTES:
        raise HTTPException(status_code=422, detail="Fuente de datos inválida")
    definicion = FUENTES[fuente]
    if filas not in definicion["dimensiones"]:
        raise HTTPException(status_code=422, detail="Dimensión de filas inválida")
    if columnas and columnas not in definicion["dimensiones"]:
        raise HTTPException(status_code=422, detail="Dimensión de columnas inválida")
    if columnas and columnas == filas:
        raise HTTPException(status_code=422, detail="Las filas y las columnas deben ser distintas")
    if medida not in definicion["medidas"]:
        raise HTTPException(status_code=422, detail="Medida inválida")

    calcular = MEDIDAS[fuente][medida]
    datos = CARGADORES[fuente](db, desde, hasta)

    grupos_fila: dict = defaultdict(list)
    grupos_celda: dict = defaultdict(list)
    grupos_columna: dict = defaultdict(list)
    for d in datos:
        grupos_fila[d[filas]].append(d)
        if columnas:
            grupos_columna[d[columnas]].append(d)
            grupos_celda[(d[filas], d[columnas])].append(d)

    total_filas = {k: calcular(v) for k, v in grupos_fila.items()}
    total_columnas = {k: calcular(v) for k, v in grupos_columna.items()}

    etiquetas_fila = _ordenar_etiquetas(grupos_fila, definicion["dimensiones"][filas][1], total_filas)
    etiquetas_columna = (
        _ordenar_etiquetas(grupos_columna, definicion["dimensiones"][columnas][1], total_columnas)
        if columnas
        else []
    )

    truncado = len(etiquetas_fila) > MAX_FILAS_TABLA or len(etiquetas_columna) > MAX_COLUMNAS_TABLA
    etiquetas_fila = etiquetas_fila[:MAX_FILAS_TABLA]
    etiquetas_columna = etiquetas_columna[:MAX_COLUMNAS_TABLA]

    celdas = [
        [
            calcular(grupos_celda[(f, c)]) if (f, c) in grupos_celda else None
            for c in etiquetas_columna
        ]
        for f in etiquetas_fila
    ]

    return {
        "fuente": fuente,
        "filas": etiquetas_fila,
        "columnas": etiquetas_columna,
        "celdas": celdas,
        "totales_filas": [total_filas[f] for f in etiquetas_fila],
        "totales_columnas": [total_columnas[c] for c in etiquetas_columna],
        "total": calcular(datos) if datos else None,
        "registros": len(datos),
        "truncado": truncado,
    }
