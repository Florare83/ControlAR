# Resumen de novedades por correo: próximos eventos + juegos nuevos + (para cada persona)
# sus favoritos que ya están a la venta o volvieron a tener stock.
#
# Cómo se sabe qué es "nuevo": cada envío guarda hasta qué juego llegó y qué juegos estaban a
# la venta (ResumenNovedades). El primer envío no tiene con qué comparar, así que solo lleva
# los próximos eventos; desde el segundo cuenta los juegos nuevos y los favoritos.
import json
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core import avisos, suscripciones
from app.models.evento import Evento
from app.models.favorito import Favorito
from app.models.juego import Juego
from app.models.resumen import ResumenNovedades


def ultimo(db: Session) -> ResumenNovedades | None:
    return db.query(ResumenNovedades).order_by(ResumenNovedades.id.desc()).first()


def _disponibles(db: Session) -> set[int]:
    """Juegos que se pueden comprar ahora (en venta y con stock)."""
    filas = db.query(Juego.id).filter(Juego.en_venta.is_(True), Juego.stock > 0).all()
    return {fila[0] for fila in filas}


def armar(db: Session) -> dict:
    """Qué llevaría el próximo resumen. No manda ni guarda nada."""
    previo = ultimo(db)

    eventos = (
        db.query(Evento)
        .filter(Evento.fecha >= date.today())
        .order_by(Evento.fecha, Evento.id)
        .all()
    )

    maximo = db.query(func.max(Juego.id)).scalar() or 0
    disponibles = _disponibles(db)

    if previo is None:
        nuevos, volvieron = [], set()
    else:
        nuevos = (
            db.query(Juego)
            .filter(Juego.id > previo.ultimo_juego_id)
            .order_by(Juego.id)
            .all()
        )
        antes = set(json.loads(previo.disponibles or "[]"))
        # Un juego nuevo ya sale en "Juegos nuevos": no se repite como favorito.
        volvieron = disponibles - antes - {j.id for j in nuevos}

    favoritos: dict[int, list[Juego]] = {}
    if volvieron:
        juegos = {j.id: j for j in db.query(Juego).filter(Juego.id.in_(volvieron)).all()}
        filas = (
            db.query(Favorito.usuario_id, Favorito.juego_id)
            .filter(Favorito.juego_id.in_(volvieron))
            .order_by(Favorito.juego_id)
            .all()
        )
        for usuario_id, juego_id in filas:
            favoritos.setdefault(usuario_id, []).append(juegos[juego_id])

    return {
        "previo": previo,
        "eventos": eventos,
        "nuevos": nuevos,
        "favoritos": favoritos,  # {usuario_id: [juegos]}
        "maximo_juego": maximo,
        "disponibles": disponibles,
    }


def enviar(
    db: Session,
    tareas,
    eventos_ids: list[int] | None = None,
    juegos_ids: list[int] | None = None,
    incluir_favoritos: bool = True,
) -> int:
    """Arma el resumen para cada suscriptor, programa el envío y guarda el punto de partida
    del próximo. Devuelve a cuántas personas se les manda. A quien no le toca nada (sin
    eventos, sin juegos nuevos y sin favoritos) no se le escribe.

    El administrador puede elegir qué incluir: eventos_ids y juegos_ids limitan a esos
    eventos y juegos (None = todos) e incluir_favoritos apaga los favoritos. Lo que se deja
    afuera sigue pendiente: los juegos nuevos solo se dan por contados si salieron todos, y
    los favoritos solo si se incluyeron."""
    usuarios = suscripciones.suscriptores(db)
    if not usuarios:
        return 0  # sin suscriptores no se guarda nada: lo nuevo sigue "pendiente"

    contexto = armar(db)
    previo = contexto["previo"]

    eventos = contexto["eventos"]
    if eventos_ids is not None:
        eventos = [e for e in eventos if e.id in set(eventos_ids)]

    todos_nuevos = contexto["nuevos"]
    nuevos = todos_nuevos
    if juegos_ids is not None:
        nuevos = [j for j in todos_nuevos if j.id in set(juegos_ids)]

    favoritos_por_persona = contexto["favoritos"] if incluir_favoritos else {}

    if not eventos and not nuevos and not incluir_favoritos:
        return 0  # no se eligió nada: no se manda ni se guarda nada

    # Los correos se arman ANTES del commit, mientras los objetos siguen cargados.
    correos = []
    for usuario in usuarios:
        favoritos = favoritos_por_persona.get(usuario.id, [])
        if not (eventos or nuevos or favoritos):
            continue
        correos.append(avisos.correo_resumen(usuario, eventos, nuevos, favoritos))

    # Punto de partida del próximo resumen: solo avanza en lo que se mandó completo.
    # En el primer envío no hay con qué comparar, así que siempre arranca de cero.
    juegos_completos = previo is None or len(nuevos) == len(todos_nuevos)
    ultimo_juego_id = contexto["maximo_juego"] if juegos_completos else previo.ultimo_juego_id
    if previo is None or incluir_favoritos:
        disponibles = json.dumps(sorted(contexto["disponibles"]))
    else:
        disponibles = previo.disponibles

    db.add(
        ResumenNovedades(
            ultimo_juego_id=ultimo_juego_id,
            disponibles=disponibles,
            destinatarios=len(correos),
        )
    )
    db.commit()

    if correos:
        tareas.add_task(avisos.enviar_avisos, correos)
    return len(correos)
