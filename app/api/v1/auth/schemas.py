from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    email: EmailStr
    contrasena: str = Field(min_length=8, max_length=128)


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: EmailStr
    es_admin: bool

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
