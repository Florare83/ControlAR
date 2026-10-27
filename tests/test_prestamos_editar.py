# Editar los datos de un préstamo (corregir DNI, nombre, teléfono, etc.).
DATOS = {"dni": "30123456", "nombre": "Ana Pérez", "sexo": "Femenino", "telefono": "3874111222"}


def _prestar(client, headers, juego_id, **extra):
    r = client.post("/prestamos/", json={**DATOS, "juego_id": juego_id, **extra}, headers=headers)
    assert r.status_code == 201
    return r.json()


def test_se_corrigen_los_datos_de_un_prestamo_activo(client, admin, hacer_juego):
    _, h = admin
    p = _prestar(client, h, hacer_juego("Catan").id)

    r = client.patch(
        f"/prestamos/{p['id']}",
        json={**DATOS, "nombre": "Ana María Pérez", "dni": "30123457",
              "telefono": "3875000111", "email": "ANA@Mail.com", "sexo": "femenino"},
        headers=h,
    )

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["nombre"] == "Ana María Pérez"
    assert cuerpo["dni"] == "30123457"
    assert cuerpo["telefono"] == "3875000111"
    assert cuerpo["email"] == "ana@mail.com"
    assert cuerpo["sexo"] == "Femenino"
    assert cuerpo["estado"] == "activo"
    assert cuerpo["juego"]["titulo"] == "Catan"


def test_se_puede_borrar_el_email(client, admin, hacer_juego):
    _, h = admin
    p = _prestar(client, h, hacer_juego("Catan").id, email="ana@mail.com")

    r = client.patch(f"/prestamos/{p['id']}", json={**DATOS, "email": None}, headers=h)

    assert r.status_code == 200
    assert r.json()["email"] is None


def test_tambien_se_edita_un_prestamo_cerrado(client, admin, hacer_juego):
    _, h = admin
    p = _prestar(client, h, hacer_juego("Catan").id)
    assert client.post(f"/prestamos/{p['id']}/devolver", headers=h).status_code == 200

    r = client.patch(f"/prestamos/{p['id']}", json={**DATOS, "nombre": "Ana P."}, headers=h)

    assert r.status_code == 200
    assert r.json()["nombre"] == "Ana P."
    assert r.json()["estado"] == "cerrado"


def test_no_se_puede_usar_el_dni_de_otro_prestamo_activo(client, admin, hacer_juego):
    _, h = admin
    _prestar(client, h, hacer_juego("Catan").id)
    otro = _prestar(client, h, hacer_juego("Carcassonne").id, dni="40999888", nombre="Beto Luz")

    r = client.patch(f"/prestamos/{otro['id']}", json={**DATOS, "nombre": "Beto Luz"}, headers=h)

    assert r.status_code == 409
    assert "préstamo activo" in r.json()["detail"]


def test_datos_invalidos_dan_422(client, admin, hacer_juego):
    _, h = admin
    p = _prestar(client, h, hacer_juego("Catan").id)

    assert client.patch(f"/prestamos/{p['id']}", json={**DATOS, "dni": "12"}, headers=h).status_code == 422
    assert client.patch(f"/prestamos/{p['id']}", json={**DATOS, "sexo": "Otro"}, headers=h).status_code == 422


def test_prestamo_inexistente_da_404(client, admin):
    _, h = admin
    assert client.patch("/prestamos/9999", json=DATOS, headers=h).status_code == 404


def test_un_cliente_no_puede_editar_prestamos(client, admin, cliente, hacer_juego):
    _, h_admin = admin
    _, h_cliente = cliente
    p = _prestar(client, h_admin, hacer_juego("Catan").id)

    assert client.patch(f"/prestamos/{p['id']}", json=DATOS, headers=h_cliente).status_code == 403
    assert client.patch(f"/prestamos/{p['id']}", json=DATOS).status_code == 401
