
from urllib.parse import urlparse

from pydantic import BaseModel, Field, ConfigDict, field_validator


def validar_url_imagen(valor: str | None) -> str | None:
    if valor is None:
        return None

    valor = valor.strip()

    if not valor:
        return None

    try:
        url = urlparse(valor)
        if (
            url.scheme != "https"
            or not url.hostname
            or any(caracter.isspace() for caracter in valor)
        ):
            raise ValueError(
                "La imagen debe tener una URL HTTPS válida."
            )
    except ValueError as exc:
        raise ValueError(
            "La imagen debe tener una URL HTTPS válida."
        ) from exc

    return valor


class JuegoBase(BaseModel):
    titulo: str = Field(min_length=2, max_length=100)
    editorial: str | None = None
    cantidad_jugadores: str
    duracion_minutos: int = Field(ge=1)
    edad_minima: int = Field(ge=0)
    precio: float = Field(ge=0)
    imagen_url: str | None = Field(default=None, max_length=1000)

    _validar_imagen = field_validator("imagen_url")(
        validar_url_imagen
    )


class JuegoCreate(JuegoBase):
    en_venta: bool = False
    stock: int = Field(ge=0)
    categoria_id: int = Field(ge=1)


class JuegoUpdate(BaseModel):
    titulo: str | None = None
    editorial: str | None = None
    cantidad_jugadores: str | None = None
    duracion_minutos: int | None = None
    edad_minima: int | None = None
    en_venta: bool | None = None
    stock: int | None = None
    precio: float | None = None
    categoria_id: int | None = None
    imagen_url: str | None = Field(default=None, max_length=1000)

    _validar_imagen = field_validator("imagen_url")(
        validar_url_imagen
    )


class CategoriaOut(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class JuegoResponse(JuegoBase):
    id: int
    en_venta: bool
    stock: int
    en_prestamo: bool = False
    me_gusta: int = 0  # cantidad de usuarios que lo marcaron como favorito
    categoria: CategoriaOut

    model_config = ConfigDict(from_attributes=True)
