# "Mis préstamos" se cruza por DNI, pero solo cuando un administrador verificó el DNI
# (mirando el documento físico). Así nadie ve préstamos ajenos escribiendo un DNI que no es suyo.
from app.api.v1.auth import repository as repo_usuarios
from app.core.security import crear_token

DNI_ANA = "30123456"
DATOS_PRESTAMO = {"nombre": "Ana Pérez", "sexo": "Femenino", "telefono": "3874111222"}


def _registrar(client, email, dni=None):
    datos = {"nombre": "Persona Prueba", "email": email, "contrasena": "clave12345"}
    if dni is not None:
        datos["dni"] = dni
    r = client.post("/auth/register", json=datos)
    assert r.status_code == 201, r.text
    login = client.post("/auth/login", data={"username": email, "password": "clave12345"})
    return r.json(), {"Authorization": f"Bearer {login.json()['access_token']}"}


def _prestar(client, headers_admin, juego, dni=DNI_ANA):
    r = client.post(
        "/prestamos/",
        json={**DATOS_PRESTAMO, "dni": dni, "juego_id": juego.id},
        headers=headers_admin,
    )
    assert r.status_code == 201, r.text


def _verificar(client, headers_admin, usuario_id, valor=True):
    return client.patch(
        f"/auth/admin/usuarios/{usuario_id}",
        json={"dni_verificado": valor},
        headers=headers_admin,
    )


def _mis_prestamos(client, headers):
    r = client.get("/mi-cuenta/prestamos", headers=headers)
    assert r.status_code == 200
    return r.json()


# ------------------------------------------------------------------ registro

def test_el_registro_guarda_el_dni_normalizado_y_sin_verificar(client):
    usuario, headers = _registrar(client, "ana@prueba.com", dni="30.123.456")

    assert usuario["dni"] == DNI_ANA
    assert usuario["dni_verificado"] is False
    assert client.get("/auth/me", headers=headers).json()["dni"] == DNI_ANA


def test_el_dni_es_opcional_en_la_api_y_se_valida_si_viene(client):
    # El alta desde el panel de usuarios no manda DNI.
    usuario, _ = _registrar(client, "sin-dni@prueba.com")
    assert usuario["dni"] is None

    r = client.post(
        "/auth/register",
        json={"nombre": "Pepe", "email": "pepe@prueba.com", "contrasena": "clave12345", "dni": "123"},
    )
    assert r.status_code == 422


# ------------------------------------------------------------------ el cruce

def test_sin_verificar_no_se_ven_prestamos_aunque_se_use_el_dni_ajeno(
    client, admin, hacer_juego
):
    """El ataque: alguien se registra escribiendo el DNI de otra persona."""
    _, h_admin = admin
    _prestar(client, h_admin, hacer_juego("Catan"))

    _, h_intruso = _registrar(client, "ana@prueba.com", dni=DNI_ANA)

    assert _mis_prestamos(client, h_intruso) == []


def test_verificado_el_dni_aparecen_solo_sus_prestamos(client, admin, hacer_juego):
    _, h_admin = admin
    _prestar(client, h_admin, hacer_juego("Catan"), dni=DNI_ANA)
    _prestar(client, h_admin, hacer_juego("Carcassonne"), dni="40999888")  # otra persona

    usuario, h_ana = _registrar(client, "ana@prueba.com", dni=DNI_ANA)
    assert _verificar(client, h_admin, usuario["id"]).status_code == 200

    prestamos = _mis_prestamos(client, h_ana)
    assert [p["titulo_juego"] for p in prestamos] == ["Catan"]


def test_el_cruce_no_depende_del_email_del_prestamo(client, admin, hacer_juego):
    _, h_admin = admin
    _prestar(client, h_admin, hacer_juego("Catan"))

    usuario, h_ana = _registrar(client, "ana@prueba.com", dni=DNI_ANA)
    _verificar(client, h_admin, usuario["id"])

    assert len(_mis_prestamos(client, h_ana)) == 1


# ------------------------------------------------------------------ cambios del DNI

