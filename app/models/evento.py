from sqlalchemy import Boolean, Column, Date, Integer, String, Time

from app.core.db import Base


class Evento(Base):
    """Evento del club (tarde de juegos, torneo, encuentro).

    Antes vivían en src/data/eventos.js. Ahora los carga el administrador desde
    el panel y Club, Nosotros y las reservas leen de esta tabla.
    """

    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(30), nullable=False, default="Tarde de juegos")
    titulo = Column(String(120), nullable=False)
    descripcion = Column(String(500), nullable=True)

    # Con fecha exacta, el evento pasa solo a "anteriores" cuando termina el día.
    # Sin fecha exacta se usan fecha_texto ("Durante junio") y mes_corto ("JUN").
    fecha = Column(Date, nullable=True, index=True)
    fecha_texto = Column(String(60), nullable=True)
    mes_corto = Column(String(3), nullable=True)

    # hora_inicio (hora de Argentina) sirve para calcular la espera de las reservas.
    # hora_texto es lo que se muestra, por ejemplo "17 a 21 h".
    hora_inicio = Column(Time, nullable=True)
    hora_texto = Column(String(40), nullable=False, default="")

    lugar = Column(String(120), nullable=False)
    direccion = Column(String(160), nullable=False)
    inscripcion = Column(Boolean, nullable=False, default=False)
    aporte = Column(String(200), nullable=True)
    imagen_url = Column(String(1000), nullable=True)

    # Solo en los eventos con préstamo de juegos se puede reservar.
    permite_reservas = Column(Boolean, nullable=False, default=False)
