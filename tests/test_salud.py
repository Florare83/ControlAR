# La API responde en la raíz y en /health (lo usa Render para comprobar que está viva).


def test_la_raiz_devuelve_un_objeto(client):
    r = client.get("/")

    assert r.status_code == 200
    assert r.json() == {"mensaje": "Bienvenido a la API de Juegos"}


def test_health(client):
    r = client.get("/health")

    assert r.status_code == 200
    assert r.json() == {"estado": "ok"}
