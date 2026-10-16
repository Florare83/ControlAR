
import { useEffect, useState } from "react";
import { listarMensajesContacto } from "../api/api.js";

function MensajesContacto() {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activa = true;

    async function cargarMensajes() {
      try {
        const resultado = await listarMensajesContacto();

        if (activa) {
          setMensajes(Array.isArray(resultado) ? resultado : []);
        }
      } catch (err) {
        if (activa) {
          setError(err.message || "No se pudieron cargar los mensajes.");
        }
      } finally {
        if (activa) setCargando(false);
      }
    }

    cargarMensajes();

    return () => {
      activa = false;
    };
  }, []);

  return (
    <section className="pagina-mensajes" style={{ padding: "24px" }}>
      <h1>Mensajes recibidos</h1>
      <p>Consultas enviadas desde el formulario de contacto.</p>

      {cargando && <p>Cargando mensajes...</p>}

      {!cargando && error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      )}

      {!cargando && !error && mensajes.length === 0 && (
        <p>Todavía no hay mensajes recibidos.</p>
      )}

      {!cargando && !error && mensajes.length > 0 && (
        <div style={{ display: "grid", gap: 16 }}>
          {mensajes.map((mensaje) => (
            <article
              key={mensaje.id}
              style={{
                border: "1px solid var(--borde, #ccc)",
                borderRadius: 10,
                padding: 18,
                background: "var(--fondo, #fff)",
                color: "var(--texto, #222)",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {mensaje.nombre} {mensaje.apellido}
              </h2>

              <p>
                <strong>Recibido:</strong>{" "}
                {new Date(mensaje.fecha_creacion).toLocaleString("es-AR")}
              </p>

              {mensaje.email && (
                <p>
                  <strong>Correo:</strong>{" "}
                  <a href={`mailto:${mensaje.email}`}>
                    {mensaje.email}
                  </a>
                </p>
              )}

              {mensaje.telefono && (
                <p>
                  <strong>Teléfono:</strong>{" "}
                  <a href={`tel:${mensaje.telefono}`}>
                    {mensaje.telefono}
                  </a>
                </p>
              )}

              <div>
                <strong>Mensaje:</strong>
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {mensaje.mensaje}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default MensajesContacto;
