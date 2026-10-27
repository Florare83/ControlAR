# Préstamos: reglas críticas de negocio.
DATOS = {"dni": "30123456", "nombre": "Ana Pérez", "sexo": "Femenino", "telefono": "3874111222"}


def _prestar(client, headers, juego_id, **extra):
    return client.post("/prestamos/", json={**DATOS, "juego_id": juego_id, **extra}, headers=headers)


def test_se_registra_un_prestamo_valido(client, admin, hacer_juego):
    _, headers = admin
    juego = hacer_juego("Catan")

    r = _prestar(client, headers, juego.id)

    assert r.status_code == 201
    assert r.json()["estado"] == "activo"
    assert r.json()["juego"]["titulo"] == "Catan"


def test_una_persona_no_puede_tener_dos_prestamos_activos(client, admin, hacer_juego):
    _, headers = admin
    a, b = hacer_juego("Catan"), hacer_juego("Carcassonne")

    assert _prestar(client, headers, a.id).status_code == 201
    r = _prestar(client, headers, b.id)  # mismo DNI, otro juego

    assert r.status_code == 409
    assert "préstamo activo" in r.json()["detail"]


def test_un_juego_no_se_presta_a_dos_personas_a_la_vez(client, admin, hacer_juego):
    _, headers = admin
    juego = hacer_juego("Catan")

    assert _prestar(client, headers, juego.id).status_code == 201
    r = _prestar(client, headers, juego.id, dni="40999888")  # otra persona

    assert r.status_code == 409
    assert "ya está en préstamo" in r.json()["detail"]


def test_un_juego_fuera_de_la_ludoteca_no_se_presta(client, admin, hacer_juego):
    _, headers = admin
    juego = hacer_juego("Solo venta", se_presta=False)

    r = _prestar(client, headers, juego.id)

    assert r.status_code == 400


def test_tras_devolver_el_juego_y_la_persona_quedan_libres(client, admin, hacer_juego):
    _, headers = admin
    juego = hacer_juego("Catan")
    prestamo = _prestar(client, headers, juego.id).json()

    devuelto = client.post(f"/prestamos/{prestamo['id']}/devolver", headers=headers)
    assert devuelto.status_code == 200
    assert devuelto.json()["estado"] == "cerrado"

    # Devolver dos veces no está permitido...
    assert client.post(f"/prestamos/{prestamo['id']}/devolver", headers=headers).status_code == 409
    # ...pero la misma persona ya puede volver a pedir el mismo juego.
    assert _prestar(client, headers, juego.id).status_code == 201


def test_datos_invalidos_se_rechazan(client, admin, hacer_juego):
    _, headers = admin
    juego = hacer_juego("Catan")

    assert _prestar(client, headers, juego.id, dni="12").status_code == 422
    assert _prestar(client, headers, juego.id, sexo="otro").status_code == 422
    assert _prestar(client, headers, juego.id, telefono="abc").status_code == 422
