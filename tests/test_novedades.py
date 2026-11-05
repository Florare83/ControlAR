# Novedades por correo: suscripción, baja con enlace y avisos de eventos y juegos nuevos.
from datetime import date, timedelta

import pytest

from app.api.v1.auth import repository as repo_usuarios
from app.core import avisos, suscripciones
from app.core.security import crear_token
from app.models.categoria import Categoria


@pytest.fixture
def correos(monkeypatch):
    """Reemplaza el envío real y junta lo que se habría mandado."""
    enviados = []
    monkeypatch.setattr(
        avisos, "enviar_correo", lambda destino, asunto, cuerpo: enviados.append((destino, asunto, cuerpo))
    )
    return enviados


def _persona(db, email, suscrito=True, activo=True):
    usuario = repo_usuarios.create(db, "Ana Pérez", email, "clave12345", suscrito_novedades=suscrito)
    if not activo:
        usuario.activo = False
        db.commit()
    return usuario


def _evento(dias=10, **extra):
    datos = {
        "titulo": "Torneo de Catan",
        "lugar": "Club",
        "direccion": "Calle 123",
        "fecha": (date.today() + timedelta(days=dias)).isoformat(),
        "hora_texto": "17 a 21 h",
    }
    return {**datos, **extra}


@pytest.fixture
def datos_juego(db):
    categoria = Categoria(nombre="Estrategia")
    db.add(categoria)
    db.commit()
    return {
        "titulo": "Azul",
        "editorial": "Plan B",
        "cantidad_jugadores": "2-4",
        "duracion_minutos": 45,
        "edad_minima": 8,
        "precio": 25000,
        "stock": 3,
        "en_venta": True,
        "categoria_id": categoria.id,
    }


# ------------------------------------------------------------ suscribirse / baja

def test_registro_sin_tildar_no_suscribe(client):
    r = client.post(
        "/auth/register",
        json={"nombre": "Ana", "email": "ana@prueba.com", "contrasena": "clave12345"},
    )

    assert r.status_code == 201
    assert r.json()["suscrito_novedades"] is False


def test_registro_tildando_la_casilla_suscribe(client):
    r = client.post(
        "/auth/register",
        json={
            "nombre": "Ana",
            "email": "ana@prueba.com",
            "contrasena": "clave12345",
            "suscrito_novedades": True,
        },
    )

    assert r.status_code == 201
    assert r.json()["suscrito_novedades"] is True


def test_el_cliente_se_suscribe_y_se_da_de_baja(client, cliente):
    _, headers = cliente

    r = client.put("/auth/me/novedades", json={"suscrito": True}, headers=headers)
    assert r.status_code == 200 and r.json()["suscrito_novedades"] is True
    assert client.get("/auth/me", headers=headers).json()["suscrito_novedades"] is True

    r = client.put("/auth/me/novedades", json={"suscrito": False}, headers=headers)
    assert r.status_code == 200 and r.json()["suscrito_novedades"] is False


def test_sin_sesion_no_se_puede_cambiar_la_suscripcion(client):
    assert client.put("/auth/me/novedades", json={"suscrito": True}).status_code == 401


def test_el_enlace_de_baja_funciona_sin_iniciar_sesion(client, db):
    ana = _persona(db, "ana@prueba.com")
    token = suscripciones.token_baja(ana.id)

    assert client.post("/suscripcion/baja", json={"token": token}).status_code == 200
    db.refresh(ana)
    assert ana.suscrito_novedades is False

    # Repetirlo no da error (el correo puede abrirse dos veces).
    assert client.post("/suscripcion/baja", json={"token": token}).status_code == 200


def test_baja_con_token_invalido(client, db):
    ana = _persona(db, "ana@prueba.com")

    r = client.post("/suscripcion/baja", json={"token": "esto-no-es-un-token-valido"})
    assert r.status_code == 400

    # Un token de SESIÓN tampoco sirve para darse de baja.
    r = client.post("/suscripcion/baja", json={"token": crear_token(ana.id)})
    assert r.status_code == 400
    db.refresh(ana)
    assert ana.suscrito_novedades is True


