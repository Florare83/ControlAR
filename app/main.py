from fastapi import FastAPI
from app.api.v1.juegos.router import router as juegos_router


app = FastAPI(
    title="API de Juegos de Mesa",
    description="API REST para gestionar juegos modernos y categorías.",
)


@app.get("/", tags=["Root"])
def read_root():
    return {"Bienvenido a la API de Juegos"}


app.include_router(juegos_router)
