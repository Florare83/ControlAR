# Correos automáticos al cliente_verificado: reserva, pedido y compra confirmada.
import pytest

from app.core import avisos
from app.models.pedido import APROBADO


@pytest.fixture
def correos(monkeypatch):
    """Reemplaza el envío real y junta lo que se habría mandado."""
    enviados = []
    monkeypatch.setattr(
        avisos, "enviar_correo", lambda destino, asunto, cuerpo: enviados.append((destino, asunto, cuerpo))
    )
    return enviados


@pytest.fixture
def juego_en_venta(db, hacer_juego):
    juego = hacer_juego("Catan")
    juego.en_venta = True
    juego.stock = 5
    juego.precio = 12500.5
    db.commit()
    return juego


def test_reserva_manda_confirmacion(client, cliente_verificado, hacer_juego, evento_con_reservas, correos):
    usuario, headers = cliente_verificado
    juego = hacer_juego("Catan")

    r = client.post("/reservas/", json={"juego_id": juego.id}, headers=headers)

    assert r.status_code == 201
    assert len(correos) == 1
    destino, asunto, cuerpo = correos[0]
    assert destino == usuario.email
    assert "Catan" in asunto
    assert "Tarde de juegos" in cuerpo and "Calle 123" in cuerpo


def test_reserva_rechazada_no_manda_correo(client, cliente_verificado, hacer_juego, correos):
    _, headers = cliente_verificado
    juego = hacer_juego("Catan")

    r = client.post("/reservas/", json={"juego_id": juego.id}, headers=headers)  # sin evento

    assert r.status_code == 409
    assert correos == []


def test_si_falla_el_correo_la_reserva_igual_se_crea(
    client, cliente_verificado, hacer_juego, evento_con_reservas, monkeypatch
):
    def roto(*args):
        raise RuntimeError("Brevo caído")

    monkeypatch.setattr(avisos, "enviar_correo", roto)
    _, headers = cliente_verificado
    juego = hacer_juego("Catan")

    assert client.post("/reservas/", json={"juego_id": juego.id}, headers=headers).status_code == 201
    assert len(client.get("/reservas/mias", headers=headers).json()) == 1


def test_pedido_efectivo_y_pago_manual_mandan_dos_correos(
    client, cliente_verificado, admin, juego_en_venta, correos
):
    usuario, headers_cliente = cliente_verificado
    _, headers_admin = admin

    r = client.post(
        "/pedidos/efectivo",
        json={"items": [{"juego_id": juego_en_venta.id, "cantidad": 2}]},
        headers=headers_cliente,
    )
    assert r.status_code == 201
    pedido_id = r.json()["pedido_id"]

    # 1) Pedido recibido, pendiente de pago.
    assert len(correos) == 1
    destino, asunto, cuerpo = correos[0]
    assert destino == usuario.email
    assert f"#{pedido_id}" in asunto
    assert "pendiente de pago" in cuerpo
    assert "Catan × 2" in cuerpo and "$25.001,00" in cuerpo

    # 2) El administrador acredita el pago a mano.
    r = client.post(f"/pedidos/{pedido_id}/marcar-pagado", headers=headers_admin)
    assert r.status_code == 200
    assert len(correos) == 2
    destino, asunto, cuerpo = correos[1]
    assert destino == usuario.email
    assert "Compra confirmada" in asunto
    assert "Acreditamos tu pago" in cuerpo


def test_pedido_en_efectivo_no_manda_confirmacion_de_compra_hasta_acreditar(
    client, cliente_verificado, juego_en_venta, correos
):
    _, headers = cliente_verificado
    client.post(
        "/pedidos/efectivo",
        json={"items": [{"juego_id": juego_en_venta.id, "cantidad": 1}]},
        headers=headers,
    )

    assert all("Compra confirmada" not in asunto for _, asunto, _ in correos)


def test_mercado_pago_aprobado_manda_un_solo_correo_aunque_llegue_dos_veces(
    client, cliente_verificado, juego_en_venta, db, correos, monkeypatch
):
    from app.api.v1 import pedidos
    from app.models.pedido import MERCADO_PAGO, PENDIENTE, Pedido, PedidoItem

    usuario, headers = cliente_verificado
    pedido = Pedido(
        usuario_id=usuario.id,
        total=12500.5,
        estado=PENDIENTE,
        forma_pago=MERCADO_PAGO,
        items=[PedidoItem(juego_id=juego_en_venta.id, titulo="Catan", precio_unitario=12500.5, cantidad=1)],
    )
    db.add(pedido)
    db.commit()
    db.refresh(pedido)

    pago = {
        "id": 777,
        "status": "approved",
        "external_reference": str(pedido.id),
        "transaction_amount": 12500.5,
    }
    monkeypatch.setattr(pedidos.mp, "obtener_pago", lambda pago_id: pago)

    for _ in range(2):  # vuelta del cliente_verificado + webhook
        r = client.post(f"/pedidos/{pedido.id}/confirmar", json={"pago_id": "777"}, headers=headers)
        assert r.status_code == 200

    db.refresh(pedido)
    assert pedido.estado == APROBADO
    assert len(correos) == 1
    assert "Recibimos tu pago por Mercado Pago" in correos[0][2]


