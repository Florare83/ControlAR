from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from app.core.db import Base

PENDIENTE = "pendiente"
APROBADO = "aprobado"
RECHAZADO = "rechazado"
CANCELADO = "cancelado"  # pedido en efectivo/transferencia que no se concretó

# Formas de pago
MERCADO_PAGO = "mercadopago"
EFECTIVO_TRANSFERENCIA = "efectivo_transferencia"


def _ahora():
    return datetime.now(timezone.utc)


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    total = Column(Float, nullable=False)
    estado = Column(String(12), nullable=False, default=PENDIENTE)

    # Cómo se paga: Mercado Pago (se acredita solo) o efectivo/transferencia
    # (el administrador confirma a mano cuando se concreta). Los pedidos
    # anteriores quedan como Mercado Pago.
    forma_pago = Column(String(30), nullable=False, default=MERCADO_PAGO)

    # Datos de Mercado Pago
    preferencia_id = Column(String(100), nullable=True)
    pago_id = Column(String(50), nullable=True)

    creado_en = Column(DateTime(timezone=True), nullable=False, default=_ahora)
    pagado_en = Column(DateTime(timezone=True), nullable=True)

    items = relationship(
        "PedidoItem",
        back_populates="pedido",
        cascade="all, delete-orphan",
    )


class PedidoItem(Base):
    __tablename__ = "pedido_items"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(
        Integer,
        ForeignKey("pedidos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    juego_id = Column(
        Integer,
        ForeignKey("juegos.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Se guardan copia del título y del precio: el pedido no cambia aunque
    # después se edite o se borre el juego.
    titulo = Column(String(100), nullable=False)
    precio_unitario = Column(Float, nullable=False)
    cantidad = Column(Integer, nullable=False)

    pedido = relationship("Pedido", back_populates="items")
