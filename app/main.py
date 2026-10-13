
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.db import engine
from app.api.v1.auth.router import router as auth_router
from app.api.v1.categorias import router as categorias_router
from app.api.v1.juegos.router import router as juegos_router
from app.api.v1.prestamos import router as prestamos_router


app = FastAPI(
    title="API de Juegos de Mesa",
    description="API REST para gestionar juegos modernos y categorías.",
)


# Configuración CORS: permite que el frontend acceda al backend.
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Corrige la columna que falta en la tabla de préstamos.
@app.on_event("startup")
def corregir_columna_juego_id():
    with engine.begin() as conn:
        conn.execute(text("""
            ALTER TABLE prestamos
            ADD COLUMN IF NOT EXISTS juego_id INTEGER
            REFERENCES juegos(id)
        """))

        conn.execute(text("""
            ALTER TABLE prestamos
            ALTER COLUMN juego_id SET NOT NULL
        """))


@app.get("/", tags=["Root"])
def read_root():
    return {"Bienvenido a la API de Juegos"}


# Registro de rutas.
app.include_router(auth_router)
app.include_router(juegos_router)
app.include_router(categorias_router)
app.include_router(prestamos_router)
