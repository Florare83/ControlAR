# Lógica compartida de las fichas de clientes (personas sin cuenta, identificadas por DNI).
import logging

from sqlalchemy.orm import Session

from app.models.cliente import Cliente
from app.models.prestamo import Prestamo

log = logging.getLogger("uvicorn.error")


def asegurar_cliente(db: Session, dni, nombre, sexo=None, telefono=None) -> Cliente | None:
    """Deja registrada a la persona si todavía no tiene ficha. NO guarda (commit): se usa dentro
    de la operación que la está atendiendo (por ejemplo, al registrar un préstamo).

    Si la ficha ya existe no se pisa nada: lo que cargó el administrador manda. Solo se
    completan los datos que estaban vacíos."""
    dni = (dni or "").strip()
    if not dni:
        return None

    cliente = db.query(Cliente).filter(Cliente.dni == dni).first()
    if cliente is None:
        cliente = Cliente(dni=dni, nombre=(nombre or "").strip() or dni, sexo=sexo, telefono=telefono)
        db.add(cliente)
        return cliente

    if not cliente.sexo and sexo:
        cliente.sexo = sexo
    if not cliente.telefono and telefono:
        cliente.telefono = telefono
    return cliente


def cargar_desde_prestamos(db: Session) -> int:
    """Crea la ficha de cada DNI que ya tiene préstamos y todavía no está registrado
    (con los datos de su préstamo más reciente). Se puede correr muchas veces. Devuelve
    cuántas fichas creó."""
    existentes = {fila[0] for fila in db.query(Cliente.dni).all()}
    filas = (
        db.query(Prestamo.dni, Prestamo.nombre, Prestamo.sexo, Prestamo.telefono)
        .order_by(Prestamo.id.desc())
        .all()
    )

    creadas = 0
    for dni, nombre, sexo, telefono in filas:
        dni = (dni or "").strip()
        if not dni or dni in existentes:
            continue
        existentes.add(dni)
        db.add(Cliente(dni=dni, nombre=(nombre or "").strip() or dni, sexo=sexo, telefono=telefono))
        creadas += 1

    if creadas:
        db.commit()
        log.info("Clientes: %s fichas creadas a partir de los préstamos existentes.", creadas)
    return creadas
