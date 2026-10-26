# Formulario de contacto: lo envía cualquier visitante y lo gestiona el administrador.
import time
import unicodedata
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.v1.auth.dependencies import (
    get_current_user,
    get_current_user_opcional,
    require_admin,
)
from app.core.correo import enviar_correo
from app.core.db import get_db
from app.core.validaciones import (
    MENSAJE_MAX,
    ErrorValidacion,
    validar_email,
    validar_mensaje,
    validar_nombre,
    validar_telefono,
)
from app.models.mensaje import MensajeContacto, RespuestaMensaje
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


def _controlar_limite(clave: str, maximo: int = MAX_ENVIOS) -> None:
    ahora = time.time()
    recientes = [t for t in _envios.get(clave, []) if ahora - t < VENTANA_SEGUNDOS]
    if len(recientes) >= maximo:
        raise HTTPException(
            429, "Enviaste muchos mensajes seguidos. Probá de nuevo más tarde."
        )
    recientes.append(ahora)
    _envios[clave] = recientes


# Clientes con sesión: conversaciones nuevas y respuestas dentro de una conversación.
MAX_CONVERSACIONES_NUEVAS = 5
MAX_RESPUESTAS_CLIENTE = 30


def _limpiar_texto(valor: str, maximo: int) -> str:
    """Quita caracteres de control invisibles (deja saltos de línea) y valida el largo."""
    limpio = "".join(
        c
        for c in unicodedata.normalize(
            "NFC", valor.replace("\r\n", "\n").replace("\r", "\n")
        )
        if c in "\n\t" or unicodedata.category(c) not in ("Cc", "Cf")
    ).strip()
    if not limpio:
        raise ErrorValidacion("Escribí tu mensaje.")
    if len(limpio) > maximo:
        raise ErrorValidacion(f"El mensaje no puede superar los {maximo} caracteres.")
    return limpio


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


class NuevaConversacionIn(BaseModel):
    """Primer mensaje de un cliente con sesión iniciada."""

    mensaje: str

    @field_validator("mensaje")
    @classmethod
    def _mensaje(cls, v: str) -> str:
        return _aplicar(validar_mensaje, v)


class MensajeIn(BaseModel):
    """Mensaje dentro de una conversación (admite textos cortos como "Gracias")."""

    mensaje: str

    @field_validator("mensaje")
    @classmethod
    def _mensaje(cls, v: str) -> str:
        return _aplicar(_limpiar_texto, v, MENSAJE_MAX)


class RespuestaInternaIn(BaseModel):
    cuerpo: str

    @field_validator("cuerpo")
    @classmethod
    def _cuerpo(cls, v: str) -> str:
        return _aplicar(_limpiar_texto, v, 5000)


def _fecha(valor) -> str | None:
    return valor.isoformat() if valor else None


def _ultima_actividad(m: MensajeContacto):
    return m.actualizado_en or m.creado_en


def _cuentas_activas(db: Session, mensajes: list[MensajeContacto]) -> set[int]:
    """IDs de las cuentas (vinculadas a estos mensajes) que siguen activas."""
    ids = {m.usuario_id for m in mensajes if m.usuario_id is not None}
    if not ids:
        return set()
    filas = db.query(Usuario.id).filter(Usuario.id.in_(ids), Usuario.activo.is_(True)).all()
    return {fila[0] for fila in filas}


def _serializar(m: MensajeContacto, cuentas_activas: set[int] | None = None) -> dict:
    # "es_cliente": tiene una cuenta activa, así que se le puede responder dentro de la app.
    es_cliente = m.usuario_id is not None and (
        cuentas_activas is None or m.usuario_id in cuentas_activas
    )
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
        "es_cliente": es_cliente,
        "ultima_actividad": _fecha(_ultima_actividad(m)),
        "respuestas": [
            {
                "id": r.id,
                "autor": r.autor,
                "texto": r.texto,
                "creado_en": _fecha(r.creado_en),
            }
            for r in m.respuestas
        ],
    }


# ---------- Público ----------

