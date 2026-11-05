# Novedades por correo.
#  - POST /suscripcion/baja: baja con el enlace de cada correo (no hace falta iniciar sesión).
#  - /suscripcion/resumen...: resumen de novedades (panel de administración y cron externo).
# Para suscribirse o darse de baja estando logueado se usa PUT /auth/me/novedades.
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1.auth import repository as repo
from app.api.v1.auth.dependencies import require_admin
from app.core import resumen, suscripciones
from app.core.db import get_db

router = APIRouter(prefix="/suscripcion", tags=["Suscripción"])

# El envío automático (cron) no repite si ya salió un resumen hace menos que esto.
ESPERA_AUTOMATICO = timedelta(days=20)


class BajaIn(BaseModel):
    token: str = Field(min_length=10, max_length=1000)


class EnviarResumenIn(BaseModel):
    """Qué mandar en el resumen. Sin este cuerpo (o con None) se manda todo, como siempre."""

    eventos_ids: list[int] | None = None
    juegos_ids: list[int] | None = None
    incluir_favoritos: bool = True


@router.post("/baja")
def darse_de_baja(datos: BajaIn, db: Session = Depends(get_db)):
    """Da de baja de las novedades a quien tiene el enlace. Se puede repetir sin problema."""
    usuario_id = suscripciones.leer_token_baja(datos.token)
    usuario = repo.get_by_id(db, usuario_id) if usuario_id is not None else None

    if usuario is None:
        raise HTTPException(400, "El enlace de baja no es válido.")

    if usuario.suscrito_novedades:
        usuario.suscrito_novedades = False
        db.commit()

    return {"ok": True}


@router.get("/resumen")
def estado_del_resumen(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Qué llevaría el próximo resumen y cuándo salió el último (panel del administrador)."""
    contexto = resumen.armar(db)
    previo = contexto["previo"]

    return {
        "suscriptores": len(suscripciones.suscriptores(db)),
        "primera_vez": previo is None,
        "ultimo_envio": previo.enviado_en.isoformat() if previo else None,
        "ultimo_destinatarios": previo.destinatarios if previo else None,
        "pendiente": {
            "eventos": len(contexto["eventos"]),
            "juegos_nuevos": len(contexto["nuevos"]),
            "personas_con_favoritos": len(contexto["favoritos"]),
        },
        # El detalle, para que el administrador elija qué mandar.
        "eventos": [
            {"id": e.id, "titulo": e.titulo, "fecha": e.fecha.isoformat() if e.fecha else None}
            for e in contexto["eventos"]
        ],
        "juegos_nuevos": [{"id": j.id, "titulo": j.titulo} for j in contexto["nuevos"]],
    }


@router.post("/resumen/enviar")
def enviar_resumen(
    tareas: BackgroundTasks,
    datos: EnviarResumenIn | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """El administrador manda el resumen ahora, con lo que haya elegido (o todo)."""
    datos = datos or EnviarResumenIn()
    return {
        "enviados": resumen.enviar(
            db,
            tareas,
            eventos_ids=datos.eventos_ids,
            juegos_ids=datos.juegos_ids,
            incluir_favoritos=datos.incluir_favoritos,
        )
    }


@router.post("/resumen/automatico")
def resumen_automatico(
    tareas: BackgroundTasks,
    db: Session = Depends(get_db),
    x_cron_clave: str | None = Header(default=None),
):
    """Para un cron externo (por ejemplo cron-job.org una vez por mes): Render gratis no
    tiene tareas programadas. Se activa definiendo CRON_CLAVE y mandando esa misma clave
    en el encabezado X-Cron-Clave. Si ya salió un resumen hace poco, no repite."""
    clave = os.getenv("CRON_CLAVE", "").strip()

    if not clave:
        raise HTTPException(404, "No encontrado")  # desactivado: ni siquiera se anuncia

    if not x_cron_clave or not secrets.compare_digest(x_cron_clave.encode(), clave.encode()):
        raise HTTPException(401, "Clave inválida")

    previo = resumen.ultimo(db)
    if previo is not None:
        enviado = previo.enviado_en
        if enviado.tzinfo is None:  # SQLite devuelve la fecha sin zona
            enviado = enviado.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - enviado < ESPERA_AUTOMATICO:
            return {"enviados": 0, "motivo": "Ya se envió un resumen hace poco."}

    return {"enviados": resumen.enviar(db, tareas)}
