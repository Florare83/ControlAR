
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MensajeContactoCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    telefono: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=255)
    mensaje: str = Field(min_length=1, max_length=10000)


class MensajeContactoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str
    telefono: str | None
    email: str | None
    mensaje: str
    fecha_creacion: datetime
