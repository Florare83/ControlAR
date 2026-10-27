# Filtros de la bandeja de mensajes del admin: estado, origen y búsqueda.
from datetime import datetime, timezone

import pytest

from app.models.mensaje import MensajeContacto


@pytest.fixture
def mensajes(db, cliente):
    usuario, _ = cliente
    ahora = datetime.now(timezone.utc)
    db.add_all(
        [
            # visitante, sin leer, sin responder
            MensajeContacto(nombre="Ana", apellido="Paz", email="ana@x.com",
                            mensaje="¿Cuándo abren?", leido=False),
            # cliente con cuenta, leído y respondido
            MensajeContacto(nombre="Beto", apellido="Luz", email="beto@x.com",
                            mensaje="Busco un juego", leido=True,
                            respondido_en=ahora, usuario_id=usuario.id),
            # visitante, leído, sin responder
            MensajeContacto(nombre="Caro", apellido="Sol", email="caro@x.com",
                            mensaje="Consulta por torneos", leido=True),
        ]
    )
    db.commit()


def _nombres(client, headers, **params):
    r = client.get("/contacto/", params=params, headers=headers)
    assert r.status_code == 200
    return sorted(m["nombre"] for m in r.json()["items"])


def test_filtra_por_estado(client, admin, mensajes):
    _, h = admin
    assert _nombres(client, h) == ["Ana", "Beto", "Caro"]
    assert _nombres(client, h, estado="sin_leer") == ["Ana"]
    assert _nombres(client, h, estado="leidos") == ["Beto", "Caro"]
    assert _nombres(client, h, estado="sin_responder") == ["Ana", "Caro"]
    assert _nombres(client, h, estado="respondidos") == ["Beto"]


def test_filtra_por_origen(client, admin, mensajes):
    _, h = admin
    assert _nombres(client, h, origen="cliente") == ["Beto"]
    assert _nombres(client, h, origen="visitante") == ["Ana", "Caro"]


def test_busca_por_texto_y_combina_filtros(client, admin, mensajes):
    _, h = admin
    assert _nombres(client, h, buscar="torneos") == ["Caro"]
    assert _nombres(client, h, buscar="BETO") == ["Beto"]
    assert _nombres(client, h, buscar="x.com", origen="visitante", estado="leidos") == ["Caro"]


def test_el_contador_de_no_leidos_ignora_los_filtros(client, admin, mensajes):
    _, h = admin
    r = client.get("/contacto/", params={"estado": "respondidos"}, headers=h)
    assert r.json()["no_leidos"] == 1


def test_valores_invalidos_dan_422(client, admin, mensajes):
    _, h = admin
    assert client.get("/contacto/", params={"estado": "otro"}, headers=h).status_code == 422
    assert client.get("/contacto/", params={"origen": "otro"}, headers=h).status_code == 422