def test_el_token_de_baja_no_sirve_para_iniciar_sesion(client, db):
    ana = _persona(db, "ana@prueba.com")
    token = suscripciones.token_baja(ana.id)

    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 401


def test_eliminar_la_cuenta_cancela_la_suscripcion(client, cliente, db):
    usuario, headers = cliente
    client.put("/auth/me/novedades", json={"suscrito": True}, headers=headers)

    r = client.request("DELETE", "/auth/me", json={"contrasena": "clave12345"}, headers=headers)

    assert r.status_code == 200
    db.refresh(usuario)
    assert usuario.suscrito_novedades is False


# ------------------------------------------------------------------ eventos nuevos

def test_evento_nuevo_avisa_solo_a_los_suscriptores_activos(client, admin, db, correos):
    _, headers = admin
    ana = _persona(db, "ana@prueba.com")
    _persona(db, "beto@prueba.com", suscrito=False)
    _persona(db, "carla@prueba.com", activo=False)

    r = client.post("/eventos/?avisar=true", json=_evento(), headers=headers)

    assert r.status_code == 201
    assert len(correos) == 1
    destino, asunto, cuerpo = correos[0]
    assert destino == ana.email
    assert "Torneo de Catan" in asunto
    assert "Calle 123" in cuerpo
    # El correo trae el enlace de baja PERSONAL de quien lo recibe.
    assert f"/baja?token={suscripciones.token_baja(ana.id)}" in cuerpo


def test_cada_suscriptor_recibe_su_propio_enlace_de_baja(client, admin, db, correos):
    _, headers = admin
    ana = _persona(db, "ana@prueba.com")
    beto = _persona(db, "beto@prueba.com")

    client.post("/eventos/?avisar=true", json=_evento(), headers=headers)

    por_destino = {destino: cuerpo for destino, _, cuerpo in correos}
    assert suscripciones.token_baja(ana.id) in por_destino[ana.email]
    assert suscripciones.token_baja(beto.id) in por_destino[beto.email]
    assert suscripciones.token_baja(beto.id) not in por_destino[ana.email]


def test_evento_sin_avisar_no_manda_nada(client, admin, db, correos):
    _, headers = admin
    _persona(db, "ana@prueba.com")

    r = client.post("/eventos/", json=_evento(), headers=headers)

    assert r.status_code == 201
    assert correos == []


def test_evento_con_fecha_pasada_no_avisa(client, admin, db, correos):
    _, headers = admin
    _persona(db, "ana@prueba.com")

    r = client.post("/eventos/?avisar=true", json=_evento(dias=-7), headers=headers)

    assert r.status_code == 201
    assert correos == []


def test_si_falla_el_correo_el_evento_igual_se_crea(client, admin, db, monkeypatch):
    _, headers = admin
    _persona(db, "ana@prueba.com")

    def roto(*args):
        raise RuntimeError("Brevo caído")

    monkeypatch.setattr(avisos, "enviar_correo", roto)

    r = client.post("/eventos/?avisar=true", json=_evento(), headers=headers)

    assert r.status_code == 201
    assert len(client.get("/eventos/").json()) == 1


def test_un_cliente_no_puede_crear_eventos_ni_disparar_avisos(client, cliente, db, correos):
    _, headers = cliente
    _persona(db, "ana@prueba.com")

    r = client.post("/eventos/?avisar=true", json=_evento(), headers=headers)

    assert r.status_code == 403
    assert correos == []


# -------------------------------------------------------------------- juegos nuevos

def test_juego_nuevo_avisa_a_los_suscriptores(client, admin, db, correos, datos_juego):
    _, headers = admin
    ana = _persona(db, "ana@prueba.com")
    _persona(db, "beto@prueba.com", suscrito=False)

    r = client.post("/juegos/?avisar=true", json=datos_juego, headers=headers)

    assert r.status_code == 201
    assert len(correos) == 1
    destino, asunto, cuerpo = correos[0]
    assert destino == ana.email
    assert "Azul" in asunto
    assert "Estrategia" in cuerpo and "$25.000,00" in cuerpo
    assert "/baja?token=" in cuerpo