@router.post("/", status_code=201)
def enviar_mensaje(
    datos: ContactoIn,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario | None = Depends(get_current_user_opcional),
):
    _controlar_limite(_ip(request))

    # Con sesión iniciada, el mensaje queda vinculado a la cuenta: el equipo puede
    # responderle dentro de la app (en "Mis mensajes").
    db.add(
        MensajeContacto(
            nombre=datos.nombre,
            apellido=datos.apellido,
            telefono=datos.telefono or None,
            email=datos.email or None,
            mensaje=datos.mensaje,
            usuario_id=usuario.id if usuario else None,
            actualizado_en=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return {"ok": True}


# ---------- Cliente con sesión: "Mis mensajes" ----------

def _resumen_conversacion(m: MensajeContacto) -> dict:
    primera_linea = m.mensaje.strip().splitlines()[0] if m.mensaje.strip() else ""
    ultimo = m.respuestas[-1] if m.respuestas else None
    return {
        "id": m.id,
        "asunto": primera_linea[:80] + ("…" if len(primera_linea) > 80 else ""),
        "creado_en": _fecha(m.creado_en),
        "ultima_actividad": _fecha(_ultima_actividad(m)),
        "cantidad_respuestas": len(m.respuestas),
        "ultimo_autor": ultimo.autor if ultimo else "cliente",
        "sin_leer": not m.leido_cliente,
    }


def _detalle_conversacion(m: MensajeContacto) -> dict:
    mensajes = [{"autor": "cliente", "texto": m.mensaje, "creado_en": _fecha(m.creado_en)}]
    mensajes += [
        {"autor": r.autor, "texto": r.texto, "creado_en": _fecha(r.creado_en)}
        for r in m.respuestas
    ]
    return {
        "id": m.id,
        "sin_leer": not m.leido_cliente,
        "mensajes": mensajes,
    }


def _conversacion_propia(db: Session, mensaje_id: int, usuario: Usuario) -> MensajeContacto:
    # Si no es suya, se responde "no encontrado" (no se revela que existe).
    mensaje = (
        db.query(MensajeContacto)
        .filter(
            MensajeContacto.id == mensaje_id,
            MensajeContacto.usuario_id == usuario.id,
        )
        .first()
    )
    if mensaje is None:
        raise HTTPException(404, "Conversación no encontrada")
    return mensaje


@router.get("/mis-mensajes")
def listar_mis_mensajes(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    conversaciones = (
        db.query(MensajeContacto)
        .filter(MensajeContacto.usuario_id == usuario.id)
        .order_by(
            func.coalesce(
                MensajeContacto.actualizado_en, MensajeContacto.creado_en
            ).desc(),
            MensajeContacto.id.desc(),
        )
        .limit(100)
        .all()
    )
    return {
        "items": [_resumen_conversacion(m) for m in conversaciones],
        "sin_leer": sum(1 for m in conversaciones if not m.leido_cliente),
    }


# Va antes de "/mis-mensajes/{mensaje_id}" para que "sin-leer" no se tome como un id.
@router.get("/mis-mensajes/sin-leer")
def contar_mis_mensajes_sin_leer(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cantidad = (
        db.query(func.count(MensajeContacto.id))
        .filter(
            MensajeContacto.usuario_id == usuario.id,
            MensajeContacto.leido_cliente.is_(False),
        )
        .scalar()
    )
    return {"sin_leer": cantidad or 0}


@router.post("/mis-mensajes", status_code=201)
def nueva_conversacion(
    datos: NuevaConversacionIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    _controlar_limite(f"nueva:{usuario.id}", MAX_CONVERSACIONES_NUEVAS)

    mensaje = MensajeContacto(
        nombre=usuario.nombre,
        apellido="",
        email=usuario.email,
        mensaje=datos.mensaje,
        usuario_id=usuario.id,
        actualizado_en=datetime.now(timezone.utc),
    )
    db.add(mensaje)
    db.commit()
    db.refresh(mensaje)
    return _detalle_conversacion(mensaje)


@router.get("/mis-mensajes/{mensaje_id}")
def ver_mi_conversacion(
    mensaje_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    mensaje = _conversacion_propia(db, mensaje_id, usuario)

    # Al abrirla, el cliente ve las respuestas nuevas.
    if not mensaje.leido_cliente:
        mensaje.leido_cliente = True
        db.commit()
        db.refresh(mensaje)

    return _detalle_conversacion(mensaje)


@router.post("/mis-mensajes/{mensaje_id}/respuestas", status_code=201)
def responder_conversacion(
    mensaje_id: int,
    datos: MensajeIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    mensaje = _conversacion_propia(db, mensaje_id, usuario)
    _controlar_limite(f"resp:{usuario.id}", MAX_RESPUESTAS_CLIENTE)

    ahora = datetime.now(timezone.utc)
    db.add(
        RespuestaMensaje(
            mensaje_id=mensaje.id, autor="cliente", texto=datos.mensaje, creado_en=ahora
        )
    )
    mensaje.leido = False  # vuelve a aparecer como nuevo para el equipo
    mensaje.leido_cliente = True  # ya está al día: lo acaba de escribir él
    mensaje.actualizado_en = ahora
    db.commit()
    db.refresh(mensaje)
    return _detalle_conversacion(mensaje)


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
        consulta.order_by(
            func.coalesce(
                MensajeContacto.actualizado_en, MensajeContacto.creado_en
            ).desc(),
            MensajeContacto.id.desc(),
        )
        .offset(desplazamiento)
        .limit(limite)
        .all()
    )
    activas = _cuentas_activas(db, items)
    no_leidos = (
        db.query(MensajeContacto)
        .filter(MensajeContacto.leido.is_(False))
        .count()
    )

    return {
        "items": [_serializar(m, activas) for m in items],
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
    return _serializar(mensaje, _cuentas_activas(db, [mensaje]))


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
    return _serializar(mensaje, _cuentas_activas(db, [mensaje]))


@router.post("/{mensaje_id}/respuestas")
def responder_en_la_app(
    mensaje_id: int,
    datos: RespuestaInternaIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    """Respuesta interna: el cliente la ve en "Mis mensajes" (no se envía correo)."""
    mensaje = db.query(MensajeContacto).filter(MensajeContacto.id == mensaje_id).first()
    if mensaje is None:
        raise HTTPException(404, "Mensaje no encontrado")

    if mensaje.usuario_id is None or not _cuentas_activas(db, [mensaje]):
        raise HTTPException(
            400,
            "Este mensaje no está vinculado a una cuenta activa, así que no puede "
            "ver respuestas dentro de la app. Respondele por correo.",
        )

    ahora = datetime.now(timezone.utc)
    db.add(
        RespuestaMensaje(
            mensaje_id=mensaje.id, autor="admin", texto=datos.cuerpo, creado_en=ahora
        )
    )
    mensaje.leido = True  # lo atendió el equipo
    mensaje.respondido_en = ahora
    mensaje.leido_cliente = False  # el cliente tiene una respuesta nueva
    mensaje.actualizado_en = ahora
    db.commit()
    db.refresh(mensaje)
    return _serializar(mensaje, _cuentas_activas(db, [mensaje]))


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
