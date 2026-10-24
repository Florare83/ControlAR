# Reglas de validación del formulario de contacto (sin dependencias, fáciles de probar).
# El frontend tiene las mismas reglas en src/utils/validacionesContacto.js:
# si se cambia una, hay que cambiar la otra.
import re
import unicodedata

NOMBRE_MAX = 60
TELEFONO_MAX = 30
EMAIL_MAX = 120
MENSAJE_MIN = 10
MENSAJE_MAX = 2000
TELEFONO_DIGITOS_MIN = 6
TELEFONO_DIGITOS_MAX = 15  # máximo del estándar internacional E.164

_RE_EMAIL = re.compile(
    r"[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*"
    r"@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}"
)
_RE_TELEFONO = re.compile(r"\+?\(?[0-9][0-9 ()\-]*")
_PERMITIDOS_NOMBRE = set(" '’.-")


class ErrorValidacion(ValueError):
    """Error con mensaje listo para mostrarle a la persona."""


def _espacios(valor: str) -> str:
    return " ".join(unicodedata.normalize("NFC", valor).split())


def validar_nombre(valor: str, etiqueta: str = "nombre") -> str:
    texto = _espacios(valor)
    if not texto:
        raise ErrorValidacion(f"Ingresá tu {etiqueta}.")
    if len(texto) > NOMBRE_MAX:
        raise ErrorValidacion(f"El {etiqueta} no puede superar los {NOMBRE_MAX} caracteres.")
    if not texto[0].isalpha() or not all(c.isalpha() or c in _PERMITIDOS_NOMBRE for c in texto):
        raise ErrorValidacion(
            f"El {etiqueta} solo puede tener letras, espacios, apóstrofes, puntos y guiones."
        )
    if sum(c.isalpha() for c in texto) < 2:
        raise ErrorValidacion(f"El {etiqueta} es demasiado corto.")
    return texto


def validar_telefono(valor: str) -> str:
    texto = " ".join(valor.split())
    if not texto:
        return ""
    if len(texto) > TELEFONO_MAX:
        raise ErrorValidacion(f"El teléfono no puede superar los {TELEFONO_MAX} caracteres.")
    if not _RE_TELEFONO.fullmatch(texto):
        raise ErrorValidacion(
            "Ingresá solo números, espacios, guiones y paréntesis (y un + al inicio si lleva código de país)."
        )
    digitos = sum(c.isdigit() for c in texto)
    if not TELEFONO_DIGITOS_MIN <= digitos <= TELEFONO_DIGITOS_MAX:
        raise ErrorValidacion(
            f"El teléfono debe tener entre {TELEFONO_DIGITOS_MIN} y {TELEFONO_DIGITOS_MAX} dígitos."
        )
    return texto


def validar_email(valor: str) -> str:
    texto = valor.strip()
    if not texto:
        return ""
    if len(texto) > EMAIL_MAX:
        raise ErrorValidacion(f"El email no puede superar los {EMAIL_MAX} caracteres.")
    if not _RE_EMAIL.fullmatch(texto):
        raise ErrorValidacion("Ingresá un email válido. Ejemplo: usuario@dominio.com")
    return texto.lower()


def validar_mensaje(valor: str) -> str:
    # Se quitan caracteres de control y de formato invisibles (salvo saltos de línea y tabs).
    limpio = "".join(
        c
        for c in unicodedata.normalize("NFC", valor.replace("\r\n", "\n").replace("\r", "\n"))
        if c in "\n\t" or unicodedata.category(c) not in ("Cc", "Cf")
    ).strip()
    if not limpio:
        raise ErrorValidacion("Escribí tu mensaje.")
    if len(limpio) < MENSAJE_MIN:
        raise ErrorValidacion(f"El mensaje es muy corto (mínimo {MENSAJE_MIN} caracteres).")
    if len(limpio) > MENSAJE_MAX:
        raise ErrorValidacion(f"El mensaje no puede superar los {MENSAJE_MAX} caracteres.")
    return limpio