def test_juego_nuevo_sin_avisar_no_manda_nada(client, admin, db, correos, datos_juego):
    _, headers = admin
    _persona(db, "ana@prueba.com")

    r = client.post("/juegos/", json=datos_juego, headers=headers)

    assert r.status_code == 201
    assert correos == []


def test_juego_con_categoria_inexistente_no_avisa(client, admin, db, correos, datos_juego):
    _, headers = admin
    _persona(db, "ana@prueba.com")

    r = client.post("/juegos/?avisar=true", json={**datos_juego, "categoria_id": 999}, headers=headers)

    assert r.status_code == 400
    assert correos == []


# -------------------------------------------- reservas explicadas en el mail del evento

def test_el_mail_del_evento_explica_como_reservar_juegos(client, admin, db, correos):
    _, headers = admin
    _persona(db, "ana@prueba.com")
    datos = _evento(dias=10, permite_reservas=True, hora_inicio="17:00")

    client.post("/eventos/?avisar=true", json=datos, headers=headers)

    cuerpo = correos[0][2]
    assert "Ya se pueden reservar juegos" in cuerpo
    assert "20:00 h" in cuerpo  # hora de cierre de las reservas
    assert "DNI" in cuerpo and "una reserva por persona" in cuerpo.lower()
    assert "/juegos" in cuerpo


def test_si_el_evento_no_permite_reservas_el_mail_no_las_menciona(client, admin, db, correos):
    _, headers = admin
    _persona(db, "ana@prueba.com")

    client.post("/eventos/?avisar=true", json=_evento(), headers=headers)

    assert "reservar juegos" not in correos[0][2]


# ----------------------------------------------------------- evento modificado

def _crear_evento(client, headers, **extra):
    r = client.post("/eventos/", json=_evento(**extra), headers=headers)
    assert r.status_code == 201
    return r.json()


def test_cambiar_la_fecha_avisa_a_suscriptores_y_a_quien_reservo(
    client, admin, db, correos, hacer_juego
):
    _, h_admin = admin
    evento = _crear_evento(client, h_admin, permite_reservas=True, hora_inicio="17:00")
    suscripta = _persona(db, "ana@prueba.com")
    # Beto NO está suscripto pero tiene una reserva activa.
    beto = _persona(db, "beto@prueba.com", suscrito=False)
    _persona(db, "carla@prueba.com", suscrito=False)  # sin reserva: no recibe nada

    from app.models.reserva import Reserva

    juego = hacer_juego("Catan")
    db.add(Reserva(usuario_id=beto.id, evento_id=evento["id"], juego_id=juego.id))
    db.commit()

    nueva = (date.today() + timedelta(days=20)).isoformat()
    r = client.put(f"/eventos/{evento['id']}?avisar=true", json={"fecha": nueva}, headers=h_admin)

    assert r.status_code == 200
    por_destino = {destino: (asunto, cuerpo) for destino, asunto, cuerpo in correos}
    assert set(por_destino) == {suscripta.email, beto.email}
    asunto, cuerpo = por_destino[beto.email]
    assert "Cambios en el evento" in asunto
    assert "Fecha:" in cuerpo and "→" in cuerpo
    # Quien reservó puede cancelar su reserva; quien solo está suscripto no ve ese aviso.
    assert "/mis-reservas" in cuerpo
    assert "/mis-reservas" not in por_destino[suscripta.email][1]
    # Beto no está suscripto: no lleva enlace de baja, sino el motivo del mail.
    assert "/baja?token=" not in cuerpo and "reserva activa" in cuerpo
    assert "/baja?token=" in por_destino[suscripta.email][1]


def test_editar_solo_la_descripcion_no_avisa(client, admin, db, correos):
    _, h_admin = admin
    evento = _crear_evento(client, h_admin)
    _persona(db, "ana@prueba.com")

    r = client.put(
        f"/eventos/{evento['id']}?avisar=true", json={"descripcion": "Nueva descripción"}, headers=h_admin
    )

    assert r.status_code == 200
    assert correos == []


