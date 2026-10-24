# Formulario de contacto: lo envía cualquier visitante y lo gestiona el administrador.
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError
from sqlalchemy.orm import Session

from app.api.v1.auth.dependencies import require_admin
from app.core.correo import enviar_correo
from app.core.db import get_db
from app.core.validaciones import (
    ErrorValidacion,
    validar_email,
    validar_mensaje,
    validar_nombre,
    validar_telefono,
)
from app.models.mensaje import MensajeContacto
from app.models.usuario import Usuario

router = APIRouter(prefix="/contacto", tags=["Contacto"])

# --- Límite simple anti-spam: máx. 5 mensajes por hora y por IP (en memoria) ---
MAX_ENVIOS = 5
VENTANA_SEGUNDOS = 3600
_envios: dict[str, list[float]] = {}


def _ip(request: Request) -> str:
    reenviada = request.headers.get("x-forwarded-for")
    if reenviada:
        return reenviada.split(",")[0].strip()
    return request.client.host if request.client else "desconocida"


def _controlar_limite(ip: str) -> None:
    ahora = time.time()
    recientes = [t for t in _envios.get(ip, []) if ahora - t < VENTANA_SEGUNDOS]
    if len(recientes) >= MAX_ENVIOS:
        raise HTTPException(
            429, "Enviaste muchos mensajes seguidos. Probá de nuevo más tarde."
        )
    recientes.append(ahora)
    _envios[ip] = recientes


# ---------- Schemas ----------

def _aplicar(funcion, *args):
    # Los errores salen con el texto en español, sin el prefijo "Value error, ".
    try:
        return funcion(*args)
    except ErrorValidacion as e:
        raise PydanticCustomError("contacto", str(e))


class ContactoIn(BaseModel):
    nombre: str
    apellido: str
    telefono: str = ""
    email: str = ""
    mensaje: str

    @field_validator("nombre")
    @classmethod
    def _nombre(cls, v: str) -> str:
        return _aplicar(validar_nombre, v, "nombre")

    @field_validator("apellido")
    @classmethod
    def _apellido(cls, v: str) -> str:
        return _aplicar(validar_nombre, v, "apellido")

    @field_validator("telefono")
    @classmethod
    def _telefono(cls, v: str) -> str:
        return _aplicar(validar_telefono, v)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return _aplicar(validar_email, v)

    @field_validator("mensaje")
    @classmethod
    def _mensaje(cls, v: str) -> str:
        return _aplicar(validar_mensaje, v)

    @model_validator(mode="after")
    def _algun_contacto(self):
        if not self.email and not self.telefono:
            raise PydanticCustomError(
                "contacto", "Ingresá al menos un email o un teléfono"
            )
        return self


class LeidoIn(BaseModel):
    leido: bool


class RespuestaIn(BaseModel):
    asunto: str = Field(min_length=1, max_length=150)
    cuerpo: str = Field(min_length=1, max_length=5000)

    @field_validator("asunto", "cuerpo")
    @classmethod
    def _no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("No puede estar vacío")
        return v


def _serializar(m: MensajeContacto) -> dict:
    return {
        "id": m.id,
        "nombre": m.nombre,
        "apellido": m.apellido,
        "telefono": m.telefono or "",
        "email": m.email or "",
        "mensaje": m.mensaje,
        "leido": m.leido,
        "creado_en": m.creado_en.isoformat() if m.creado_en else None,
        "respondido_en": m.respondido_en.isoformat() if m.respondido_en else None,
    }


# ---------- Público ----------

@router.post("/", status_code=201)
def enviar_mensaje(
    datos: ContactoIn,
    request: Request,
    db: Session = Depends(get_db),
):
    _controlar_limite(_ip(request))

    db.add(
        MensajeContacto(
            nombre=datos.nombre,
            apellido=datos.apellido,
            telefono=datos.telefono or None,
            email=datos.email or None,
            mensaje=datos.mensaje,
        )
    )
    db.commit()
    return {"ok": True}


# ---------- Solo administrador ----------

@router.get("/")
def listar_mensajes(
    solo_no_leidos: bool = False,
    limite: int = Query(20, ge=1, le=100),
    desplazamiento: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    consulta = db.query(MensajeContacto)
    if solo_no_leidos:
        consulta = consulta.filter(MensajeContacto.leido.is_(False))

    total = consulta.count()
    items = (
        consulta.order_by(MensajeContacto.creado_en.desc(), MensajeContacto.id.desc())
        .offset(desplazamiento)
        .limit(limite)
        .all()
    )
    no_leidos = (
        db.query(MensajeContacto)
        .filter(MensajeContacto.leido.is_(False))
        .count()
    )

    return {
        "items": [_serializar(m) for m in items],
        "total": total,
        "no_leidos": no_leidos,
    }


@router.patch("/{mensaje_id}")
def marcar_mensaje(
    mensaje_id: int,
    datos: LeidoIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    mensaje = db.query(MensajeContacto).filter(MensajeContacto.id == mensaje_id).first()
    if mensaje is None:
        raise HTTPException(404, "Mensaje no encontrado")

    mensaje.leido = datos.leido
    db.commit()
    return _serializar(mensaje)


@router.post("/{mensaje_id}/responder")
def responder_mensaje(
    mensaje_id: int,
    datos: RespuestaIn,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    mensaje = db.query(MensajeContacto).filter(MensajeContacto.id == mensaje_id).first()
    if mensaje is None:
        raise HTTPException(404, "Mensaje no encontrado")
    if not mensaje.email:
        raise HTTPException(400, "Este contacto no dejó un email para responderle.")

    # Se agrega el mensaje original citado al final, como en un "Responder" normal.
    fecha = mensaje.creado_en.strftime("%d/%m/%Y %H:%M") if mensaje.creado_en else ""
    citado = "\n".join(f"> {linea}" for linea in mensaje.mensaje.splitlines())
    cuerpo = (
        f"{datos.cuerpo}\n\n"
        f"El {fecha}, {mensaje.nombre} {mensaje.apellido} escribió:\n{citado}\n"
    )

    # Si falla el SMTP se lanza HTTPException y no se toca la base.
    enviar_correo(mensaje.email, datos.asunto, cuerpo)

    mensaje.respondido_en = datetime.now(timezone.utc)
    mensaje.leido = True
    db.commit()
    return _serializar(mensaje)


@router.delete("/{mensaje_id}", status_code=204)
def eliminar_mensaje(
    mensaje_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    mensaje = db.query(MensajeContacto).filter(MensajeContacto.id == mensaje_id).first()
    if mensaje is None:
        raise HTTPException(404, "Mensaje no encontrado")

    db.delete(mensaje)
    db.commit()
