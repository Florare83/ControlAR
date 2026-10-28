# Permisos: qué puede hacer cada rol. La seguridad real vive en la API.
import pytest

SOLO_ADMIN = [
    ("get", "/prestamos/"),
    ("get", "/prestamos/historial"),
    ("get", "/reservas/"),
    ("get", "/auth/admin/usuarios"),
]


@pytest.mark.parametrize("metodo,ruta", SOLO_ADMIN)
def test_sin_sesion_da_401(client, metodo, ruta):
    assert getattr(client, metodo)(ruta).status_code == 401


@pytest.mark.parametrize("metodo,ruta", SOLO_ADMIN)
def test_un_cliente_no_entra_a_rutas_de_admin(client, cliente, metodo, ruta):
    _, headers = cliente
    assert getattr(client, metodo)(ruta, headers=headers).status_code == 403


@pytest.mark.parametrize("metodo,ruta", SOLO_ADMIN)
def test_el_admin_si_entra(client, admin, metodo, ruta):
    _, headers = admin
    assert getattr(client, metodo)(ruta, headers=headers).status_code == 200


def test_un_admin_no_puede_quitarse_su_propio_rol(client, admin):
    usuario, headers = admin
    r = client.patch(f"/auth/admin/usuarios/{usuario.id}", json={"es_admin": False}, headers=headers)
    assert r.status_code == 400


def test_registro_y_login(client):
    datos = {"nombre": "Luz Gómez", "email": "luz@prueba.com", "contrasena": "clave12345"}

    assert client.post("/auth/register", json=datos).status_code == 201
    assert client.post("/auth/register", json=datos).status_code == 409  # correo repetido

    login = client.post("/auth/login", data={"username": datos["email"], "password": datos["contrasena"]})
    assert login.status_code == 200
    mala = client.post("/auth/login", data={"username": datos["email"], "password": "incorrecta"})
    assert mala.status_code == 401
