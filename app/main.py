from fastapi import FastAPI

from app.api.v1.productos.router import router as productos_router

app = FastAPI(
    title="API de Juegos de Mesa",
    description="API REST para gestionar juegos modernos y categorías.",
)


@app.get("/", tags=["Root"])
def read_root():
    return {"mensaje": "Bienvenido a la API de Productos 🚀"}


app.include_router(productos_router)