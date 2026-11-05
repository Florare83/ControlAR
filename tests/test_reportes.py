# Reportes del administrador: préstamos, ventas, reservas y tabla dinámica.
from datetime import datetime, timedelta, timezone

import pytest

from app.models.pedido import APROBADO, CANCELADO, EFECTIVO_TRANSFERENCIA, MERCADO_PAGO, PENDIENTE, Pedido, PedidoItem
from app.models.prestamo import Prestamo

ZONA = timezone(timedelta(hours=-3))
HOY = datetime.now(ZONA).date()


def _dia(dias_atras: int):
    return HOY - timedelta(days=dias_atras)


def _prestar(client, headers, juego, dni, nombre="Ana Pérez", sexo="Femenino"):
    r = client.post(
        "/prestamos/",
        json={"dni": dni, "nombre": nombre, "sexo": sexo, "telefono": "3874111222", "juego_id": juego.id},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _mover(db, prestamo_id, dias_atras, devuelto_tras_min=None):
    """Ubica el préstamo en un día pasado (a las 15:00 de Argentina)."""
    p = db.get(Prestamo, prestamo_id)
    inicio = datetime.combine(_dia(dias_atras), datetime.min.time(), tzinfo=ZONA).replace(hour=15)
    p.fecha_inicio = inicio
    if devuelto_tras_min is not None:
        p.estado = "cerrado"
        p.fecha_cierre = inicio + timedelta(minutes=devuelto_tras_min)
    db.commit()


@pytest.fixture
def prestamos_cargados(client, admin, db, hacer_juego):
    """Tres préstamos en tres días distintos: dos devueltos y uno sin devolver."""
    _, h = admin
    catan, carca, dixit = hacer_juego("Catan"), hacer_juego("Carcassonne"), hacer_juego("Dixit")
    a = _prestar(client, h, catan, "30000001", "Ana Pérez", "Femenino")
    b = _prestar(client, h, carca, "30000002", "Beto Gómez", "Masculino")
    c = _prestar(client, h, dixit, "30000003", "Cami Ruiz", "Femenino")
    _mover(db, a, 3, devuelto_tras_min=60)
    _mover(db, b, 2, devuelto_tras_min=120)
    _mover(db, c, 1)  # sigue en préstamo desde ayer
    return h


# --------------------------------------------------------------------- permisos

@pytest.mark.parametrize(
    "ruta",
    [
        "/reportes/prestamos",
        "/reportes/ventas",
        "/reportes/reservas",
        "/reportes/tabla-dinamica/opciones",
        "/reportes/tabla-dinamica?fuente=prestamos&filas=juego&medida=cantidad",
    ],
)
def test_los_reportes_son_solo_para_administradores(client, cliente, ruta):
    _, h = cliente
    assert client.get(ruta, headers=h).status_code == 403
    assert client.get(ruta).status_code == 401


@pytest.mark.parametrize("ruta", ["prestamos", "ventas", "reservas"])
def test_fechas_invertidas_se_rechazan(client, admin, ruta):
    _, h = admin
    r = client.get(f"/reportes/{ruta}?desde={_dia(1)}&hasta={_dia(5)}", headers=h)
    assert r.status_code == 422


# -------------------------------------------------------------------- préstamos

def test_reporte_de_prestamos_con_datos(client, prestamos_cargados):
    r = client.get("/reportes/prestamos", headers=prestamos_cargados).json()

    assert r["resumen"]["total"] == 3
    assert r["resumen"]["personas"] == 3
    assert r["resumen"]["activos"] == 1
    assert r["resumen"]["devueltos"] == 2
    assert r["resumen"]["sin_devolver"] == 1
    assert r["resumen"]["duracion_promedio_minutos"] == 90
    assert r["anterior"] is None  # sin las dos fechas no hay con qué comparar

    assert {j["titulo"] for j in r["juegos_mas_prestados"]} == {"Catan", "Carcassonne", "Dixit"}
    assert [d["dia"] for d in r["por_dia_semana"]][0] == "Lunes" and len(r["por_dia_semana"]) == 7
    assert sum(d["cantidad"] for d in r["por_dia_semana"]) == 3
    assert {s["nombre"]: s["cantidad"] for s in r["por_sexo"]} == {"Femenino": 2, "Masculino": 1}
    assert sum(c["cantidad"] for c in r["por_categoria"]) == 3

    assert r["pendientes"]["total"] == 1
    assert r["pendientes"]["items"][0]["nombre"] == "Cami Ruiz"
    assert r["pendientes"]["items"][0]["dias"] == 1


def test_la_evolucion_incluye_los_dias_sin_movimiento(client, prestamos_cargados):
    r = client.get(f"/reportes/prestamos?desde={_dia(5)}&hasta={_dia(0)}", headers=prestamos_cargados).json()

    assert r["granularidad"] == "dia"
    assert [p["clave"] for p in r["serie"]] == [_dia(i).isoformat() for i in (5, 4, 3, 2, 1, 0)]
    assert [p["prestamos"] for p in r["serie"]] == [0, 0, 1, 1, 1, 0]


def test_los_periodos_largos_se_agrupan_por_mes(client, prestamos_cargados):
    r = client.get(f"/reportes/prestamos?desde={_dia(200)}&hasta={_dia(0)}", headers=prestamos_cargados).json()

    assert r["granularidad"] == "mes"
    assert all(len(p["clave"]) == 7 for p in r["serie"])
    assert sum(p["prestamos"] for p in r["serie"]) == 3


def test_con_las_dos_fechas_se_compara_con_el_periodo_anterior(client, prestamos_cargados, db):
    # Período actual: últimos 3 días (hace 2, 1 y 0). Anterior: los 3 días previos (hace 5, 4 y 3).
    r = client.get(f"/reportes/prestamos?desde={_dia(2)}&hasta={_dia(0)}", headers=prestamos_cargados).json()

    assert r["resumen"]["total"] == 2  # Beto (hace 2) y Cami (hace 1)
    assert r["anterior"]["total"] == 1  # Ana (hace 3)


def test_personas_nuevas_y_que_vuelven(client, admin, db, hacer_juego):
    _, h = admin
    a, b = hacer_juego("Catan"), hacer_juego("Dixit")
    vieja = _prestar(client, h, a, "30000001", "Ana Pérez")
    _mover(db, vieja, 20, devuelto_tras_min=30)
    de_nuevo = _prestar(client, h, a, "30000001", "Ana Pérez")  # vuelve este mes
    nueva = _prestar(client, h, b, "30000002", "Beto Gómez")
    _mover(db, de_nuevo, 1, devuelto_tras_min=30)
    _mover(db, nueva, 1, devuelto_tras_min=30)

    r = client.get(f"/reportes/prestamos?desde={_dia(5)}&hasta={_dia(0)}", headers=h).json()

    assert r["resumen"]["personas"] == 2
    assert r["resumen"]["personas_que_vuelven"] == 1
    assert r["resumen"]["personas_nuevas"] == 1


def test_juegos_de_la_ludoteca_sin_movimiento(client, admin, hacer_juego, prestamos_cargados):
    hacer_juego("Azul")

    r = client.get("/reportes/prestamos", headers=prestamos_cargados).json()

    assert r["sin_movimiento"]["cantidad"] == 1
    assert r["sin_movimiento"]["ejemplos"] == ["Azul"]
    assert r["sin_movimiento"]["total_ludoteca"] == 4


def test_reporte_de_prestamos_sin_datos(client, admin):
    _, h = admin

    r = client.get("/reportes/prestamos", headers=h).json()

    assert r["resumen"]["total"] == 0 and r["serie"] == [] and r["juegos_mas_prestados"] == []
    assert r["resumen"]["duracion_promedio_minutos"] is None


# ----------------------------------------------------------------------- ventas

def _pedido(db, usuario, estado, total, items, forma=MERCADO_PAGO, dias_atras=0):
    momento = datetime.combine(_dia(dias_atras), datetime.min.time(), tzinfo=ZONA).replace(hour=12)
    pedido = Pedido(
        usuario_id=usuario.id,
        total=total,
        estado=estado,
        forma_pago=forma,
        creado_en=momento,
        pagado_en=momento if estado == APROBADO else None,
        items=[
            PedidoItem(juego_id=j.id, titulo=j.titulo, precio_unitario=precio, cantidad=cant)
            for j, precio, cant in items
        ],
    )
    db.add(pedido)
    db.commit()
    return pedido


@pytest.fixture
def ventas_cargadas(db, cliente, hacer_juego):
    usuario, _ = cliente
    catan, dixit = hacer_juego("Catan"), hacer_juego("Dixit")
    catan.en_venta, catan.stock = True, 1  # stock bajo
    dixit.en_venta, dixit.stock = True, 10
    db.commit()
    _pedido(db, usuario, APROBADO, 25000, [(catan, 12500, 2)], dias_atras=2)
    _pedido(db, usuario, APROBADO, 8000, [(dixit, 8000, 1)], forma=EFECTIVO_TRANSFERENCIA, dias_atras=1)
    _pedido(db, usuario, PENDIENTE, 12500, [(catan, 12500, 1)])
    _pedido(db, usuario, CANCELADO, 8000, [(dixit, 8000, 1)])


def test_reporte_de_ventas(client, admin, ventas_cargadas):
    _, h = admin

    r = client.get("/reportes/ventas", headers=h).json()

    resumen = r["resumen"]
    assert resumen["ingresos"] == 33000
    assert resumen["pedidos_pagados"] == 2
    assert resumen["unidades"] == 3
    assert resumen["ticket_promedio"] == 16500
    assert resumen["compradores"] == 1
    assert resumen["pendientes"] == 1 and resumen["cancelados"] == 1
    assert resumen["tasa_pago"] == 67  # 2 pagados de 3 resueltos

    assert r["mas_vendidos"][0] == {"titulo": "Catan", "unidades": 2, "ingresos": 25000}
    assert {f["forma"]: f["ingresos"] for f in r["por_forma_pago"]} == {
        MERCADO_PAGO: 25000,
        EFECTIVO_TRANSFERENCIA: 8000,
    }
    assert {e["estado"]: e["cantidad"] for e in r["por_estado"]} == {APROBADO: 2, PENDIENTE: 1, CANCELADO: 1}
    assert [s["titulo"] for s in r["stock_bajo"]] == ["Catan"]
    assert sum(p["ingresos"] for p in r["serie"]) == 33000


def test_ventas_respetan_el_periodo_y_comparan(client, admin, ventas_cargadas):
    _, h = admin

    r = client.get(f"/reportes/ventas?desde={_dia(1)}&hasta={_dia(0)}", headers=h).json()

    assert r["resumen"]["ingresos"] == 8000  # solo el pedido de ayer
    assert r["anterior"]["ingresos"] == 25000  # el de hace 2 días cae en el período anterior


def test_ventas_sin_pedidos(client, admin):
    _, h = admin

    r = client.get("/reportes/ventas", headers=h).json()

    assert r["resumen"]["ingresos"] == 0 and r["resumen"]["tasa_pago"] is None
    assert r["mas_vendidos"] == [] and r["serie"] == []


# --------------------------------------------------------------------- reservas

def test_reporte_de_reservas(client, cliente_verificado, cliente2_verificado, admin, hacer_juego, evento_con_reservas):
    _, h1 = cliente_verificado
    _, h2 = cliente2_verificado
    _, ha = admin
    a, b = hacer_juego("Catan"), hacer_juego("Dixit")
    reserva = client.post("/reservas/", json={"juego_id": a.id}, headers=h1).json()
    client.post("/reservas/", json={"juego_id": b.id}, headers=h2)
    client.delete(f"/reservas/{reserva['id']}", headers=h1)  # una cancelada

    r = client.get("/reportes/reservas", headers=ha).json()

    assert r["resumen"]["total"] == 2
    assert r["resumen"]["canceladas"] == 1 and r["resumen"]["activas"] == 1
    assert r["resumen"]["personas"] == 2
    assert r["resumen"]["tasa_retiro"] is None  # nada se retiró ni venció todavía
    assert {e["estado"]: e["cantidad"] for e in r["por_estado"]} == {
        "entregada": 0, "vencida": 0, "cancelada": 1, "activa": 1,
    }
    assert len(r["por_evento"]) == 1 and r["por_evento"][0]["reservas"] == 2
    assert {j["titulo"] for j in r["juegos_mas_reservados"]} == {"Catan", "Dixit"}


# --------------------------------------------------------------- tabla dinámica

def test_opciones_de_la_tabla_dinamica(client, admin):
    _, h = admin

    r = client.get("/reportes/tabla-dinamica/opciones", headers=h).json()

    assert set(r) == {"prestamos", "ventas", "reservas"}
    assert "juego" in {d["valor"] for d in r["prestamos"]["dimensiones"]}
    assert "ingresos" in {m["valor"] for m in r["ventas"]["medidas"]}


def _tabla(client, h, **params):
    consulta = "&".join(f"{k}={v}" for k, v in params.items())
    return client.get(f"/reportes/tabla-dinamica?{consulta}", headers=h)


def test_tabla_de_prestamos_por_juego_y_sexo(client, prestamos_cargados):
    r = _tabla(client, prestamos_cargados, fuente="prestamos", filas="juego", columnas="sexo", medida="cantidad").json()

    assert sorted(r["filas"]) == ["Carcassonne", "Catan", "Dixit"]
    assert r["columnas"] == ["Femenino", "Masculino"]  # primero la de más préstamos
    celda = {f: dict(zip(r["columnas"], fila)) for f, fila in zip(r["filas"], r["celdas"])}
    assert celda["Catan"] == {"Femenino": 1, "Masculino": None}
    assert celda["Carcassonne"] == {"Femenino": None, "Masculino": 1}
    assert r["totales_columnas"] == [2, 1]
    assert r["total"] == 3 and r["registros"] == 3


def test_tabla_sin_columnas_y_orden_cronologico(client, prestamos_cargados):
    r = _tabla(client, prestamos_cargados, fuente="prestamos", filas="fecha", medida="cantidad").json()

    assert r["columnas"] == [] and all(fila == [] for fila in r["celdas"])
    assert r["filas"] == [_dia(3).isoformat(), _dia(2).isoformat(), _dia(1).isoformat()]
    assert r["totales_filas"] == [1, 1, 1]


def test_tabla_con_promedio_y_personas(client, prestamos_cargados):
    promedio = _tabla(client, prestamos_cargados, fuente="prestamos", filas="estado", medida="duracion_promedio").json()
    assert dict(zip(promedio["filas"], promedio["totales_filas"])) == {"Devuelto": 90, "En préstamo": None}

    personas = _tabla(client, prestamos_cargados, fuente="prestamos", filas="sexo", medida="personas").json()
    assert dict(zip(personas["filas"], personas["totales_filas"])) == {"Femenino": 2, "Masculino": 1}


def test_tabla_de_ventas_por_forma_de_pago(client, admin, ventas_cargadas):
    _, h = admin

    r = _tabla(client, h, fuente="ventas", filas="forma_pago", medida="ingresos").json()

    assert dict(zip(r["filas"], r["totales_filas"])) == {
        "Mercado Pago": 25000,
        "Efectivo / transferencia": 8000,
    }
    assert r["total"] == 33000


def test_tabla_de_ventas_por_dia_de_semana(client, admin, ventas_cargadas):
    _, h = admin

    r = _tabla(client, h, fuente="ventas", filas="dia_semana", medida="pedidos").json()

    assert r["total"] == 2
    assert [f for f in r["filas"]] == sorted(r["filas"], key=lambda d: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].index(d))


