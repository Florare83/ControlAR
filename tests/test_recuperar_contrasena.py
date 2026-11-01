# «Olvidé mi contraseña»: enlace por correo de un solo uso.
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.api.v1.auth import repository as repo_usuarios
from app.core import avisos, recuperacion
from app.core.security import ALGORITHM, crear_token


@pytest.fixture
def correos(monkeypatch):
    enviados = []
    monkeypatch.setattr(
        avisos, "enviar_correo", lambda destino, asunto, cuerpo: enviados.append((destino, asunto, cuerpo))
    )
    return enviados


def _persona(db, email="ana@prueba.com", contrasena="clave12345", activo=True):
    usuario = repo_usuarios.create(db, "Ana Pérez", email, contrasena)
    if not activo:
        usuario.activo = False
        db.commit()
    return usuario


def _token_del_correo(correos) -> str:
    cuerpo = correos[-1][2]
    return cuerpo.split("/restablecer?token=")[1].split()[0]


def _login(client, email, contrasena):
    return client.post("/auth/login", data={"username": email, "password": contrasena})


def test_se_manda_un_enlace_a_la_cuenta_registrada(client, db, correos):
    ana = _persona(db)

    r = client.post("/auth/recuperar", json={"email": ana.email})

    assert r.status_code == 200
    assert len(correos) == 1
    destino, asunto, cuerpo = correos[0]
    assert destino == ana.email
    assert "contraseña" in asunto
    assert "/restablecer?token=" in cuerpo


def test_responde_lo_mismo_si_la_cuenta_no_existe(client, db, correos):
    ana = _persona(db)

    existente = client.post("/auth/recuperar", json={"email": ana.email})
    inexistente = client.post("/auth/recuperar", json={"email": "nadie@prueba.com"})

    assert inexistente.status_code == 200
    assert inexistente.json() == existente.json()
    assert len(correos) == 1  # solo la cuenta real recibió un mail


def test_una_cuenta_eliminada_no_recibe_enlace(client, db, correos):
    ana = _persona(db, activo=False)

    r = client.post("/auth/recuperar", json={"email": ana.email})

    assert r.status_code == 200
    assert correos == []


def test_el_enlace_permite_elegir_una_contrasena_nueva(client, db, correos):
    ana = _persona(db)
    client.post("/auth/recuperar", json={"email": ana.email})

    r = client.post(
        "/auth/restablecer",
        json={"token": _token_del_correo(correos), "contrasena": "claveNueva987"},
    )

    assert r.status_code == 200
    assert _login(client, ana.email, "claveNueva987").status_code == 200
    assert _login(client, ana.email, "clave12345").status_code == 401


def test_el_enlace_se_usa_una_sola_vez(client, db, correos):
    ana = _persona(db)
    client.post("/auth/recuperar", json={"email": ana.email})
    token = _token_del_correo(correos)

    primero = client.post("/auth/restablecer", json={"token": token, "contrasena": "claveNueva987"})
    segundo = client.post("/auth/restablecer", json={"token": token, "contrasena": "otraClave12345"})

    assert primero.status_code == 200
    assert segundo.status_code == 400
    assert _login(client, ana.email, "claveNueva987").status_code == 200


def test_cambiar_la_contrasena_desde_la_cuenta_invalida_el_enlace_pendiente(client, db, correos):
    ana = _persona(db)
    client.post("/auth/recuperar", json={"email": ana.email})
    token = _token_del_correo(correos)
    headers = {"Authorization": f"Bearer {crear_token(ana.id)}"}

    r = client.post(
        "/auth/cambiar-contrasena",
        json={"contrasena_actual": "clave12345", "contrasena_nueva": "claveOtra4567"},
        headers=headers,
    )
    assert r.status_code == 200

    r = client.post("/auth/restablecer", json={"token": token, "contrasena": "claveNueva987"})
    assert r.status_code == 400


def test_enlace_vencido_o_invalido(client, db):
    ana = _persona(db)
    vencido = jwt.encode(
        {
            "uid": ana.id,
            "h": "x" * 16,
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        recuperacion._clave(),
        algorithm=ALGORITHM,
    )

    for token in (vencido, "esto-no-es-un-token-valido"):
        r = client.post("/auth/restablecer", json={"token": token, "contrasena": "claveNueva987"})
        assert r.status_code == 400
    assert _login(client, ana.email, "clave12345").status_code == 200


def test_el_enlace_no_sirve_como_sesion_ni_la_sesion_como_enlace(client, db):
    ana = _persona(db)

    enlace = recuperacion.crear_token(ana)
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {enlace}"})
    assert r.status_code == 401

    r = client.post(
        "/auth/restablecer", json={"token": crear_token(ana.id), "contrasena": "claveNueva987"}
    )
    assert r.status_code == 400


def test_la_contrasena_nueva_tiene_que_tener_8_caracteres(client, db, correos):
    ana = _persona(db)
    client.post("/auth/recuperar", json={"email": ana.email})

    r = client.post(
        "/auth/restablecer", json={"token": _token_del_correo(correos), "contrasena": "corta"}
    )

    assert r.status_code == 422


def test_hay_un_limite_de_pedidos_por_hora(client, db, correos):
    ana = _persona(db)

    for _ in range(5):
        assert client.post("/auth/recuperar", json={"email": ana.email}).status_code == 200

    r = client.post("/auth/recuperar", json={"email": ana.email})

    assert r.status_code == 429
    assert len(correos) == 5