def test_cambiar_el_lugar_sin_avisar_no_manda_nada(client, admin, db, correos):
    _, h_admin = admin
    evento = _crear_evento(client, h_admin)
    _persona(db, "ana@prueba.com")

    r = client.put(f"/eventos/{evento['id']}", json={"lugar": "Otro club"}, headers=h_admin)

    assert r.status_code == 200
    assert correos == []


def test_cambiar_un_evento_pasado_no_avisa(client, admin, db, correos):
    _, h_admin = admin
    evento = _crear_evento(client, h_admin, dias=-10)
    _persona(db, "ana@prueba.com")

    r = client.put(f"/eventos/{evento['id']}?avisar=true", json={"lugar": "Otro club"}, headers=h_admin)

    assert r.status_code == 200
    assert correos == []


# ----------------------------------------------------------- evento cancelado

def test_cancelar_un_evento_avisa_a_los_suscriptores(client, admin, db, correos):
    _, h_admin = admin
    evento = _crear_evento(client, h_admin)
    ana = _persona(db, "ana@prueba.com")
    _persona(db, "beto@prueba.com", suscrito=False)

    r = client.delete(f"/eventos/{evento['id']}?avisar=true", headers=h_admin)

    assert r.status_code == 204
    assert [c[0] for c in correos] == [ana.email]
    assert "Evento cancelado" in correos[0][1]
    assert "Torneo de Catan" in correos[0][2]


def test_eliminar_sin_avisar_no_manda_nada(client, admin, db, correos):
    _, h_admin = admin
    evento = _crear_evento(client, h_admin)
    _persona(db, "ana@prueba.com")

    assert client.delete(f"/eventos/{evento['id']}", headers=h_admin).status_code == 204
    assert correos == []


def test_si_no_se_puede_eliminar_por_reservas_no_se_avisa(client, admin, db, correos, hacer_juego):
    _, h_admin = admin
    evento = _crear_evento(client, h_admin, permite_reservas=True, hora_inicio="17:00")
    ana = _persona(db, "ana@prueba.com")

    from app.models.reserva import Reserva

    db.add(Reserva(usuario_id=ana.id, evento_id=evento["id"], juego_id=hacer_juego("Catan").id))
    db.commit()

    r = client.delete(f"/eventos/{evento['id']}?avisar=true", headers=h_admin)

    assert r.status_code == 409
    assert correos == []


# ------------------------------------------------------------- resumen mensual

def _vender(db, juego, stock=5):
    juego.en_venta = True
    juego.stock = stock
    juego.precio = 12500.5
    db.commit()


def test_el_primer_resumen_solo_lleva_los_proximos_eventos(client, admin, db, correos, hacer_juego):
    _, h_admin = admin
    ana = _persona(db, "ana@prueba.com")
    _crear_evento(client, h_admin)
    hacer_juego("Catan")  # ya existía: sin envío anterior no se cuenta como nuevo

    r = client.post("/suscripcion/resumen/enviar", headers=h_admin)

    assert r.status_code == 200 and r.json()["enviados"] == 1
    destino, asunto, cuerpo = correos[0]
    assert destino == ana.email
    assert "PRÓXIMOS EVENTOS" in cuerpo and "Torneo de Catan" in cuerpo
    assert "JUEGOS NUEVOS" not in cuerpo
    assert "/baja?token=" in cuerpo


def test_el_segundo_resumen_lleva_juegos_nuevos_y_favoritos_que_volvieron(
    client, admin, db, correos, hacer_juego
):
    _, h_admin = admin
    ana = _persona(db, "ana@prueba.com")
    h_ana = {"Authorization": f"Bearer {crear_token(ana.id)}"}
    sin_stock = hacer_juego("Catan")  # sin vender: todavía no se puede comprar
    _crear_evento(client, h_admin)

    client.post("/suscripcion/resumen/enviar", headers=h_admin)  # punto de partida
    correos.clear()

    # Ana lo marcó como favorito; después el juego pasa a estar a la venta.
    assert client.post(f"/favoritos/{sin_stock.id}", headers=h_ana).status_code in (200, 201)
    _vender(db, sin_stock)
    nuevo = hacer_juego("Azul")

    r = client.post("/suscripcion/resumen/enviar", headers=h_admin)

    assert r.json()["enviados"] == 1
    cuerpo = correos[0][2]
    assert "JUEGOS NUEVOS" in cuerpo and "Azul" in cuerpo
    assert "TUS FAVORITOS" in cuerpo and "Catan" in cuerpo
    # Un juego nuevo no se repite como favorito.
    assert nuevo.titulo not in cuerpo.split("TUS FAVORITOS")[1]


