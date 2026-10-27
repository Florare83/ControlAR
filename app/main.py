import os

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

from app.core.asegurar_esquema import asegurar_esquema


app = FastAPI(
    title="API de Juegos de Mesa",
    description="API REST para gestionar juegos modernos y categorías.",
)


# ---------------------------------------------------------
# CORS: permitir el frontend local y el publicado en Render
# ---------------------------------------------------------

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

extra = os.getenv("CORS_ORIGINS", "")

origins += [
    origen.strip().rstrip("/")
    for origen in extra.split(",")
    if origen.strip()
]

# Evitar orígenes duplicados conservando el orden.
origins = list(dict.fromkeys(origins))


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Preparación del esquema de la base de datos
# ---------------------------------------------------------

@app.on_event("startup")
def preparar_base_de_datos():
    asegurar_esquema()


# ---------------------------------------------------------
# Ruta principal
# ---------------------------------------------------------

@app.get("/", tags=["Root"])
def read_root():
    return {"Bienvenido a la API de Juegos"}


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

# Formulario de contacto y mensajes para administración
app.include_router(contacto_router)
