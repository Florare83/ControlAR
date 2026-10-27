# Reglas de tiempo de las reservas (funciones puras: no necesitan base de datos).
from datetime import date, datetime, time, timedelta
from types import SimpleNamespace

from app.core.reservas_reglas import ZONA_AR, cierre_reservas, inicio_evento, limite_espera


def _evento(fecha=date(2026, 11, 8), hora=time(17, 0)):
    return SimpleNamespace(fecha=fecha, hora_inicio=hora)


def test_la_espera_termina_30_minutos_despues_del_inicio():
    limite = limite_espera(_evento())
    assert limite == datetime(2026, 11, 8, 17, 30, tzinfo=ZONA_AR)


def test_las_reservas_cierran_a_las_20_del_dia_anterior():
    cierre = cierre_reservas(_evento())
    assert cierre == datetime(2026, 11, 7, 20, 0, tzinfo=ZONA_AR)


def test_el_cierre_cruza_el_cambio_de_mes():
    cierre = cierre_reservas(_evento(fecha=date(2026, 12, 1)))
    assert cierre.date() == date(2026, 11, 30)


def test_evento_sin_hora_no_tiene_inicio_ni_limite():
    evento = _evento(hora=None)
    assert inicio_evento(evento) is None
    assert limite_espera(evento) is None


def test_evento_sin_fecha_no_tiene_cierre():
    assert cierre_reservas(_evento(fecha=None)) is None
