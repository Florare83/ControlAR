
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.db import Base


class Favorito(Base):
    __tablename__ = "favoritos"

    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "juego_id",
            name="uq_favorito_usuario_juego",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    juego_id = Column(
        Integer,
        ForeignKey("juegos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    usuario = relationship("Usuario")
    juego = relationship("Juego")
