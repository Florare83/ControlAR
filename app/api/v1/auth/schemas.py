
import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def normalizar_dni(valor: str | None) -> str | None:
    """Deja solo los dígitos ("30.123.456" -> "30123456"). Vacío -> None."""
    if valor is None:
        return None

    digitos = re.sub(r"\D", "", valor)

    if not digitos:
        return None

    if not 6 <= len(digitos) <= 9:
        raise ValueError("El DNI debe tener entre 6 y 9 números")

    return digitos


class UsuarioCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    email: EmailStr
    contrasena: str = Field(min_length=8, max_length=128)
    # Opcional en la API (el alta desde el panel no lo pide); el formulario público sí.
    dni: str | None = None

    @field_validator("dni")
    @classmethod
    def validar_dni(cls, valor):
        return normalizar_dni(valor)


class DniActualizar(BaseModel):
    dni: str

    @field_validator("dni")
    @classmethod
    def validar_dni(cls, valor):
        normalizado = normalizar_dni(valor)

        if normalizado is None:
            raise ValueError("Ingresá tu DNI")

        return normalizado


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: EmailStr
    es_admin: bool
    rol: str  # "admin" o "cliente"
    dni: str | None = None
    dni_verificado: bool = False

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
