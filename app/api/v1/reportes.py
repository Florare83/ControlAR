# Reportes para el administrador. Por ahora: estadísticas simples de préstamos.
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.auth.dependencies import require_admin
from app.core.db import get_db
from app.models.evento import Evento
from app.models.prestamo import ACTIVO, CERRADO, Prestamo

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes"],
    dependencies=[Depends(require_admin)],
)

# Argentina no usa horario de verano: las fechas se leen en UTC-3.
ZONA_ARGENTINA = timezone(timedelta(hours=-3))

TOP_JUEGOS = 10
MAX_DIAS = 30


def _con_zona(fecha: datetime) -> datetime:
    """Algunas bases devuelven fechas sin zona horaria: se asume UTC."""
    return fecha if fecha.tzinfo else fecha.replace(tzinfo=timezone.utc)


def _dia_argentina(fecha: datetime) -> date:
    return _con_zona(fecha).astimezone(ZONA_ARGENTINA).date()


@router.get("/prestamos")
def reporte_prestamos(
    desde: date | None = None,
    hasta: date | None = None,
    db: Session = Depends(get_db),
):
    """Estadísticas de préstamos según la fecha de retiro (desde / hasta, inclusive):
    totales, juegos más prestados y movimiento por día de evento."""

    if desde and hasta and desde > hasta:
        raise HTTPException(
            status_code=422,
            detail="La fecha «Desde» no puede ser posterior a «Hasta»",
        )

    consulta = db.query(Prestamo)

    if desde:
        inicio = datetime.combine(desde, time.min, tzinfo=ZONA_ARGENTINA)
        consulta = consulta.filter(
            Prestamo.fecha_inicio >= inicio.astimezone(timezone.utc)
        )
    if hasta:
        fin = datetime.combine(
            hasta + timedelta(days=1), time.min, tzinfo=ZONA_ARGENTINA
        )
        consulta = consulta.filter(
            Prestamo.fecha_inicio < fin.astimezone(timezone.utc)
        )

    prestamos = consulta.all()

    # ---- Totales
    hoy = datetime.now(ZONA_ARGENTINA).date()
    activos = [p for p in prestamos if p.estado == ACTIVO]
    cerrados = [p for p in prestamos if p.estado == CERRADO]
    sin_devolver = [p for p in activos if _dia_argentina(p.fecha_inicio) < hoy]

    duraciones = [
        (_con_zona(p.fecha_cierre) - _con_zona(p.fecha_inicio)).total_seconds() / 60
        for p in cerrados
        if p.fecha_cierre is not None
    ]
    duracion_promedio = round(sum(duraciones) / len(duraciones)) if duraciones else None

    resumen = {
        "total": len(prestamos),
        "activos": len(activos),
        "devueltos": len(cerrados),
        "sin_devolver": len(sin_devolver),
        "personas": len({p.dni for p in prestamos}),
        # Minutos entre el retiro y la devolución (solo préstamos devueltos).
        "duracion_promedio_minutos": duracion_promedio,
    }

    # ---- Juegos más prestados
    por_juego: dict = defaultdict(lambda: {"titulo": "", "cantidad": 0})
    for p in prestamos:
        clave = p.juego_id if p.juego_id is not None else f"t:{p.titulo_juego}"
        fila = por_juego[clave]
        fila["titulo"] = p.titulo_juego or "Juego no disponible"
        fila["cantidad"] += 1

    juegos_mas_prestados = sorted(
        por_juego.values(), key=lambda f: (-f["cantidad"], f["titulo"].lower())
    )[:TOP_JUEGOS]

    # ---- Movimiento por día (y evento de ese día, si lo hubo)
    por_dia: dict = defaultdict(lambda: {"cantidad": 0, "dnis": set()})
    for p in prestamos:
        dia = _dia_argentina(p.fecha_inicio)
        por_dia[dia]["cantidad"] += 1
        por_dia[dia]["dnis"].add(p.dni)

    dias = sorted(por_dia.keys(), reverse=True)[:MAX_DIAS]

    eventos_por_dia: dict = defaultdict(list)
    if dias:
        for evento in db.query(Evento).filter(Evento.fecha.in_(dias)).all():
            eventos_por_dia[evento.fecha].append(evento.titulo)

    por_evento = [
        {
            "fecha": dia.isoformat(),
            "evento": " / ".join(eventos_por_dia[dia]) or None,
            "cantidad": por_dia[dia]["cantidad"],
            "personas": len(por_dia[dia]["dnis"]),
        }
        for dia in dias
    ]

    return {
        "resumen": resumen,
        "juegos_mas_prestados": juegos_mas_prestados,
        "por_evento": por_evento,
    }
