// Reglas de validación del formulario de contacto.
// Son las mismas que en el backend (app/core/validaciones.py):
// si se cambia una, hay que cambiar la otra.

export const NOMBRE_MAX = 60;
export const TELEFONO_MAX = 30;
export const EMAIL_MAX = 120;
export const MENSAJE_MIN = 10;
export const MENSAJE_MAX = 2000;
const TELEFONO_DIGITOS_MIN = 6;
const TELEFONO_DIGITOS_MAX = 15; // máximo del estándar internacional E.164

export const LIMITES = {
  nombre: NOMBRE_MAX,
  apellido: NOMBRE_MAX,
  telefono: TELEFONO_MAX,
  email: EMAIL_MAX,
  mensaje: MENSAJE_MAX,
};

const RE_EMAIL =
  /^[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const RE_TELEFONO = /^\+?\(?[0-9][0-9 ()-]*$/;
const RE_NOMBRE = /^\p{L}[\p{L} '’.-]*$/u;

export const normalizarEspacios = (valor) =>
  valor.normalize("NFC").trim().split(/\s+/).filter(Boolean).join(" ");

// Cada función devuelve el mensaje de error, o "" si el valor es válido.

export function errorNombre(valor, etiqueta = "nombre") {
  const texto = normalizarEspacios(valor);
  if (!texto) return `Ingresá tu ${etiqueta}.`;
  if (texto.length > NOMBRE_MAX)
    return `El ${etiqueta} no puede superar los ${NOMBRE_MAX} caracteres.`;
  if (!RE_NOMBRE.test(texto))
    return `El ${etiqueta} solo puede tener letras, espacios, apóstrofes, puntos y guiones.`;
  if ((texto.match(/\p{L}/gu) || []).length < 2)
    return `El ${etiqueta} es demasiado corto.`;
  return "";
}

export function errorTelefono(valor) {
  const texto = valor.trim().split(/\s+/).filter(Boolean).join(" ");
  if (!texto) return "";
  if (texto.length > TELEFONO_MAX)
    return `El teléfono no puede superar los ${TELEFONO_MAX} caracteres.`;
  if (!RE_TELEFONO.test(texto))
    return "Ingresá solo números, espacios, guiones y paréntesis (y un + al inicio si lleva código de país).";
  const digitos = (texto.match(/[0-9]/g) || []).length;
  if (digitos < TELEFONO_DIGITOS_MIN || digitos > TELEFONO_DIGITOS_MAX)
    return `El teléfono debe tener entre ${TELEFONO_DIGITOS_MIN} y ${TELEFONO_DIGITOS_MAX} dígitos.`;
  return "";
}

export function errorEmail(valor) {
  const texto = valor.trim();
  if (!texto) return "";
  if (texto.length > EMAIL_MAX)
    return `El email no puede superar los ${EMAIL_MAX} caracteres.`;
  if (!RE_EMAIL.test(texto))
    return "Ingresá un email válido. Ejemplo: usuario@dominio.com";
  return "";
}

export function errorMensaje(valor) {
  // Igual que el backend: se ignoran caracteres de control e invisibles (salvo saltos de línea y tabs).
  const texto = valor
    .replace(/\r\n?/g, "\n")
    .replace(/[\p{Cc}\p{Cf}]/gu, (c) => (c === "\n" || c === "\t" ? c : ""))
    .trim();
  if (!texto) return "Escribí tu mensaje.";
  if (texto.length < MENSAJE_MIN)
    return `El mensaje es muy corto (mínimo ${MENSAJE_MIN} caracteres).`;
  if (texto.length > MENSAJE_MAX)
    return `El mensaje no puede superar los ${MENSAJE_MAX} caracteres.`;
  return "";
}

// Regla cruzada: tiene que haber al menos un email o un teléfono.
export function errorContacto({ email, telefono }) {
  return !email.trim() && !telefono.trim()
    ? "Ingresá al menos un Email o un Teléfono de contacto."
    : "";
}