def test_cambiar_el_dni_quita_la_verificacion(client, admin, hacer_juego):
    _, h_admin = admin
    _prestar(client, h_admin, hacer_juego("Catan"))
    usuario, h_ana = _registrar(client, "ana@prueba.com", dni=DNI_ANA)
    _verificar(client, h_admin, usuario["id"])
    assert len(_mis_prestamos(client, h_ana)) == 1

    r = client.put("/auth/me/dni", json={"dni": "40999888"}, headers=h_ana)

    assert r.status_code == 200
    assert r.json()["dni_verificado"] is False
    assert _mis_prestamos(client, h_ana) == []


def test_guardar_el_mismo_dni_no_quita_la_verificacion(client, admin):
    _, h_admin = admin
    usuario, h_ana = _registrar(client, "ana@prueba.com", dni=DNI_ANA)
    _verificar(client, h_admin, usuario["id"])

    r = client.put("/auth/me/dni", json={"dni": "30.123.456"}, headers=h_ana)

    assert r.json()["dni_verificado"] is True


def test_una_cuenta_sin_dni_puede_cargarlo_despues(client):
    _, headers = _registrar(client, "vieja@prueba.com")

    r = client.put("/auth/me/dni", json={"dni": DNI_ANA}, headers=headers)

    assert r.status_code == 200
    assert r.json()["dni"] == DNI_ANA
    assert r.json()["dni_verificado"] is False


# ------------------------------------------------------------------ reglas de la verificación

def test_no_se_puede_verificar_una_cuenta_sin_dni(client, admin):
    _, h_admin = admin
    usuario, _ = _registrar(client, "sin-dni@prueba.com")

    assert _verificar(client, h_admin, usuario["id"]).status_code == 400


def test_un_cliente_no_puede_verificarse_a_si_mismo(client):
    usuario, headers = _registrar(client, "ana@prueba.com", dni=DNI_ANA)

    r = _verificar(client, headers, usuario["id"])

    assert r.status_code == 403


def test_un_dni_solo_puede_estar_verificado_en_una_cuenta(client, admin):
    _, h_admin = admin
    primera, _ = _registrar(client, "ana@prueba.com", dni=DNI_ANA)
    segunda, _ = _registrar(client, "impostora@prueba.com", dni=DNI_ANA)  # sin verificar: permitido

    assert _verificar(client, h_admin, primera["id"]).status_code == 200
    r = _verificar(client, h_admin, segunda["id"])

    assert r.status_code == 409
    assert "ana@prueba.com" in r.json()["detail"]


def test_quitar_la_verificacion_libera_el_dni(client, admin):
    _, h_admin = admin
    primera, _ = _registrar(client, "ana@prueba.com", dni=DNI_ANA)
    segunda, _ = _registrar(client, "ana2@prueba.com", dni=DNI_ANA)
    _verificar(client, h_admin, primera["id"])

    assert _verificar(client, h_admin, primera["id"], valor=False).status_code == 200
    assert _verificar(client, h_admin, segunda["id"]).status_code == 200


def test_la_lista_de_usuarios_del_admin_muestra_dni_y_estado(client, admin):
    _, h_admin = admin
    usuario, _ = _registrar(client, "ana@prueba.com", dni=DNI_ANA)
    _verificar(client, h_admin, usuario["id"])

    lista = client.get("/auth/admin/usuarios?buscar=ana@prueba.com", headers=h_admin).json()

    assert lista[0]["dni"] == DNI_ANA
    assert lista[0]["dni_verificado"] is True


def test_eliminar_la_cuenta_libera_el_dni(client, admin):
    _, h_admin = admin
    primera, h_ana = _registrar(client, "ana@prueba.com", dni=DNI_ANA)
    _verificar(client, h_admin, primera["id"])
    segunda, _ = _registrar(client, "nueva@prueba.com", dni=DNI_ANA)

    r = client.request("DELETE", "/auth/me", json={"contrasena": "clave12345"}, headers=h_ana)
    assert r.status_code == 200

    assert _verificar(client, h_admin, segunda["id"]).status_code == 200
