# Límite de intentos fallidos de login: frena el adivinar contraseñas.
from app.core.limitador import LimiteIntentos, limite_login


def _login(client, email, clave):
    return client.post("/auth/login", data={"username": email, "password": clave})


def test_tras_muchos_intentos_fallidos_se_bloquea_la_cuenta(client, cliente):
    usuario, _ = cliente

    for _ in range(limite_login.maximo):
        assert _login(client, "cliente@prueba.com", "incorrecta").status_code == 401

    r = _login(client, "cliente@prueba.com", "incorrecta")
    assert r.status_code == 429
    assert "Demasiados intentos" in r.json()["detail"]
    assert int(r.headers["Retry-After"]) > 0

    # Durante el bloqueo ni siquiera la contraseña correcta pasa.
    assert _login(client, "cliente@prueba.com", "clave12345").status_code == 429


def test_el_bloqueo_no_afecta_a_otras_cuentas(client, cliente, cliente2):
    for _ in range(limite_login.maximo):
        _login(client, "cliente@prueba.com", "incorrecta")

    assert _login(client, "cliente@prueba.com", "incorrecta").status_code == 429
    assert _login(client, "cliente2@prueba.com", "clave12345").status_code == 200


def test_un_login_correcto_borra_los_fallos_anteriores(client, cliente):
    for _ in range(limite_login.maximo - 1):
        _login(client, "cliente@prueba.com", "incorrecta")

    assert _login(client, "cliente@prueba.com", "clave12345").status_code == 200

    # Si no se hubieran borrado, este intento ya estaría bloqueado.
    for _ in range(limite_login.maximo):
        assert _login(client, "cliente@prueba.com", "incorrecta").status_code == 401


def test_el_limite_se_libera_cuando_pasa_la_ventana(monkeypatch):
    import app.core.limitador as modulo

    ahora = [1000.0]
    monkeypatch.setattr(modulo.time, "monotonic", lambda: ahora[0])

    limite = LimiteIntentos(maximo=2, ventana_segundos=60)
    limite.registrar_fallo("a")
    limite.registrar_fallo("a")
    assert limite.segundos_de_espera("a") > 0

    ahora[0] += 61
    assert limite.segundos_de_espera("a") == 0
