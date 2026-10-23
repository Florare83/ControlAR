# Carga los eventos que antes estaban escritos en src/data/eventos.js.
# Se ejecuta solo, una única vez, cuando se crea la tabla "eventos" (ver asegurar_esquema).
# También se puede correr a mano; solo carga si la tabla está vacía:
#   python -m app.core.cargar_eventos
from datetime import date, time

from app.core.db import SessionLocal
from app.models.evento import Evento

EVENTOS_INICIALES = [
    dict(
        tipo="Tarde de juegos",
        titulo="Tarde de juegos",
        descripcion="Una tarde mensual para descubrir juegos de mesa modernos.",
        fecha=date(2026, 10, 25),
        hora_inicio=time(17, 0),
        hora_texto="17 a 21 h",
        lugar="Fundación Copaipa",
        direccion="Zuviría 291",
        aporte="Aporte mínimo: $2.000 por persona",
        permite_reservas=True,
    ),
    dict(
        tipo="Tarde de juegos",
        titulo="Tarde de juegos",
        descripcion="Una tarde mensual para descubrir juegos de mesa modernos",
        fecha=date(2026, 9, 27),
        hora_inicio=time(17, 0),
        hora_texto="17 a 21 h",
        lugar="Fundación Copaipa",
        direccion="Zuviría 291",
        permite_reservas=True,
    ),
    dict(
        tipo="Torneo",
        titulo="Torneo de Catan",
        descripcion="Torneo abierto a todos los niveles. Inscripción previa por Whatsapp",
        fecha=date(2026, 9, 27),
        hora_inicio=time(17, 0),
        hora_texto="17 a 21 h",
        lugar="Fundación Copaipa",
        direccion="Zuviría 291",
        inscripcion=True,
    ),
    dict(
        tipo="Encuentro",
        titulo="Encuentro Provincial de Juegos de Mesa",
        descripcion="Clubes y Editoriales brindando sus servicios al público en general",
        fecha=None,
        fecha_texto="Durante junio",
        mes_corto="JUN",
        hora_texto="12 a 22 h",
        lugar="Usina Cultural",
        direccion="España 1-98",
    ),
]


def sembrar_eventos_iniciales() -> None:
    db = SessionLocal()
    try:
        if db.query(Evento.id).first() is not None:
            return
        db.add_all(Evento(**datos) for datos in EVENTOS_INICIALES)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    sembrar_eventos_iniciales()
    print("Eventos verificados correctamente.")
