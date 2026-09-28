import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.categorias import router as categorias_router
from app.api.v1.juegos.router import router as juegos_router


app = FastAPI(
    title="API de Juegos de Mesa",
    description="API REST para gestionar juegos modernos y categorías.",
)

# Orígenes (páginas web) que tienen permiso para llamar a esta API desde el navegador.
# Local: el frontend con Vite. En Render: agregá la URL del Static Site en la
# variable de entorno CORS_ORIGINS (separadas por coma si son varias).
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
extra = os.getenv("CORS_ORIGINS", "")
origins += [o.strip().rstrip("/") for o in extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
def read_root():
    return {"Bienvenido a la API de Juegos"}


app.include_router(juegos_router)
app.include_router(categorias_router)