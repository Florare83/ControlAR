
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.auth.dependencies import get_current_user
from app.core.db import get_db
from app.models.prestamo import Prestamo
from app.models.usuario import Usuario

router = APIRouter(
    prefix="/mi-cuenta",
    tags=["Mi cuenta"],
)


@router.get("/prestamos")
def listar_mis_prestamos(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve los préstamos de la persona, cruzando por su DNI.

    Solo si un administrador verificó el DNI (mirando el documento físico). Si no,
    cualquiera podría escribir el DNI de otra persona al registrarse y ver sus préstamos.
    """

    if not usuario.dni_verificado or not usuario.dni:
        return []

    prestamos = (
        db.query(Prestamo)
        .filter(Prestamo.dni == usuario.dni)
        .order_by(Prestamo.fecha_inicio.desc(), Prestamo.id.desc())
        .all()
    )

    return [
        {
            "id": p.id,
            "titulo_juego": (
                p.titulo_juego
                or (p.juego.titulo if p.juego else "Juego no disponible")
            ),
            "fecha_inicio": p.fecha_inicio,
            "fecha_cierre": p.fecha_cierre,
            "estado": p.estado,
        }
        for p in prestamos
    ]