def test_formato_de_dinero_argentino():
    assert avisos._dinero(1234567.5) == "$1.234.567,50"
    assert avisos._dinero(0) == "$0,00"


# ------------------------------------------------- cancelaciones y vencimientos

def test_cancelar_reserva_manda_correo(client, cliente_verificado, hacer_juego, evento_con_reservas, correos):
    usuario, headers = cliente_verificado
    juego = hacer_juego("Catan")
    reserva = client.post("/reservas/", json={"juego_id": juego.id}, headers=headers).json()
    correos.clear()

    r = client.delete(f"/reservas/{reserva['id']}", headers=headers)

    assert r.status_code == 200
    assert len(correos) == 1
    destino, asunto, cuerpo = correos[0]
    assert destino == usuario.email
    assert "Reserva cancelada" in asunto and "Catan" in asunto
    assert "quedó libre" in cuerpo


def test_cancelar_reserva_ajena_no_manda_correo(
    client, cliente_verificado, cliente2_verificado, hacer_juego, evento_con_reservas, correos
):
    _, h1 = cliente_verificado
    _, h2 = cliente2_verificado
    juego = hacer_juego("Catan")
    reserva = client.post("/reservas/", json={"juego_id": juego.id}, headers=h1).json()
    correos.clear()

    assert client.delete(f"/reservas/{reserva['id']}", headers=h2).status_code == 404
    assert correos == []


def test_reserva_vencida_manda_correo_una_sola_vez(
    client, cliente_verificado, hacer_juego, evento_con_reservas, correos, monkeypatch
):
    from datetime import datetime, time

    from app.core.reservas_reglas import ZONA_AR

    usuario, headers = cliente_verificado
    juego = hacer_juego("Catan")
    client.post("/reservas/", json={"juego_id": juego.id}, headers=headers)
    correos.clear()

    # 31 minutos después del inicio (17:00 + 30 min de espera): la reserva vence.
    tarde = datetime.combine(evento_con_reservas.fecha, time(17, 31), tzinfo=ZONA_AR)
    monkeypatch.setattr("app.api.v1.reservas.ahora", lambda: tarde)

    assert client.get("/reservas/estado").status_code == 200
    assert client.get("/reservas/estado").status_code == 200  # una segunda visita no repite el aviso

    assert len(correos) == 1
    destino, asunto, cuerpo = correos[0]
    assert destino == usuario.email
    assert "venció" in asunto and "Catan" in asunto
    assert "17:30" in cuerpo


def test_reserva_activa_no_manda_aviso_de_vencimiento(
    client, cliente_verificado, hacer_juego, evento_con_reservas, correos
):
    _, headers = cliente_verificado
    juego = hacer_juego("Catan")
    client.post("/reservas/", json={"juego_id": juego.id}, headers=headers)
    correos.clear()

    client.get("/reservas/estado")

    assert correos == []


def test_cancelar_pedido_efectivo_manda_correo(client, cliente_verificado, admin, juego_en_venta, correos):
    usuario, headers_cliente = cliente_verificado
    _, headers_admin = admin
    pedido_id = client.post(
        "/pedidos/efectivo",
        json={"items": [{"juego_id": juego_en_venta.id, "cantidad": 1}]},
        headers=headers_cliente,
    ).json()["pedido_id"]
    correos.clear()

    r = client.post(f"/pedidos/{pedido_id}/cancelar", headers=headers_admin)

    assert r.status_code == 200
    assert len(correos) == 1
    destino, asunto, cuerpo = correos[0]
    assert destino == usuario.email
    assert f"#{pedido_id}" in asunto and "cancelado" in asunto
    assert "No se te cobró nada" in cuerpo


def test_cancelar_pedido_ya_pagado_no_manda_correo(client, cliente_verificado, admin, juego_en_venta, correos):
    _, headers_cliente = cliente_verificado
    _, headers_admin = admin
    pedido_id = client.post(
        "/pedidos/efectivo",
        json={"items": [{"juego_id": juego_en_venta.id, "cantidad": 1}]},
        headers=headers_cliente,
    ).json()["pedido_id"]
    client.post(f"/pedidos/{pedido_id}/marcar-pagado", headers=headers_admin)
    correos.clear()

    assert client.post(f"/pedidos/{pedido_id}/cancelar", headers=headers_admin).status_code == 409
    assert correos == []
