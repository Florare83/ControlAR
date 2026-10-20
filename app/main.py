
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


app = FastAPI(
    title="API de Juegos de Mesa",
    description="API REST para gestionar juegos modernos y categorías.",
)

# Orígenes autorizados para llamar a la API desde el navegador.
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


@app.get("/", tags=["Root"])
def read_root():
    return {"Bienvenido a la API de Juegos"}


app.include_router(auth_router)
app.include_router(juegos_router)
app.include_router(categorias_router)
app.include_router(prestamos_router)
app.include_router(historial_prestamos_router)
app.include_router(favoritos_router)
