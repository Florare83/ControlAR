from pydantic import BaseModel, Field, ConfigDict


class JuegoBase(BaseModel):
    titulo: str = Field(min_length=2, max_length=100)
    editorial: str | None = None
    cantidad_jugadores: str
    duracion_minutos: int = Field(ge=1)
    edad_minima: int = Field(ge=0)
    precio: float = Field(ge=0)


class JuegoCreate(JuegoBase):
    en_venta: bool = False
    stock: int = Field(ge=0)
    categoria_id: int = Field(ge=1)


class JuegoUpdate(BaseModel):
    # Todos los campos opcionales: es el schema del PUT parcial,
    titulo: str | None = None
    editorial: str | None = None
    cantidad_jugadores: str | None = None
    duracion_minutos: int | None = None
    edad_minima: int | None = None
    en_venta: bool | None = None
    stock: int | None = None
    precio: float | None = None
    categoria_id: int | None = None


class CategoriaOut(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class JuegoResponse(JuegoBase):
    id: int
    en_venta: bool
    stock: int
    categoria: CategoriaOut  # objeto anidado, no el id pelado

    model_config = ConfigDict(from_attributes=True)