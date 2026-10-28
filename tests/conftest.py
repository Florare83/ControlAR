# Configuración común de las pruebas.
#
# IMPORTANTE: las variables de entorno se definen ANTES de importar "app", porque
# app/core/db.py crea el motor y app/core/security.py lee SECRET_KEY al importarse.
# Las pruebas usan un SQLite temporal: nunca tocan la base real.
import os
import tempfile
from datetime import date, time, timedelta

_directorio = tempfile.mkdtemp(prefix="controlar_tests_")
os.environ["DATABASE_URL"] = f"sqlite:///{_directorio}/test.db"
os.environ["SECRET_KEY"] = "clave-solo-para-pruebas"

import pytest
from fastapi.testclient import TestClient

from app.core.db import Base, SessionLocal, engine
from app.core import asegurar_esquema  # noqa: F401  (importa todos los modelos)
from app.main import app
from app.api.v1.auth import repository as repo_usuarios
from app.core.limitador import limite_login
from app.core.security import crear_token
from app.models.categoria import Categoria
from app.models.evento import Evento
from app.models.juego import Juego


@pytest.fixture(autouse=True)
def base_limpia():
    """Cada prueba arranca con las tablas vacías."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def limite_login_limpio():
    """Los intentos fallidos de login viven en memoria: cada prueba arranca sin ninguno."""
    limite_login.reiniciar()
    yield


@pytest.fixture
def db():
    sesion = SessionLocal()
    try:
        yield sesion
    finally:
        sesion.close()


@pytest.fixture
def client():
    # Sin "with": así NO se ejecuta el evento startup (asegurar_esquema).
    return TestClient(app)


def _crear_usuario(db, email, es_admin):
    usuario = repo_usuarios.create(db, "Usuaria Prueba", email, "clave12345", es_admin=es_admin)
    return usuario, {"Authorization": f"Bearer {crear_token(usuario.id)}"}


@pytest.fixture
def admin(db):
    return _crear_usuario(db, "admin@prueba.com", True)


@pytest.fixture
def cliente(db):
    return _crear_usuario(db, "cliente@prueba.com", False)


@pytest.fixture
def cliente2(db):
    return _crear_usuario(db, "cliente2@prueba.com", False)


@pytest.fixture
def hacer_juego(db):
    """Fábrica de juegos prestables: hacer_juego("Catan")."""
    categoria = Categoria(nombre="Estrategia")
    db.add(categoria)
    db.commit()

    def _hacer(titulo, se_presta=True):
        juego = Juego(
            titulo=titulo,
            cantidad_jugadores="2-4",
            duracion_minutos=60,
            edad_minima=8,
            precio=1000,
            stock=1,
            se_presta=se_presta,
            categoria_id=categoria.id,
        )
        db.add(juego)
        db.commit()
        db.refresh(juego)
        return juego

    return _hacer


@pytest.fixture
def evento_con_reservas(db):
    """Evento dentro de 3 días: las reservas todavía están abiertas."""
    evento = Evento(
        titulo="Tarde de juegos",
        fecha=date.today() + timedelta(days=3),
        hora_inicio=time(17, 0),
        hora_texto="17 a 21 h",
        lugar="Club",
        direccion="Calle 123",
        permite_reservas=True,
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento
