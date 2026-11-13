# Clave compartida para las tareas que dispara un cron externo (por ejemplo cron-job.org).
# Render gratis no tiene tareas programadas, así que un servicio de afuera llama a la API
# con la clave de CRON_CLAVE en el encabezado X-Cron-Clave.
import os
import secrets

from fastapi import HTTPException


def exigir_clave_cron(x_cron_clave: str | None) -> None:
    """404 si las tareas automáticas están desactivadas (no hay CRON_CLAVE: ni siquiera se
    anuncia que existen) y 401 si la clave enviada no coincide."""
    clave = os.getenv("CRON_CLAVE", "").strip()

    if not clave:
        raise HTTPException(status_code=404, detail="No encontrado")

    if not x_cron_clave or not secrets.compare_digest(x_cron_clave.encode(), clave.encode()):
        raise HTTPException(status_code=401, detail="Clave inválida")