def test_el_resumen_no_repite_lo_que_ya_se_conto(client, admin, db, correos, hacer_juego):
    _, h_admin = admin
    _persona(db, "ana@prueba.com")
    client.post("/suscripcion/resumen/enviar", headers=h_admin)  # punto de partida
    hacer_juego("Azul")
    client.post("/suscripcion/resumen/enviar", headers=h_admin)  # lo cuenta
    correos.clear()

    # Sin eventos próximos ni juegos nuevos desde el último envío: no hay nada para mandar.
    r = client.post("/suscripcion/resumen/enviar", headers=h_admin)

    assert r.json()["enviados"] == 0
    assert correos == []


def test_el_resumen_solo_va_a_los_suscriptores(client, admin, db, correos):
    _, h_admin = admin
    ana = _persona(db, "ana@prueba.com")
    _persona(db, "beto@prueba.com", suscrito=False)
    _crear_evento(client, h_admin)

    client.post("/suscripcion/resumen/enviar", headers=h_admin)

    assert [c[0] for c in correos] == [ana.email]


def test_sin_suscriptores_el_resumen_no_guarda_nada(client, admin, db, correos):
    _, h_admin = admin
    _crear_evento(client, h_admin)

    r = client.post("/suscripcion/resumen/enviar", headers=h_admin)
    estado = client.get("/suscripcion/resumen", headers=h_admin).json()

    assert r.json()["enviados"] == 0
    assert estado["primera_vez"] is True and estado["suscriptores"] == 0


def test_el_panel_muestra_que_llevaria_el_resumen(client, admin, db):
    _, h_admin = admin
    _persona(db, "ana@prueba.com")
    _crear_evento(client, h_admin)

    estado = client.get("/suscripcion/resumen", headers=h_admin).json()

    assert estado["suscriptores"] == 1
    assert estado["primera_vez"] is True
    assert estado["pendiente"]["eventos"] == 1


def test_un_cliente_no_puede_ver_ni_mandar_el_resumen(client, cliente, correos):
    _, headers = cliente

    assert client.get("/suscripcion/resumen", headers=headers).status_code == 403
    assert client.post("/suscripcion/resumen/enviar", headers=headers).status_code == 403
    assert client.post("/suscripcion/resumen/enviar").status_code == 401
    assert correos == []


# --------------------------------------------------- resumen automático (cron)

def test_el_automatico_esta_desactivado_sin_cron_clave(client, monkeypatch):
    monkeypatch.delenv("CRON_CLAVE", raising=False)

    r = client.post("/suscripcion/resumen/automatico", headers={"X-Cron-Clave": "lo-que-sea"})

    assert r.status_code == 404


def test_el_automatico_exige_la_clave(client, monkeypatch):
    monkeypatch.setenv("CRON_CLAVE", "clave-secreta")

    assert client.post("/suscripcion/resumen/automatico").status_code == 401
    r = client.post("/suscripcion/resumen/automatico", headers={"X-Cron-Clave": "otra"})
    assert r.status_code == 401


def test_el_automatico_envia_y_no_repite_enseguida(client, admin, db, correos, monkeypatch):
    monkeypatch.setenv("CRON_CLAVE", "clave-secreta")
    _, h_admin = admin
    _persona(db, "ana@prueba.com")
    _crear_evento(client, h_admin)
    cabecera = {"X-Cron-Clave": "clave-secreta"}

    primera = client.post("/suscripcion/resumen/automatico", headers=cabecera)
    segunda = client.post("/suscripcion/resumen/automatico", headers=cabecera)

    assert primera.status_code == 200 and primera.json()["enviados"] == 1
    assert segunda.json()["enviados"] == 0
    assert len(correos) == 1
