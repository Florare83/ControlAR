from fastapi import FastAPI

from app.api.v1.productos.router import router as productos_router

app = FastAPI(
    title="API de Productos",
    description="API REST para gestionar productos y categorías, con persistencia en memoria.",
)


@app.get("/", tags=["Root"])
def read_root():
    return {"mensaje": "Bienvenido a la API de Productos 🚀"}


app.include_router(productos_router)