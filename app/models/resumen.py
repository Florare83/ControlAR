from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, Text

from app.core.db import Base


def _ahora():
    return datetime.now(timezone.utc)


class ResumenNovedades(Base):
    """Un envío del resumen de novedades. El último sirve de punto de partida para el
    siguiente: de ahí sale qué juegos son nuevos y cuáles de los favoritos de cada persona
    recién pasaron a estar a la venta."""

    __tablename__ = "resumenes_novedades"

    id = Column(Integer, primary_key=True, index=True)
    enviado_en = Column(DateTime(timezone=True), nullable=False, default=_ahora)

    # Id del juego más nuevo que existía al enviarlo: los que tengan un id mayor son nuevos.
    ultimo_juego_id = Column(Integer, nullable=False, default=0)

    # Ids (en JSON) de los juegos que estaban a la venta y con stock al enviarlo.
    disponibles = Column(Text, nullable=False, default="[]")

    # A cuántas personas se les mandó.
    destinatarios = Column(Integer, nullable=False, default=0)
