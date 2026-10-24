
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

// Juegos
export const listarJuegos = () => pedir("/juegos/");

export const listarJuegosPopulares = (limite = 2) =>
  pedir(`/juegos/populares?limite=${limite}`);

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

// Autenticación
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

// Préstamos: administración
export const listarPrestamos = (estado) =>
  pedir(
    estado ? `/prestamos/?estado=${encodeURIComponent(estado)}` : "/prestamos/"
  );

export const buscarPersonaPorDni = (dni) =>
  pedir(`/prestamos/buscar-persona/${encodeURIComponent(dni)}`);

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

// Deshace una devolución registrada por error (hasta 48 horas después).
export const reabrirPrestamo = (id) =>
  pedir(`/prestamos/${id}/reabrir`, {
    method: "POST",
  });

// Préstamos: historial del cliente autenticado
// Historial de préstamos de los clientes (administración)
export const listarHistorialPrestamos = ({
  buscar = "",
  estado = "",
  limite = 20,
  desplazamiento = 0,
} = {}) => {
  const parametros = new URLSearchParams({ limite, desplazamiento });
  if (buscar.trim()) parametros.set("buscar", buscar.trim());
  if (estado) parametros.set("estado", estado);
  return pedir(`/prestamos/historial?${parametros}`);
};

export const historialPrestamosDePersona = ({ dni = "", email = "" } = {}) => {
  const parametros = new URLSearchParams();
  if (dni) parametros.set("dni", dni);
  else if (email) parametros.set("email", email);
  return pedir(`/prestamos/historial/persona?${parametros}`);
};

export const listarMisPrestamos = () =>
  pedir("/mi-cuenta/prestamos");

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

// Compras: carrito -> Mercado Pago
export const crearCheckout = (items) =>
  pedir("/pedidos/checkout", {
    method: "POST",
    body: JSON.stringify({
      items: items.map((i) => ({
        juego_id: i.id,
        cantidad: i.cantidad,
      })),
    }),
  });

// Pedido para pagar en efectivo o por transferencia: queda pendiente hasta
// que el administrador confirma que el pago se concretó.
export const crearPedidoEfectivo = (items) =>
  pedir("/pedidos/efectivo", {
    method: "POST",
    body: JSON.stringify({
      items: items.map((i) => ({
        juego_id: i.id,
        cantidad: i.cantidad,
      })),
    }),
  });

export const marcarPedidoPagado = (pedidoId) =>
  pedir(`/pedidos/${pedidoId}/marcar-pagado`, { method: "POST" });

export const cancelarPedidoEfectivo = (pedidoId) =>
  pedir(`/pedidos/${pedidoId}/cancelar`, { method: "POST" });

export const confirmarPedido = (pedidoId, pagoId) =>
  pedir(`/pedidos/${pedidoId}/confirmar`, {
    method: "POST",
    body: JSON.stringify({ pago_id: pagoId || null }),
  });

// Contacto
export const enviarContacto = (datos) =>
  pedir("/contacto/", {
    method: "POST",
    body: JSON.stringify(datos),
  });

// Mensajes de contacto: administración
export const listarMensajes = ({
  soloNoLeidos = false,
  limite = 20,
  desplazamiento = 0,
} = {}) =>
  pedir(
    `/contacto/?solo_no_leidos=${soloNoLeidos}&limite=${limite}&desplazamiento=${desplazamiento}`
  );

export const marcarMensaje = (id, leido) =>
  pedir(`/contacto/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ leido }),
  });

export const responderMensaje = (id, { asunto, cuerpo }) =>
  pedir(`/contacto/${id}/responder`, {
    method: "POST",
    body: JSON.stringify({ asunto, cuerpo }),
  });

export const eliminarMensaje = (id) =>
  pedir(`/contacto/${id}`, { method: "DELETE" });


// ---------------------------------------------------------
// ADMINISTRACIÓN DE USUARIOS
// ---------------------------------------------------------

export const listarUsuariosAdmin = (buscar = "") => {
  const parametros = new URLSearchParams();
  const termino = buscar.trim();

  if (termino) {
    parametros.set("buscar", termino);
  }

  const query = parametros.toString();

  return pedir(
    `/auth/admin/usuarios${query ? `?${query}` : ""}`
  );
};

export const actualizarUsuarioAdmin = (usuarioId, cambios) =>
  pedir(`/auth/admin/usuarios/${usuarioId}`, {
    method: "PATCH",
    body: JSON.stringify(cambios),
  });

// Alta de usuarios por el administrador.
// Usa el registro existente (/auth/register) y, si el nuevo usuario debe ser
// administrador, lo promueve con el PATCH de administración que ya existe.
export async function crearUsuarioAdmin({
  nombre,
  email,
  contrasena,
  es_admin = false,
}) {
  const creado = await registrarUsuario({ nombre, email, contrasena });

  if (!es_admin) return creado;

  try {
    let id = creado && creado.id;

    if (!id) {
      const lista = await listarUsuariosAdmin(email);
      const encontrado = (Array.isArray(lista) ? lista : []).find(
        (u) => String(u.email).toLowerCase() === email.toLowerCase()
      );
      id = encontrado && encontrado.id;
    }

    if (!id) throw new Error("No se encontró el usuario recién creado.");

    await actualizarUsuarioAdmin(id, { es_admin: true });
  } catch (e) {
    throw new Error(
      "El usuario se creó como cliente, pero no se pudo asignar el rol " +
        `de administrador: ${e.message} Cambiá el rol desde la tabla.`
    );
  }

  return creado;
}


// Historial de compras del cliente autenticado
export const listarMisCompras = () => pedir("/pedidos/mis-compras");


// Ventas: administración
export const listarVentasAdmin = ({ estado = "", buscar = "" } = {}) => {
  const parametros = new URLSearchParams();

  if (estado) parametros.set("estado", estado);
  if (buscar.trim()) parametros.set("buscar", buscar.trim());

  const query = parametros.toString();

  return pedir(`/pedidos/admin/ventas${query ? `?${query}` : ""}`);
};


// ---------------------------------------------------------
// EVENTOS
// ---------------------------------------------------------

export const listarEventos = () => pedir("/eventos/");

export const crearEvento = (datos) =>
  pedir("/eventos/", { method: "POST", body: JSON.stringify(datos) });

export const actualizarEvento = (id, datos) =>
  pedir(`/eventos/${id}`, { method: "PUT", body: JSON.stringify(datos) });

export const duplicarEvento = (id, datos) =>
  pedir(`/eventos/${id}/duplicar`, {
    method: "POST",
    body: JSON.stringify(datos),
  });

export const eliminarEvento = (id) =>
  pedir(`/eventos/${id}`, { method: "DELETE" });


// ---------------------------------------------------------
// RESERVAS
// ---------------------------------------------------------

// Público: evento reservable, si siguen abiertas y qué juegos ya están reservados.
export const obtenerEstadoReservas = () => pedir("/reservas/estado");

// Cliente autenticado
export const listarMisReservas = () => pedir("/reservas/mias");

export const reservarJuego = (juegoId) =>
  pedir("/reservas/", {
    method: "POST",
    body: JSON.stringify({ juego_id: juegoId }),
  });

export const cancelarReserva = (id) =>
  pedir(`/reservas/${id}`, { method: "DELETE" });

// Administración
export const listarReservasAdmin = (eventoId) =>
  pedir(eventoId ? `/reservas/?evento_id=${eventoId}` : "/reservas/");

export const entregarReserva = (id, datos) =>
  pedir(`/reservas/${id}/entregar`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
