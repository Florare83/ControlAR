import { useCallback, useEffect, useState } from "react";
import {
  eliminarMensaje,
  listarMensajes,
  marcarMensaje,
} from "../api/api.js";
import { useToast } from "../context/ToastContext.jsx";

const POR_PAGINA = 20;

// Le avisa al menú lateral del panel que cambió la cantidad de mensajes sin leer.
const avisarCambio = () => window.dispatchEvent(new Event("mensajes-actualizados"));

function formatearFecha(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Bandeja de mensajes del formulario de contacto (solo administrador).
function Mensajes() {
  const toast = useToast();

  const [mensajes, setMensajes] = useState([]);
  const [total, setTotal] = useState(0);
  const [noLeidos, setNoLeidos] = useState(0);
  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(null); // id del mensaje en proceso

  const cargar = useCallback(async () => {
    setError("");
    setCargando(true);
    try {
      const datos = await listarMensajes({ soloNoLeidos, limite: POR_PAGINA });
      setMensajes(datos.items);
      setTotal(datos.total);
      setNoLeidos(datos.no_leidos);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [soloNoLeidos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function verMas() {
    setCargandoMas(true);
    try {
      const datos = await listarMensajes({
        soloNoLeidos,
        limite: POR_PAGINA,
        desplazamiento: mensajes.length,
      });
      setMensajes((actuales) => [...actuales, ...datos.items]);
      setTotal(datos.total);
      setNoLeidos(datos.no_leidos);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCargandoMas(false);
    }
  }

  async function alternarLeido(mensaje) {
    setOcupado(mensaje.id);
    try {
      const actualizado = await marcarMensaje(mensaje.id, !mensaje.leido);
      setMensajes((actuales) =>
        soloNoLeidos && actualizado.leido
          ? actuales.filter((m) => m.id !== mensaje.id)
          : actuales.map((m) => (m.id === mensaje.id ? actualizado : m))
      );
      setNoLeidos((n) => n + (actualizado.leido ? -1 : 1));
      if (soloNoLeidos && actualizado.leido) setTotal((t) => t - 1);
      avisarCambio();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setOcupado(null);
    }
  }

  async function borrar(mensaje) {
    if (
      !window.confirm(
        `¿Eliminar el mensaje de ${mensaje.nombre} ${mensaje.apellido}? No se puede deshacer.`
      )
    ) {
      return;
    }

    setOcupado(mensaje.id);
    try {
      await eliminarMensaje(mensaje.id);
      setMensajes((actuales) => actuales.filter((m) => m.id !== mensaje.id));
      setTotal((t) => t - 1);
      if (!mensaje.leido) setNoLeidos((n) => n - 1);
      avisarCambio();
      toast.exito("Mensaje eliminado.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      <h1>Mensajes de contacto</h1>
      <p className="subtitulo">
        Consultas enviadas desde el formulario de contacto del sitio.
      </p>

      <div className="mensajes-filtros" role="group" aria-label="Filtrar mensajes">
        <button
          type="button"
          className={`filtro-boton ${!soloNoLeidos ? "activo" : ""}`}
          aria-pressed={!soloNoLeidos}
          onClick={() => setSoloNoLeidos(false)}
        >
          Todos
        </button>
        <button
          type="button"
          className={`filtro-boton ${soloNoLeidos ? "activo" : ""}`}
          aria-pressed={soloNoLeidos}
          onClick={() => setSoloNoLeidos(true)}
        >
          Sin leer{noLeidos > 0 ? ` (${noLeidos})` : ""}
        </button>
      </div>

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando mensajes...
        </p>
      ) : error ? (
        <p className="error" role="alert">{error}</p>
      ) : mensajes.length === 0 ? (
        <div className="tarjeta">
          <p>
            {soloNoLeidos
              ? "No tenés mensajes sin leer."
              : "Todavía no recibiste mensajes."}
          </p>
        </div>
      ) : (
        <>
          <ul className="mensajes-lista">
            {mensajes.map((m) => (
              <li
                key={m.id}
                className={`tarjeta mensaje ${m.leido ? "" : "mensaje-nuevo"}`}
              >
                <div className="mensaje-cabecera">
                  <div>
                    <h2>
                      {m.nombre} {m.apellido}
                      {!m.leido && <span className="etiqueta disponible">Nuevo</span>}
                    </h2>
                    <p className="mensaje-meta">
                      {formatearFecha(m.creado_en)}
                      {m.email && (
                        <>
                          {" · "}
                          <a href={`mailto:${m.email}`}>{m.email}</a>
                        </>
                      )}
                      {m.telefono && (
                        <>
                          {" · "}
                          <a href={`tel:${m.telefono.replace(/\s/g, "")}`}>{m.telefono}</a>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <p className="mensaje-texto">{m.mensaje}</p>

                <div className="mensaje-acciones">
                  <button
                    type="button"
                    className="boton"
                    disabled={ocupado === m.id}
                    onClick={() => alternarLeido(m)}
                  >
                    {m.leido ? "Marcar como no leído" : "Marcar como leído"}
                  </button>
                  <button
                    type="button"
                    className="boton boton-peligro"
                    disabled={ocupado === m.id}
                    aria-label={`Eliminar mensaje de ${m.nombre} ${m.apellido}`}
                    onClick={() => borrar(m)}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="mensajes-pie">
            Mostrando {mensajes.length} de {total}
          </p>

          {mensajes.length < total && (
            <button
              type="button"
              className="boton mensajes-mas"
              disabled={cargandoMas}
              onClick={verMas}
            >
              {cargandoMas ? "Cargando..." : "Ver más"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default Mensajes;
