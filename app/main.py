from fastapi import FastAPI

app = FastAPI(
    title="Catálogo de Productos API",
    description="API profesional con arquitectura de capas para el TP de Productos"
)

@app.get("/")
def read_root():
    return {"message": "¡Servidor de TP Productos funcionando correctamente!"}