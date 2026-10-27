# Listado de usuarios del admin: búsqueda por DNI y datos para comparar al verificar.
DNI = "30123456"


def _registrar(client, email, nombre, dni=None):
    datos = {"nombre": nombre, "email": email, "contrasena": "clave12345"}
    if dni:
        datos["dni"] = dni
    r = client.post("/auth/register", json=datos)
    assert r.status_code == 201, r.text
    return r.json()


def _prestar(client, headers, juego, dni=DNI, nombre="Ana Pérez"):
    r = client.post(
        "/prestamos/",
        json={"dni": dni, "nombre": nombre, "sexo": "Femenino",
              "telefono": "3874111222", "juego_id": juego.id},
        headers=headers,
    )
    assert r.status_code == 201, r.text


def _listar(client, headers, buscar=""):
    r = client.get("/auth/admin/usuarios", params={"buscar": buscar}, headers=headers)
    assert r.status_code == 200
    return r.json()


def test_se_busca_un_usuario_por_dni_con_o_sin_puntos(client, admin):
    _, h = admin
    _registrar(client, "ana@prueba.com", "Ana Pérez", dni=DNI)
    _registrar(client, "beto@prueba.com", "Beto Luz", dni="40999888")

    for texto in ("30123456", "30.123.456", "30 123 456"):
        encontrados = _listar(client, h, texto)
        assert [u["email"] for u in encontrados] == ["ana@prueba.com"], texto


def test_los_comodines_de_la_busqueda_no_funcionan_como_comodines(client, admin):
    _, h = admin
    _registrar(client, "ana@prueba.com", "Ana Pérez", dni=DNI)

    assert _listar(client, h, "%") == []
    assert _listar(client, h, "_") == []


def test_se_ve_a_nombre_de_quien_estan_los_prestamos_del_dni(client, admin, hacer_juego):
    _, h = admin
    _prestar(client, h, hacer_juego("Catan"), nombre="Ana Pérez")
    _registrar(client, "intruso@prueba.com", "Otra Persona", dni=DNI)
    _registrar(client, "sin@prueba.com", "Sin Dni")

    por_email = {u["email"]: u for u in _listar(client, h, "prueba.com")}

    intruso = por_email["intruso@prueba.com"]
    assert intruso["prestamos_cantidad"] == 1
    assert intruso["prestamo_nombre"] == "Ana Pérez"

    sin = por_email["sin@prueba.com"]
    assert sin["prestamos_cantidad"] == 0
    assert sin["prestamo_nombre"] is None


def test_el_listado_no_falla_con_cuentas_eliminadas(client, admin):
    _, h = admin
    _registrar(client, "ana@prueba.com", "Ana Pérez", dni=DNI)
    login = client.post("/auth/login", data={"username": "ana@prueba.com", "password": "clave12345"})
    h_ana = {"Authorization": f"Bearer {login.json()['access_token']}"}

    r = client.request("DELETE", "/auth/me", json={"contrasena": "clave12345"}, headers=h_ana)
    assert r.status_code == 200

    emails = [u["email"] for u in _listar(client, h)]
    assert any(e.endswith("@invalid.local") for e in emails)
