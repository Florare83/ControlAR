# Deja la base de datos lista al iniciar el backend (es seguro correrlo muchas veces).
#
# El problema que resuelve: las tablas de producción pudieron crearse con versiones
# ANTERIORES de los modelos, y create_all() NO modifica tablas que ya existen. Entonces
# el código pide columnas que la tabla no tiene y la API falla con un error 500
# (por ejemplo: "column prestamos.nombre does not exist").
#
# Qué hace, siempre sin borrar ni cambiar datos existentes:
#  1) crea las tablas que falten (pedidos, pedido_items, etc.);
#  2) agrega a las tablas existentes las columnas que el modelo espera y no tienen,
#     completando los registros viejos con un valor razonable;
#  3) en PostgreSQL, quita la obligatoriedad (NOT NULL) de columnas viejas que el modelo
#     ya no usa, para que no impidan guardar registros nuevos;
#  4) intenta crear los índices que falten (si hay datos viejos que los violan, avisa).
# Cualquier error se registra en el log, pero NUNCA impide que el servidor arranque.
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

_RELLENO_POR_TIPO = {
    "String": "",
    "Text": "",
    "Integer": 0,
    "BigInteger": 0,
    "Float": 0.0,
    "Numeric": 0,
    "Boolean": False,
}


def _comillas(nombre: str) -> str:
    return engine.dialect.identifier_preparer.quote(nombre)


def _valor_de_relleno(columna):
    """Valor con el que se completan los registros viejos en una columna nueva."""
    # Una referencia a otra tabla no se inventa: un 0 apuntaría a un registro inexistente.
    if columna.foreign_keys:
        return None

    por_defecto = columna.default
    if por_defecto is not None:
        if por_defecto.is_scalar:
            return por_defecto.arg
        if por_defecto.is_callable:
            return por_defecto.arg(None)  # p. ej. la fecha actual

    if columna.nullable:
        return None

    nombre_tipo = type(columna.type).__name__
    if nombre_tipo in ("DateTime", "DATETIME", "TIMESTAMP"):
        from datetime import datetime, timezone

        return datetime.now(timezone.utc)
    return _RELLENO_POR_TIPO.get(nombre_tipo)


def _agregar_columnas_faltantes() -> dict[str, set[str]]:
    """Devuelve {tabla: columnas agregadas}."""
    agregadas: dict[str, set[str]] = {}
    inspector = inspect(engine)
    existentes = set(inspector.get_table_names())

    for tabla in Base.metadata.sorted_tables:
        if tabla.name not in existentes:
            continue

        columnas_db = {c["name"] for c in inspector.get_columns(tabla.name)}

        for columna in tabla.columns:
            if columna.name in columnas_db:
                continue

            try:
                tipo = columna.type.compile(dialect=engine.dialect)
                with engine.begin() as conexion:
                    # Se agrega sin NOT NULL (la tabla puede tener filas viejas) y
                    # después se completan esas filas.
                    conexion.execute(
                        text(
                            f"ALTER TABLE {_comillas(tabla.name)} "
                            f"ADD COLUMN {_comillas(columna.name)} {tipo}"
                        )
                    )
                    relleno = _valor_de_relleno(columna)
                    if relleno is not None:
                        conexion.execute(
                            text(
                                f"UPDATE {_comillas(tabla.name)} "
                                f"SET {_comillas(columna.name)} = :valor "
                                f"WHERE {_comillas(columna.name)} IS NULL"
                            ),
                            {"valor": relleno},
                        )
                agregadas.setdefault(tabla.name, set()).add(columna.name)
                log.info("Esquema: columna %s.%s agregada.", tabla.name, columna.name)
            except Exception:
                log.exception(
                    "Esquema: no se pudo agregar %s.%s", tabla.name, columna.name
                )

    return agregadas


