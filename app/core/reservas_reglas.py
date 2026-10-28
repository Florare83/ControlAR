# Reglas de tiempo de las reservas. Argentina no usa horario de verano, así que
# alcanza con un desfase fijo de UTC-3 (no depende de la base de zonas horarias).
from datetime import datetime, time, timedelta, timezone

ZONA_AR = timezone(timedelta(hours=-3))

# La reserva se guarda hasta 30 minutos después del inicio del evento.
ESPERA = timedelta(minutes=30)

# Las reservas se aceptan hasta las 20:00 del día anterior al evento.
HORA_CIERRE = time(20, 0)


def ahora() -> datetime:
    return datetime.now(ZONA_AR)


def inicio_evento(evento) -> datetime | None:
    if evento.fecha is None or evento.hora_inicio is None:
        return None
    return datetime.combine(evento.fecha, evento.hora_inicio.replace(tzinfo=None), tzinfo=ZONA_AR)


def limite_espera(evento) -> datetime | None:
    inicio = inicio_evento(evento)
    return inicio + ESPERA if inicio else None


def cierre_reservas(evento) -> datetime | None:
    if evento.fecha is None:
        return None
    return datetime.combine(evento.fecha - timedelta(days=1), HORA_CIERRE, tzinfo=ZONA_AR)
