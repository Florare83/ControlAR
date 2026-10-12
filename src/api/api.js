// src/api/api.js
// Todas las llamadas al backend de ControlAR se centralizan en este archivo.

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const CLAVE_TOKEN = "controlar_token";

export function obtenerToken() {
  try {
    return window.localStorage.getItem(CLAVE_TOKEN) || window.sessionStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token, recordar = false) {
  borrarToken();
  const almacenamiento = recordar ? window.localStorage : window.sessionStorage;
  almacenamiento.setItem(CLAVE_TOKEN, token);
}

export function borrarToken() {
  try {
    window.localStorage.removeItem(CLAVE_TOKEN);
    window.sessionStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // No hacemos nada si el navegador bloquea el almacenamiento.
  }
}

async function pedir(ruta, opciones = {}) {
  const token = obtenerToken();
  const headers = new Headers(opciones.headers || {});

  // No forzar JSON para formularios URL-encoded (inicio de sesión).
  if (opciones.body && !(opciones.body instanceof URLSearchParams) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, { ...opciones, headers });
  } catch {
    throw new Error(`No se pudo conectar con la API (${API_URL}). Verificá que el backend esté funcionando y que VITE_API_URL sea correcta.`);
  }

  if (!respuesta.ok) {
    let mensaje = `Error ${respuesta.status}: ${respuesta.statusText || "No se pudo completar la operación"}`;
    try {
      const cuerpo = await respuesta.json();
      if (typeof cuerpo.detail === "string") {
        mensaje = cuerpo.detail;
      } else if (Array.isArray(cuerpo.detail)) {
        mensaje = cuerpo.detail
          .map((item) => `${Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "Campo"}: ${item.msg}`)
          .join("; ");
      }
    } catch {
      // La respuesta no contiene JSON; usamos el mensaje HTTP.
    }
    throw new Error(mensaje);
  }

  if (respuesta.status === 204) return null;
  if (respuesta.status === 205) return null;
  const texto = await respuesta.text();
  return texto ? JSON.parse(texto) : null;
}

// Juegos y categorías. La API del proyecto usa estas rutas.
export const listarJuegos = () => pedir("/juegos/");
export const crearJuego = (datos) => pedir("/juegos/", { method: "POST", body: JSON.stringify(datos) });
export const actualizarJuego = (id, datos) => pedir(`/juegos/${id}`, { method: "PUT", body: JSON.stringify(datos) });
export const eliminarJuego = (id) => pedir(`/juegos/${id}`, { method: "DELETE" });
export const listarCategorias = () => pedir("/categorias/");

// Autenticación. FastAPI recibe el login como formulario OAuth2.
export const iniciarSesion = (email, contrasena) =>
  pedir("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password: contrasena }),
  });

export const registrarUsuario = (datos) =>
  pedir("/auth/register", { method: "POST", body: JSON.stringify(datos) });

export const obtenerPerfil = () => pedir("/auth/me");

// Préstamos. El backend debe validar que el usuario sea administrador.
export const listarPrestamos = () => pedir("/prestamos/");
export const crearPrestamo = (datos) =>
  pedir("/prestamos/", { method: "POST", body: JSON.stringify(datos) });
export const actualizarDevolucion = (id, devuelto) =>
  pedir(`/prestamos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ devuelto }),
  });