def _reparar_prestamos(agregadas: dict[str, set[str]]) -> None:
    """Convierte datos del diseño anterior de "prestamos" (titulo_juego / devuelto)."""
    nuevas = agregadas.get("prestamos", set())
    if not nuevas:
        return

    columnas = {c["name"] for c in inspect(engine).get_columns("prestamos")}

    try:
        with engine.begin() as conexion:
            # Los préstamos ya devueltos quedan cerrados (si no, bloquearían el juego).
            if "estado" in nuevas and "devuelto" in columnas:
                conexion.execute(
                    text("UPDATE prestamos SET estado = 'cerrado' WHERE devuelto = :si"),
                    {"si": True},
                )

            # El juego se vincula por su título.
            if "juego_id" in nuevas and "titulo_juego" in columnas:
                conexion.execute(
                    text(
                        "UPDATE prestamos SET juego_id = ("
                        "SELECT j.id FROM juegos j "
                        "WHERE j.titulo = prestamos.titulo_juego "
                        "ORDER BY j.id LIMIT 1) WHERE juego_id IS NULL"
                    )
                )
    except Exception:
        log.exception("Esquema: no se pudieron convertir los préstamos anteriores.")


def _relajar_columnas_viejas() -> None:
    """Quita NOT NULL de columnas que existen en la base pero el modelo ya no usa."""
    if engine.dialect.name != "postgresql":
        return

    inspector = inspect(engine)
    existentes = set(inspector.get_table_names())

    for tabla in Base.metadata.sorted_tables:
        if tabla.name not in existentes:
            continue

        for col in inspector.get_columns(tabla.name):
            if col["name"] in tabla.columns or col["nullable"]:
                continue
            if col.get("default") is not None or col.get("autoincrement"):
                continue
            try:
                with engine.begin() as conexion:
                    conexion.execute(
                        text(
                            f"ALTER TABLE {_comillas(tabla.name)} "
                            f"ALTER COLUMN {_comillas(col['name'])} DROP NOT NULL"
                        )
                    )
                log.info(
                    "Esquema: %s.%s ya no es obligatoria (columna vieja).",
                    tabla.name,
                    col["name"],
                )
            except Exception:
                log.exception(
                    "Esquema: no se pudo relajar %s.%s", tabla.name, col["name"]
                )


def _crear_indices_faltantes() -> None:
    inspector = inspect(engine)
    existentes = set(inspector.get_table_names())

    for tabla in Base.metadata.sorted_tables:
        if tabla.name not in existentes:
            continue

        for indice in tabla.indexes:
            try:
                indice.create(bind=engine, checkfirst=True)
            except Exception:
                log.warning(
                    "Esquema: no se pudo crear el índice %s "
                    "(¿datos viejos que lo incumplen?).",
                    indice.name,
                )


def _recrear_prestamos_si_esta_vacia() -> None:
    """Si "prestamos" tiene un diseño distinto al del modelo Y no tiene ningún registro,
    se vuelve a crear desde cero: queda con sus claves, índices y reglas correctas.
    Si tiene aunque sea una fila, NO se toca (se repara después sumando columnas)."""
    inspector = inspect(engine)
    if "prestamos" not in inspector.get_table_names():
        return

    esperadas = {c.name for c in Prestamo.__table__.columns}
    actuales = {c["name"] for c in inspector.get_columns("prestamos")}
    if esperadas == actuales:
        return  # ya coincide con el modelo

    try:
        with engine.begin() as conexion:
            filas = conexion.execute(text("SELECT COUNT(*) FROM prestamos")).scalar()
            if filas:
                return
            Prestamo.__table__.drop(bind=conexion)
        log.info("Esquema: tabla 'prestamos' vacía con diseño anterior; se recreará.")
    except Exception:
        log.exception("Esquema: no se pudo recrear la tabla 'prestamos'.")


def asegurar_esquema() -> None:
    try:
        # Antes de create_all, para que la tabla vacía se vuelva a crear bien.
        _recrear_prestamos_si_esta_vacia()

        Base.metadata.create_all(bind=engine)

        agregadas = _agregar_columnas_faltantes()

        # Mensajes de contacto: si la tabla vieja tenía "fecha_creacion", se conserva
        # esa fecha original en la columna nueva "creado_en".
        if "creado_en" in agregadas.get("mensajes_contacto", set()):
            columnas = {c["name"] for c in inspect(engine).get_columns("mensajes_contacto")}
            if "fecha_creacion" in columnas:
                with engine.begin() as conexion:
                    conexion.execute(
                        text("UPDATE mensajes_contacto SET creado_en = fecha_creacion")
                    )

        _reparar_prestamos(agregadas)
        _relajar_columnas_viejas()
        _crear_indices_faltantes()
    except Exception:
        # Nunca debe impedir que el servidor arranque.
        log.exception("Esquema: no se pudo verificar la base de datos.")
