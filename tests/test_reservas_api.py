# Reservas de juegos para un evento.
from datetime import datetime, time, timedelta

from app.api.v1.reservas import vencer_reservas
from app.core.reservas_reglas import ZONA_AR


def _reservar(client, headers, juego_id):
    return client.post("/reservas/", json={"juego_id": juego_id}, headers=headers)


def test_sin_evento_con_reservas_no_se_puede_reservar(client, cliente, hacer_juego):
    _, headers = cliente
    juego = hacer_juego("Catan")

    r = _reservar(client, headers, juego.id)

    assert r.status_code == 409
    assert "no hay un evento" in r.json()["detail"]


def test_se_puede_reservar_con_evento_abierto(client, cliente, hacer_juego, evento_con_reservas):
    _, headers = cliente
    juego = hacer_juego("Catan")

    assert _reservar(client, headers, juego.id).status_code == 201


def test_una_reserva_por_persona_y_evento(client, cliente, hacer_juego, evento_con_reservas):
    _, headers = cliente
    a, b = hacer_juego("Catan"), hacer_juego("Carcassonne")

    assert _reservar(client, headers, a.id).status_code == 201
    assert _reservar(client, headers, b.id).status_code == 409


def test_un_juego_no_lo_reservan_dos_personas(client, cliente, cliente2, hacer_juego, evento_con_reservas):
    _, h1 = cliente
    _, h2 = cliente2
    juego = hacer_juego("Catan")

    assert _reservar(client, h1, juego.id).status_code == 201
    r = _reservar(client, h2, juego.id)

    assert r.status_code == 409
    assert "ya fue reservado" in r.json()["detail"]


def test_cancelar_libera_el_juego(client, cliente, cliente2, hacer_juego, evento_con_reservas):
    _, h1 = cliente
    _, h2 = cliente2
    juego = hacer_juego("Catan")
    reserva = _reservar(client, h1, juego.id).json()

    assert client.delete(f"/reservas/{reserva['id']}", headers=h1).status_code == 200
    assert _reservar(client, h2, juego.id).status_code == 201


def _congelar_hora(monkeypatch, momento):
    """Hace que las reservas crean que "ahora" es `momento` (así la prueba no depende del reloj)."""
    monkeypatch.setattr("app.api.v1.reservas.ahora", lambda: momento)


def test_pasadas_las_20_del_dia_anterior_ya_no_se_puede_reservar(
    client, cliente, hacer_juego, evento_con_reservas, monkeypatch
):
    _, headers = cliente
    juego = hacer_juego("Catan")
    victima = datetime.combine(evento_con_reservas.fecha - timedelta(days=1), time(20, 1), tzinfo=ZONA_AR)
    _congelar_hora(monkeypatch, victima)

    r = _reservar(client, headers, juego.id)

    assert r.status_code == 409
    assert "cerraron" in r.json()["detail"]


def test_justo_antes_del_cierre_todavia_se_puede_reservar(
    client, cliente, hacer_juego, evento_con_reservas, monkeypatch
):
    _, headers = cliente
    juego = hacer_juego("Catan")
    limite = datetime.combine(evento_con_reservas.fecha - timedelta(days=1), time(19, 59), tzinfo=ZONA_AR)
    _congelar_hora(monkeypatch, limite)

    assert _reservar(client, headers, juego.id).status_code == 201


def test_la_reserva_vence_30_minutos_despues_del_inicio_y_libera_el_juego(
    client, cliente, cliente2, hacer_juego, evento_con_reservas, db, monkeypatch
):
    from app.models.reserva import Reserva

    _, h1 = cliente
    _, h2 = cliente2
    juego = hacer_juego("Catan")
    reserva = _reservar(client, h1, juego.id).json()

    # Pasan 31 minutos desde el inicio del evento (17:00 + 30 min de espera).
    tarde = datetime.combine(evento_con_reservas.fecha, time(17, 31), tzinfo=ZONA_AR)
    _congelar_hora(monkeypatch, tarde)
    vencer_reservas(db)

    assert db.get(Reserva, reserva["id"]).estado == "vencida"
    # El juego quedó libre: se puede reservar para otro evento vigente.
    db.expire_all()
    activas = db.query(Reserva).filter(Reserva.estado == "activa").count()
    assert activas == 0
