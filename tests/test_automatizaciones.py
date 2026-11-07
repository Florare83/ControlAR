# Tareas automáticas (cron), CORS y fecha de alta de los juegos.
from datetime import datetime, time, timedelta, timezone

import pytest
from sqlalchemy import text

from app.core import asegurar_esquema as esquema
from app.core.cors import origenes_permitidos
from app.core.reservas_reglas import ZONA_AR
from app.models.juego import Juego
from app.models.reserva import Reserva

CLAVE = "clave-de-prueba-del-cron"


@pytest.fixture
def cron_activo(monkeypatch):
    monkeypatch.setenv("CRON_CLAVE", CLAVE)


def _reservar(client, headers, juego):
    r = client.post("/reservas/", json={"juego_id": juego.id}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


# ------------------------------------------------- vencer reservas con un cron

def test_el_cron_vence_las_reservas_a_su_hora_y_avisa(
    client, cliente_verificado, hacer_juego, evento_con_reservas, cron_activo, monkeypatch, db
):
    from app.core import avisos

    enviados = []
    monkeypatch.setattr(avisos, "enviar_correo", lambda *a: enviados.append(a))
    usuario, headers = cliente_verificado
    _reservar(client, headers, hacer_juego("Catan"))
    enviados.clear()

    # Pasan 31 minutos del inicio (17:00 + 30 de espera): nadie abre la web, solo corre el cron.
    tarde = datetime.combine(evento_con_reservas.fecha, time(17, 31), tzinfo=ZONA_AR)
    monkeypatch.setattr("app.api.v1.reservas.ahora", lambda: tarde)

    r = client.post("/reservas/vencer/automatico", headers={"X-Cron-Clave": CLAVE})

    assert r.status_code == 200 and r.json() == {"vencidas": 1}
    assert db.query(Reserva).one().estado == "vencida"
    assert len(enviados) == 1 and enviados[0][0] == usuario.email and "venció" in enviados[0][1]


def test_el_cron_no_repite_el_aviso(
    client, cliente_verificado, hacer_juego, evento_con_reservas, cron_activo, monkeypatch
):
    from app.core import avisos

    enviados = []
    monkeypatch.setattr(avisos, "enviar_correo", lambda *a: enviados.append(a))
    _, headers = cliente_verificado
    _reservar(client, headers, hacer_juego("Catan"))
    enviados.clear()
    tarde = datetime.combine(evento_con_reservas.fecha, time(17, 31), tzinfo=ZONA_AR)
    monkeypatch.setattr("app.api.v1.reservas.ahora", lambda: tarde)

    primero = client.post("/reservas/vencer/automatico", headers={"X-Cron-Clave": CLAVE}).json()
    segundo = client.post("/reservas/vencer/automatico", headers={"X-Cron-Clave": CLAVE}).json()

    assert primero == {"vencidas": 1} and segundo == {"vencidas": 0}
    assert len(enviados) == 1


def test_el_cron_no_toca_reservas_que_todavia_valen(
    client, cliente_verificado, hacer_juego, evento_con_reservas, cron_activo, db
):
    _, headers = cliente_verificado
    _reservar(client, headers, hacer_juego("Catan"))

    r = client.post("/reservas/vencer/automatico", headers={"X-Cron-Clave": CLAVE})

    assert r.json() == {"vencidas": 0}
    assert db.query(Reserva).one().estado == "activa"


def test_el_cron_pide_la_clave(client, cron_activo):
    assert client.post("/reservas/vencer/automatico").status_code == 401
    assert client.post("/reservas/vencer/automatico", headers={"X-Cron-Clave": "otra"}).status_code == 401


def test_sin_cron_clave_el_endpoint_esta_apagado(client, monkeypatch):
    monkeypatch.delenv("CRON_CLAVE", raising=False)
    assert client.post("/reservas/vencer/automatico", headers={"X-Cron-Clave": "x"}).status_code == 404


def test_el_cron_del_resumen_sigue_pidiendo_la_misma_clave(client, cron_activo, monkeypatch):
    assert client.post("/suscripcion/resumen/automatico").status_code == 401
    monkeypatch.delenv("CRON_CLAVE")
    assert client.post("/suscripcion/resumen/automatico", headers={"X-Cron-Clave": "x"}).status_code == 404


# ------------------------------------------------------------------------ CORS

def test_cors_permite_local_y_el_frontend_configurado():
    origenes = origenes_permitidos("", "https://controlar-de64.onrender.com/")
    assert origenes == ["http://localhost:5173", "http://127.0.0.1:5173", "https://controlar-de64.onrender.com"]


def test_cors_suma_los_extra_sin_duplicar_ni_barras():
    origenes = origenes_permitidos(
        " https://a.com/ , https://b.com,, https://a.com ", "https://b.com/"
    )
    assert origenes == ["http://localhost:5173", "http://127.0.0.1:5173", "https://a.com", "https://b.com"]


def test_cors_sin_configuracion_solo_deja_el_desarrollo_local():
    assert origenes_permitidos() == ["http://localhost:5173", "http://127.0.0.1:5173"]


# ----------------------------------------------- fecha de alta de los juegos

def test_un_juego_nuevo_guarda_su_fecha_de_alta(client, admin, db):
    _, h = admin
    from app.models.categoria import Categoria

    categoria = Categoria(nombre="Familiar")
    db.add(categoria)
    db.commit()
    r = client.post(
        "/juegos/",
        json={
            "titulo": "Nuevo Juego", "cantidad_jugadores": "2-4", "duracion_minutos": 30,
            "edad_minima": 8, "precio": 1000, "stock": 1, "en_venta": True, "categoria_id": categoria.id,
        },
        headers=h,
    )
    assert r.status_code == 201

    juego = db.get(Juego, r.json()["id"])
    assert juego.creado_en is not None
    assert datetime.now(timezone.utc) - juego.creado_en.replace(tzinfo=timezone.utc) < timedelta(minutes=1)


def test_novedades_ordena_por_fecha_y_deja_al_final_los_juegos_sin_fecha(client, hacer_juego, db):
    viejo1, viejo2 = hacer_juego("Viejo Uno"), hacer_juego("Viejo Dos")  # cargados antes de la columna
    reciente = hacer_juego("Reciente")
    intermedio = hacer_juego("Intermedio")
    ahora = datetime.now(timezone.utc)
    for juego in (viejo1, viejo2):
        juego.creado_en = None
    reciente.creado_en = ahora
    intermedio.creado_en = ahora - timedelta(days=5)
    db.commit()

    r = client.get("/juegos/novedades?limite=4")

    assert [j["titulo"] for j in r.json()] == ["Reciente", "Intermedio", "Viejo Dos", "Viejo Uno"]


def test_la_fecha_de_alta_gana_sobre_el_id(client, hacer_juego, db):
    primero = hacer_juego("Cargado primero")
    segundo = hacer_juego("Cargado segundo")
    primero.creado_en = datetime.now(timezone.utc) + timedelta(hours=1)  # fecha más nueva con id menor
    segundo.creado_en = datetime.now(timezone.utc)
    db.commit()

    r = client.get("/juegos/novedades?limite=2")

    assert [j["titulo"] for j in r.json()] == ["Cargado primero", "Cargado segundo"]


def test_al_migrar_los_juegos_viejos_no_reciben_una_fecha_inventada():
    columna = Juego.__table__.c.creado_en
    assert esquema._valor_de_relleno(columna) is None
    # El resto de las columnas con valor por defecto siguen rellenándose como antes.
    assert esquema._valor_de_relleno(Juego.__table__.c.stock) == 0


def test_la_migracion_agrega_la_columna_creado_en_a_una_base_vieja(db):
    from app.core.db import engine

    with engine.begin() as conexion:
        conexion.execute(text("ALTER TABLE juegos DROP COLUMN creado_en"))
    esquema.asegurar_esquema()

    with engine.begin() as conexion:
        columnas = {fila[1] for fila in conexion.execute(text("PRAGMA table_info(juegos)"))}
    assert "creado_en" in columnas
