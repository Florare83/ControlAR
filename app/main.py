import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth.router import router as auth_router
from app.api.v1.categorias import router as categorias_router
from app.api.v1.juegos.router import router as juegos_router
from app.api.v1.prestamos import router as prestamos_router
from app.api.v1.historial_prestamos import (
    router as historial_prestamos_router,
)
from app.api.v1.favoritos import router as favoritos_router
from app.api.v1.pedidos import (
    router as pedidos_router,
    router_pagos,
)
from app.api.v1.contacto import router as contacto_router
from app.api.v1.eventos import router as eventos_router
from app.api.v1.reservas import router as reservas_router
from app.api.v1.reportes import router as reportes_router
from app.api.v1.clientes import router as clientes_router
from app.api.v1.suscripcion import router as suscripcion_router

from app.core.asegurar_esquema import asegurar_esquema
from app.core.cors import origenes_permitidos


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Preparación del esquema de la base de datos al iniciar el servidor.
    asegurar_esquema()
    yield


app = FastAPI(
    title="API de Juegos de Mesa",
    description="API REST para gestionar juegos modernos y categorías.",
    lifespan=lifespan,
)


# ---------------------------------------------------------
# CORS: permitir el frontend local y el publicado en Render
# ---------------------------------------------------------

origins = origenes_permitidos(
    os.getenv("CORS_ORIGINS", ""),
    os.getenv("FRONTEND_URL", ""),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Ruta principal
# ---------------------------------------------------------

@app.get("/", tags=["Root"])
def read_root():
    return {"mensaje": "Bienvenido a la API de Juegos"}


@app.get("/health", tags=["Root"])
def health():
    """Para que Render (o un servicio como UptimeRobot) compruebe que el backend responde."""
    return {"estado": "ok"}


# ---------------------------------------------------------
# Rutas de la API
# ---------------------------------------------------------

app.include_router(auth_router)
app.include_router(juegos_router)
app.include_router(categorias_router)
app.include_router(prestamos_router)
app.include_router(historial_prestamos_router)
app.include_router(favoritos_router)

# Compras y pagos
app.include_router(pedidos_router)
app.include_router(router_pagos)

# Eventos del club y reservas de juegos para los eventos
app.include_router(eventos_router)
app.include_router(reservas_router)

# Reportes y estadísticas para administración
app.include_router(reportes_router)

# Clientes sin cuenta (registrados por DNI) para administración
app.include_router(clientes_router)

# Baja de las novedades por correo (enlace de cada mail)
app.include_router(suscripcion_router)

# Formulario de contacto y mensajes para administración
app.include_router(contacto_router)