def test_la_tabla_respeta_el_periodo(client, prestamos_cargados):
    r = _tabla(
        client, prestamos_cargados, fuente="prestamos", filas="juego", medida="cantidad",
        desde=_dia(1), hasta=_dia(0),
    ).json()

    assert r["filas"] == ["Dixit"] and r["total"] == 1


@pytest.mark.parametrize(
    "params",
    [
        {"fuente": "usuarios", "filas": "juego", "medida": "cantidad"},
        {"fuente": "prestamos", "filas": "password", "medida": "cantidad"},
        {"fuente": "prestamos", "filas": "juego", "columnas": "email", "medida": "cantidad"},
        {"fuente": "prestamos", "filas": "juego", "columnas": "juego", "medida": "cantidad"},
        {"fuente": "prestamos", "filas": "juego", "medida": "ingresos"},  # medida de otra fuente
        {"fuente": "ventas", "filas": "sexo", "medida": "ingresos"},  # dimensión de otra fuente
    ],
)
def test_la_tabla_rechaza_opciones_que_no_existen(client, admin, params):
    _, h = admin
    assert _tabla(client, h, **params).status_code == 422


def test_tabla_vacia(client, admin):
    _, h = admin

    r = _tabla(client, h, fuente="prestamos", filas="juego", columnas="sexo", medida="cantidad").json()

    assert r["filas"] == [] and r["columnas"] == [] and r["total"] is None and r["registros"] == 0
