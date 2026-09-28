// Todas las llamadas al backend viven acá. Las páginas y componentes
// no usan fetch directamente: usan estas funciones.

// En desarrollo la URL sale de .env.development; en Render, de la
// variable de entorno VITE_API_URL del Static Site.
const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

async function pedir(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      headers: { "Content-Type": "application/json" },
      ...opciones,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Probá de nuevo en unos segundos.");
  }

  if (!respuesta.ok) {
    let mensaje = `Error ${respuesta.status}`;
    try {
      const cuerpo = await respuesta.json();
      if (typeof cuerpo.detail === "string") {
        mensaje = cuerpo.detail; // errores 400 / 404 de la API
      } else if (Array.isArray(cuerpo.detail)) {
        // errores 422 de validación (Pydantic)
        mensaje = cuerpo.detail
          .map((d) => `${d.loc[d.loc.length - 1]}: ${d.msg}`)
          .join("; ");
      }
    } catch {
      // la respuesta no traía JSON: dejamos el mensaje genérico
    }
    throw new Error(mensaje);
  }

  if (respuesta.status === 204) return null; // DELETE no devuelve cuerpo
  return respuesta.json();
}

// OJO: la ruta lleva "/" al final ("/juegos/") porque así está definida
// en FastAPI. Sin esa barra, el servidor redirige y en Render puede fallar.
export const listarJuegos = () => pedir("/juegos/");

export const crearJuego = (datos) =>
  pedir("/juegos/", { method: "POST", body: JSON.stringify(datos) });

export const actualizarJuego = (id, datos) =>
  pedir(`/juegos/${id}`, { method: "PUT", body: JSON.stringify(datos) });

export const eliminarJuego = (id) => pedir(`/juegos/${id}`, { method: "DELETE" });

export const listarCategorias = () => pedir("/categorias/");