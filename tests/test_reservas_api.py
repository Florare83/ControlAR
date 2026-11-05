# Reservas de juegos para un evento.
from datetime import datetime, time, timedelta

from app.api.v1.reservas import vencer_reservas
from app.core.reservas_reglas import ZONA_AR


def _reservar(client, headers, juego_id):
    return client.post("/reservas/", json={"juego_id": juego_id}, headers=headers)


def test_sin_evento_con_reservas_no_se_puede_reservar(client, cliente_verificado, hacer_juego):
    _, headers = cliente_verificado
    juego = hacer_juego("Catan")

    r = _reservar(client, headers, juego.id)

    assert r.status_code == 409
    assert "no hay un evento" in r.json()["detail"]


def test_se_puede_reservar_con_evento_abierto(client, cliente_verificado, hacer_juego, evento_con_reservas):
    _, headers = cliente_verificado
    juego = hacer_juego("Catan")

    assert _reservar(client, headers, juego.id).status_code == 201


def test_una_reserva_por_persona_y_evento(client, cliente_verificado, hacer_juego, evento_con_reservas):
    _, headers = cliente_verificado
    a, b = hacer_juego("Catan"), hacer_juego("Carcassonne")

    assert _reservar(client, headers, a.id).status_code == 201
    assert _reservar(client, headers, b.id).status_code == 409


def test_un_juego_no_lo_reservan_dos_personas(client, cliente_verificado, cliente2_verificado, hacer_juego, evento_con_reservas):
    _, h1 = cliente_verificado
    _, h2 = cliente2_verificado
    juego = hacer_juego("Catan")

    assert _reservar(client, h1, juego.id).status_code == 201
    r = _reservar(client, h2, juego.id)

    assert r.status_code == 409
    assert "ya fue reservado" in r.json()["detail"]


def test_cancelar_libera_el_juego(client, cliente_verificado, cliente2_verificado, hacer_juego, evento_con_reservas):
    _, h1 = cliente_verificado
    _, h2 = cliente2_verificado
    juego = hacer_juego("Catan")
    reserva = _reservar(client, h1, juego.id).json()

    assert client.delete(f"/reservas/{reserva['id']}", headers=h1).status_code == 200
    assert _reservar(client, h2, juego.id).status_code == 201


def _congelar_hora(monkeypatch, momento):
    """Hace que las reservas crean que "ahora" es `momento` (así la prueba no depende del reloj)."""
    monkeypatch.setattr("app.api.v1.reservas.ahora", lambda: momento)


def test_pasadas_las_20_del_dia_anterior_ya_no_se_puede_reservar(
    client, cliente_verificado, hacer_juego, evento_con_reservas, monkeypatch
):
    _, headers = cliente_verificado
    juego = hacer_juego("Catan")
    victima = datetime.combine(evento_con_reservas.fecha - timedelta(days=1), time(20, 1), tzinfo=ZONA_AR)
    _congelar_hora(monkeypatch, victima)

    r = _reservar(client, headers, juego.id)

    assert r.status_code == 409
    assert "cerraron" in r.json()["detail"]


def test_justo_antes_del_cierre_todavia_se_puede_reservar(
    client, cliente_verificado, hacer_juego, evento_con_reservas, monkeypatch
):
    _, headers = cliente_verificado
    juego = hacer_juego("Catan")
    limite = datetime.combine(evento_con_reservas.fecha - timedelta(days=1), time(19, 59), tzinfo=ZONA_AR)
    _congelar_hora(monkeypatch, limite)

    assert _reservar(client, headers, juego.id).status_code == 201


def test_la_reserva_vence_30_minutos_despues_del_inicio_y_libera_el_juego(
    client, cliente_verificado, cliente2_verificado, hacer_juego, evento_con_reservas, db, monkeypatch
):
    from app.models.reserva import Reserva

    _, h1 = cliente_verificado
    _, h2 = cliente2_verificado
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


# ------------------------------------------------------- DNI validado para reservar

def test_sin_dni_cargado_no_puede_reservar_y_se_le_explica_como(
    client, cliente, hacer_juego, evento_con_reservas
):
    _, headers = cliente
    juego = hacer_juego("Catan")

    r = _reservar(client, headers, juego.id)

    assert r.status_code == 403
    detalle = r.json()["detail"]
    assert "Cargalo en tu cuenta" in detalle and "evento" in detalle


def test_dni_cargado_pero_sin_validar_no_puede_reservar(
    client, cliente, hacer_juego, evento_con_reservas, db
):
    usuario, headers = cliente
    usuario.dni = "30555666"
    db.commit()
    juego = hacer_juego("Catan")

    r = _reservar(client, headers, juego.id)

    assert r.status_code == 403
    assert "todavía no está validado" in r.json()["detail"]


def test_la_reserva_rechazada_por_dni_no_ocupa_el_juego(
    client, cliente, cliente2_verificado, hacer_juego, evento_con_reservas
):
    _, sin_validar = cliente
    _, validado = cliente2_verificado
    juego = hacer_juego("Catan")

    assert _reservar(client, sin_validar, juego.id).status_code == 403
    assert _reservar(client, validado, juego.id).status_code == 201


def test_al_validar_el_dni_en_un_evento_ya_puede_reservar(
    client, cliente, admin, hacer_juego, evento_con_reservas, db
):
    usuario, headers = cliente
    _, headers_admin = admin
    usuario.dni = "30777888"
    db.commit()
    juego = hacer_juego("Catan")
    assert _reservar(client, headers, juego.id).status_code == 403

    # El administrador mira el DNI físico y lo valida.
    r = client.patch(
        f"/auth/admin/usuarios/{usuario.id}", json={"dni_verificado": True}, headers=headers_admin
    )
    assert r.status_code == 200

    assert _reservar(client, headers, juego.id).status_code == 201
