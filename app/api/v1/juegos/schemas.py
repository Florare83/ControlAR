
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


def limpiar_observaciones(valor: str | None) -> str | None:
    """Saca espacios sobrantes; un texto vacío significa "sin observaciones"."""
    if valor is None:
        return None

    valor = valor.strip()
    return valor or None


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
    se_presta: bool = False
    observaciones: str | None = Field(default=None, max_length=300)
    _limpiar_observaciones = field_validator("observaciones")(
        limpiar_observaciones
    )
    stock: int = Field(ge=0)
    categoria_id: int = Field(ge=1)


class JuegoUpdate(BaseModel):
    titulo: str | None = None
    editorial: str | None = None
    cantidad_jugadores: str | None = None
    duracion_minutos: int | None = None
    edad_minima: int | None = None
    en_venta: bool | None = None
    se_presta: bool | None = None
    stock: int | None = None
    precio: float | None = None
    categoria_id: int | None = None
    imagen_url: str | None = Field(default=None, max_length=1000)
    observaciones: str | None = Field(default=None, max_length=300)

    _validar_imagen = field_validator("imagen_url")(
        validar_url_imagen
    )
    _limpiar_observaciones = field_validator("observaciones")(
        limpiar_observaciones
    )


class CategoriaOut(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class JuegoResponse(JuegoBase):
    id: int
    en_venta: bool
    se_presta: bool = False  # forma parte de la ludoteca (se puede prestar y reservar)
    stock: int
    en_prestamo: bool = False  # está prestado ahora mismo
    me_gusta: int = 0  # cantidad de usuarios que lo marcaron como favorito
    # Nota interna: la API solo la devuelve a administradores (a los demás les llega vacía).
    observaciones: str | None = None
    categoria: CategoriaOut

    model_config = ConfigDict(from_attributes=True)
