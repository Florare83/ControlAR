
const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

const CLAVE_TOKEN = "controlar_token";

export function obtenerToken() {
  try {
    return (
      window.localStorage.getItem(CLAVE_TOKEN) ||
      window.sessionStorage.getItem(CLAVE_TOKEN)
    );
  } catch {
    return null;
  }
}

export function guardarToken(token, recordar = false) {
  borrarToken();

  const almacenamiento = recordar
    ? window.localStorage
    : window.sessionStorage;

  almacenamiento.setItem(CLAVE_TOKEN, token);
}

export function borrarToken() {
  try {
    window.localStorage.removeItem(CLAVE_TOKEN);
    window.sessionStorage.removeItem(CLAVE_TOKEN);
  } catch {}
}

async function pedir(ruta, opciones = {}) {
  const token = obtenerToken();
  const headers = new Headers(opciones.headers || {});

  if (
    opciones.body &&
    !(opciones.body instanceof URLSearchParams) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let respuesta;

  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers,
    });
  } catch {
    throw new Error(
      `No se pudo conectar con la API (${API_URL}). ` +
      "Verificá que el backend esté funcionando y que VITE_API_URL sea correcta."
    );
  }

  if (!respuesta.ok) {
    let mensaje =
      `Error ${respuesta.status}: ` +
      (respuesta.statusText || "No se pudo completar la operación");

    try {
      const cuerpo = await respuesta.json();

      if (typeof cuerpo.detail === "string") {
        mensaje = cuerpo.detail;
      } else if (Array.isArray(cuerpo.detail)) {
        mensaje = cuerpo.detail
          .map(
            (item) =>
              `${Array.isArray(item.loc)
                ? item.loc[item.loc.length - 1]
                : "Campo"}: ${item.msg}`
          )
          .join("; ");
      }
    } catch {}

    throw new Error(mensaje);
  }

  if (respuesta.status === 204 || respuesta.status === 205) {
    return null;
  }

  const texto = await respuesta.text();
  return texto ? JSON.parse(texto) : null;
}

export const listarJuegos = () => pedir("/juegos/");

export const crearJuego = (datos) =>
  pedir("/juegos/", {
    method: "POST",
    body: JSON.stringify(datos),
  });

export const actualizarJuego = (id, datos) =>
  pedir(`/juegos/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });

export const eliminarJuego = (id) =>
  pedir(`/juegos/${id}`, { method: "DELETE" });

export const listarCategorias = () => pedir("/categorias/");

export const iniciarSesion = (email, contrasena) =>
  pedir("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      username: email,
      password: contrasena,
    }),
  });

export const registrarUsuario = (datos) =>
  pedir("/auth/register", {
    method: "POST",
    body: JSON.stringify(datos),
  });

export const obtenerPerfil = () => pedir("/auth/me");

export const listarPrestamos = (estado) =>
  pedir(
    estado ? `/prestamos/?estado=${estado}` : "/prestamos/"
  );

export const registrarPrestamo = (datos) =>
  pedir("/prestamos/", {
    method: "POST",
    body: JSON.stringify(datos),
  });

export const cambiarJuegoPrestamo = (id, juegoId) =>
  pedir(`/prestamos/${id}/juego`, {
    method: "PUT",
    body: JSON.stringify({ juego_id: juegoId }),
  });

export const devolverPrestamo = (id) =>
  pedir(`/prestamos/${id}/devolver`, {
    method: "POST",
  });

// Favoritos
export const listarFavoritos = () => pedir("/favoritos/");

export const agregarFavorito = (juegoId) =>
  pedir(`/favoritos/${juegoId}`, { method: "POST" });

export const quitarFavorito = (juegoId) =>
  pedir(`/favoritos/${juegoId}`, { method: "DELETE" });

// Cuenta
export const cambiarContrasena = (contrasenaActual, contrasenaNueva) =>
  pedir("/auth/cambiar-contrasena", {
    method: "POST",
    body: JSON.stringify({
      contrasena_actual: contrasenaActual,
      contrasena_nueva: contrasenaNueva,
    }),
  });

export const eliminarCuenta = (contrasena) =>
  pedir("/auth/me", {
    method: "DELETE",
    body: JSON.stringify({ contrasena }),
  });

// Compras (carrito -> Mercado Pago)
export const crearCheckout = (items) =>
  pedir("/pedidos/checkout", {
    method: "POST",
    body: JSON.stringify({
      items: items.map((i) => ({ juego_id: i.id, cantidad: i.cantidad })),
    }),
  });

export const confirmarPedido = (pedidoId, pagoId) =>
  pedir(`/pedidos/${pedidoId}/confirmar`, {
    method: "POST",
    body: JSON.stringify({ pago_id: pagoId || null }),
  });

// Contacto
export const enviarContacto = (datos) =>
  pedir("/contacto/", { method: "POST", body: JSON.stringify(datos) });

// Mensajes de contacto (solo administrador)
export const listarMensajes = ({ soloNoLeidos = false, limite = 20, desplazamiento = 0 } = {}) =>
  pedir(
    `/contacto/?solo_no_leidos=${soloNoLeidos}&limite=${limite}&desplazamiento=${desplazamiento}`
  );

export const marcarMensaje = (id, leido) =>
  pedir(`/contacto/${id}`, { method: "PATCH", body: JSON.stringify({ leido }) });

export const eliminarMensaje = (id) =>
  pedir(`/contacto/${id}`, { method: "DELETE" });
