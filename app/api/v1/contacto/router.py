
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.api.v1.auth.dependencies import require_admin
from app.models.mensaje_contacto import MensajeContacto
from .schemas import (
    MensajeContactoCreate,
    MensajeContactoResponse,
)

router = APIRouter(prefix="/contacto", tags=["Contacto"])


@router.post("/", status_code=201)
def recibir_mensaje(
    datos: MensajeContactoCreate,
    db: Session = Depends(get_db),
):
    nombre = datos.nombre.strip()
    apellido = datos.apellido.strip()
    mensaje = datos.mensaje.strip()
    telefono = (datos.telefono or "").strip() or None
    email = (datos.email or "").strip() or None

    if not nombre or not apellido or not mensaje:
        raise HTTPException(
            status_code=422,
            detail="Nombre, apellido y mensaje son obligatorios.",
        )

    if not email and not telefono:
        raise HTTPException(
            status_code=422,
            detail="Ingresá un correo electrónico o un teléfono.",
        )

    nuevo = MensajeContacto(
        nombre=nombre,
        apellido=apellido,
        telefono=telefono,
        email=email,
        mensaje=mensaje,
    )

    try:
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return {"mensaje": "Mensaje recibido correctamente."}
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el mensaje. Intentá nuevamente.",
        )


@router.get("/", response_model=list[MensajeContactoResponse])
def listar_mensajes(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return (
        db.query(MensajeContacto)
        .order_by(MensajeContacto.fecha_creacion.desc())
        .all()
    )
