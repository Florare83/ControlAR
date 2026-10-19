# Deja la base de datos lista al iniciar el backend (es seguro correrlo muchas veces):
#  1) crea las tablas que falten (pedidos, pedido_items, mensajes_contacto, etc.);
#  2) agrega a "mensajes_contacto" las columnas que le falten. La tabla pudo haberse
#     creado con una versión anterior del modelo (con "fecha_creacion" y sin "leido"),
#     y create_all NO modifica tablas que ya existen.
# No borra ni cambia datos existentes.
import logging

from sqlalchemy import inspect, text

from app.core.db import Base, engine

# Importar los modelos es lo que permite a create_all conocer las tablas.
from app.models.categoria import Categoria  # noqa: F401
from app.models.juego import Juego  # noqa: F401
from app.models.usuario import Usuario  # noqa: F401
from app.models.prestamo import Prestamo  # noqa: F401
from app.models.favorito import Favorito  # noqa: F401
from app.models.pedido import Pedido, PedidoItem  # noqa: F401
from app.models.mensaje import MensajeContacto  # noqa: F401

log = logging.getLogger("uvicorn.error")


def _columnas(tabla: str) -> set[str]:
    return {c["name"] for c in inspect(engine).get_columns(tabla)}


def asegurar_esquema() -> None:
    Base.metadata.create_all(bind=engine)

    if "mensajes_contacto" not in inspect(engine).get_table_names():
        return

    columnas = _columnas("mensajes_contacto")

    with engine.begin() as conexion:
        if "leido" not in columnas:
            conexion.execute(
                text(
                    "ALTER TABLE mensajes_contacto "
                    "ADD COLUMN leido BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )
            log.info("mensajes_contacto: columna 'leido' agregada.")

        if "creado_en" not in columnas:
            conexion.execute(
                text("ALTER TABLE mensajes_contacto ADD COLUMN creado_en TIMESTAMP WITH TIME ZONE")
            )
            # Conserva la fecha original de los mensajes ya recibidos.
            if "fecha_creacion" in columnas:
                conexion.execute(
                    text("UPDATE mensajes_contacto SET creado_en = fecha_creacion")
                )
            log.info("mensajes_contacto: columna 'creado_en' agregada.")
