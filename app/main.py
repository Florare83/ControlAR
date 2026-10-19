
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth.router import router as auth_router
from app.api.v1.categorias import router as categorias_router
from app.api.v1.juegos.router import router as juegos_router
from app.api.v1.prestamos import router as prestamos_router
from app.api.v1.favoritos import router as favoritos_router
from app.api.v1.pedidos import router as pedidos_router, router_pagos
from app.api.v1.contacto import router as contacto_router
from app.core.asegurar_esquema import asegurar_esquema


app = FastAPI(
    title="API de Juegos de Mesa",
    description="API REST para gestionar juegos modernos y categorías.",
)


# Configuración CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://controlarstaticsite.onrender.com",
]

extra = os.getenv("CORS_ORIGINS", "")
origins += [
    origen.strip().rstrip("/")
    for origen in extra.split(",")
    if origen.strip()
]

# Evitar orígenes duplicados
origins = list(set(origins))


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def preparar_base_de_datos():
    # Crea las tablas que falten y completa columnas nuevas (ver asegurar_esquema.py).
    asegurar_esquema()


@app.get("/", tags=["Root"])
def read_root():
    return {"Bienvenido a la API de Juegos"}


# Rutas de la API
app.include_router(auth_router)
app.include_router(juegos_router)
app.include_router(categorias_router)
app.include_router(prestamos_router)
app.include_router(favoritos_router)
app.include_router(pedidos_router)
app.include_router(router_pagos)
app.include_router(contacto_router)
