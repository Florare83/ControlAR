
from app.core.db import Base, engine

from app.models.categoria import Categoria
from app.models.juego import Juego
from app.models.usuario import Usuario
from app.models.prestamo import Prestamo
from app.models.favorito import Favorito
from app.models.pedido import Pedido, PedidoItem
from app.models.mensaje import MensajeContacto

Base.metadata.create_all(bind=engine)

print("Tablas verificadas correctamente.")
