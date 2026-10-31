# Clientes sin cuenta: el administrador los registra por DNI (sin correo) y ve su historial.
from app.core.clientes import cargar_desde_prestamos
from app.models.cliente import Cliente
from app.models.usuario import Usuario

DNI = "30123456"
DATOS = {"dni": DNI, "nombre": "Ana Pérez", "sexo": "Femenino", "telefono": "3874111222"}


def _registrar(client, headers, **cambios):
    return client.post("/clientes/", json={**DATOS, **cambios}, headers=headers)


def _prestar(client, headers, juego, dni=DNI, nombre="Ana Pérez"):
    r = client.post(
        "/prestamos/",
        json={"dni": dni, "nombre": nombre, "sexo": "Femenino", "telefono": "3874111222", "juego_id": juego.id},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


# ------------------------------------------------------------------ registrar

def test_el_admin_registra_un_cliente_sin_correo(client, admin, db):
    _, h = admin

    r = _registrar(client, h)

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["dni"] == DNI and cuerpo["nombre"] == "Ana Pérez"
    assert "email" not in cuerpo
    assert cuerpo["prestamos_total"] == 0 and cuerpo["con_cuenta"] is False


def test_un_cliente_registrado_no_tiene_cuenta_ni_puede_iniciar_sesion(client, admin, db):
    _, h = admin
    _registrar(client, h)

    # No se crea ninguna cuenta: solo la ficha del cliente.
    assert db.query(Cliente).filter(Cliente.dni == DNI).count() == 1
    assert db.query(Usuario).filter(Usuario.dni == DNI).count() == 0

    for usuario in (DNI, "ana@prueba.com"):
        r = client.post("/auth/login", data={"username": usuario, "password": "lo-que-sea"})
        assert r.status_code == 401


def test_solo_el_admin_gestiona_clientes(client, cliente):
    _, h = cliente

    assert _registrar(client, h).status_code == 403
    assert client.get("/clientes/", headers=h).status_code == 403
    assert client.post("/clientes/", json=DATOS).status_code == 401


def test_no_se_repite_el_dni(client, admin):
    _, h = admin
    assert _registrar(client, h).status_code == 201

    r = _registrar(client, h, nombre="Otra Persona")

    assert r.status_code == 409
    assert "DNI" in r.json()["detail"]


def test_dni_invalido_se_rechaza(client, admin):
    _, h = admin

    assert _registrar(client, h, dni="123").status_code == 422
    assert _registrar(client, h, dni="30.123.456").status_code == 422
    assert _registrar(client, h, nombre="A").status_code == 422


def test_sexo_y_telefono_son_opcionales(client, admin):
    _, h = admin

    r = _registrar(client, h, sexo="", telefono="")

    assert r.status_code == 201
    assert r.json()["sexo"] is None and r.json()["telefono"] is None


# --------------------------------------------------------------------- listado

def test_listar_y_buscar_por_nombre_o_dni(client, admin):
    _, h = admin
    _registrar(client, h)
    _registrar(client, h, dni="40999888", nombre="Beto Gómez")

    todos = client.get("/clientes/", headers=h).json()
    assert todos["total"] == 2
    assert [c["nombre"] for c in todos["items"]] == ["Ana Pérez", "Beto Gómez"]  # alfabético

    por_nombre = client.get("/clientes/?buscar=gomez", headers=h).json()
    assert por_nombre["total"] == 0  # sin tildes no coincide: busca el texto tal cual
    por_nombre = client.get("/clientes/?buscar=Gómez", headers=h).json()
    assert [c["dni"] for c in por_nombre["items"]] == ["40999888"]

    por_dni = client.get("/clientes/?buscar=30.123", headers=h).json()
    assert [c["dni"] for c in por_dni["items"]] == [DNI]


def test_el_listado_muestra_sus_prestamos(client, admin, hacer_juego):
    _, h = admin
    _registrar(client, h)
    a, b = hacer_juego("Catan"), hacer_juego("Carcassonne")
    primero = _prestar(client, h, a)
    client.post(f"/prestamos/{primero['id']}/devolver", headers=h)
    _prestar(client, h, b)

    fila = client.get("/clientes/", headers=h).json()["items"][0]

    assert fila["prestamos_total"] == 2
    assert fila["prestamos_activos"] == 1


def test_se_indica_si_el_cliente_ademas_tiene_cuenta_verificada(client, admin, db):
    _, h = admin
    _registrar(client, h)
    assert client.get("/clientes/", headers=h).json()["items"][0]["con_cuenta"] is False

    persona = Usuario(nombre="Ana", email="ana@prueba.com", contrasena_hash="x", dni=DNI, dni_verificado=True)
    db.add(persona)
    db.commit()

    assert client.get("/clientes/", headers=h).json()["items"][0]["con_cuenta"] is True


# ------------------------------------------------- vínculo con los préstamos (DNI)

def test_al_prestar_un_juego_la_persona_queda_registrada(client, admin, hacer_juego, db):
    _, h = admin
    assert db.query(Cliente).count() == 0

    _prestar(client, h, hacer_juego("Catan"))

    ficha = db.query(Cliente).one()
    assert ficha.dni == DNI and ficha.nombre == "Ana Pérez"


def test_prestar_a_alguien_ya_registrado_no_pisa_sus_datos(client, admin, hacer_juego, db):
    _, h = admin
    _registrar(client, h, nombre="Ana María Pérez")

    _prestar(client, h, hacer_juego("Catan"), nombre="Ana P.")

    db.expire_all()
    assert db.query(Cliente).count() == 1
    assert db.query(Cliente).one().nombre == "Ana María Pérez"


def test_los_datos_de_un_cliente_sin_prestamos_se_autocompletan_al_prestar(client, admin):
    _, h = admin
    _registrar(client, h)

    r = client.get(f"/prestamos/buscar-persona/{DNI}", headers=h)

    assert r.json() == {"encontrado": True, **DATOS}


def test_historial_de_un_cliente_registrado_sin_prestamos(client, admin):
    _, h = admin
    _registrar(client, h)

    r = client.get(f"/prestamos/historial/persona?dni={DNI}", headers=h).json()

    assert r["persona"]["nombre"] == "Ana Pérez"
    assert r["resumen"]["total"] == 0 and r["items"] == []


def test_historial_de_un_cliente_con_prestamos(client, admin, hacer_juego):
    _, h = admin
    _registrar(client, h)
    _prestar(client, h, hacer_juego("Catan"))

    r = client.get(f"/prestamos/historial/persona?dni={DNI}", headers=h).json()

    assert r["resumen"]["total"] == 1
    assert r["items"][0]["titulo_juego"] == "Catan"


def test_las_personas_con_prestamos_viejos_se_cargan_como_clientes(client, admin, hacer_juego, db):
    _, h = admin
    _prestar(client, h, hacer_juego("Catan"))
    db.query(Cliente).delete()  # como estaba la base antes de existir los clientes
    db.commit()

    assert cargar_desde_prestamos(db) == 1
    assert cargar_desde_prestamos(db) == 0  # correrlo de nuevo no duplica
    assert db.query(Cliente).one().dni == DNI


# ------------------------------------------------------------ editar y eliminar

def test_editar_no_cambia_el_dni(client, admin):
    _, h = admin
    cliente_id = _registrar(client, h).json()["id"]

    r = client.put(
        f"/clientes/{cliente_id}",
        json={"dni": "99999999", "nombre": "Ana María", "sexo": "Femenino", "telefono": "3875000000"},
        headers=h,
    )

    assert r.status_code == 200
    assert r.json()["dni"] == DNI
    assert r.json()["nombre"] == "Ana María" and r.json()["telefono"] == "3875000000"


def test_se_puede_eliminar_un_cliente_sin_prestamos(client, admin):
    _, h = admin
    cliente_id = _registrar(client, h, dni="11111111").json()["id"]

    assert client.delete(f"/clientes/{cliente_id}", headers=h).status_code == 204
    assert client.get("/clientes/", headers=h).json()["total"] == 0


def test_no_se_elimina_un_cliente_con_prestamos(client, admin, hacer_juego):
    _, h = admin
    cliente_id = _registrar(client, h).json()["id"]
    _prestar(client, h, hacer_juego("Catan"))

    r = client.delete(f"/clientes/{cliente_id}", headers=h)

    assert r.status_code == 409
    assert client.get("/clientes/", headers=h).json()["total"] == 1
