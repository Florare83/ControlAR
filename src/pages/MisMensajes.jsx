import { useCallback, useEffect, useRef, useState } from "react";
import {
  iniciarConversacion,
  listarMisMensajes,
  responderMiConversacion,
  verMiConversacion,
} from "../api/api.js";
import HiloMensajes from "../components/HiloMensajes.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { MENSAJE_MAX, MENSAJE_MIN } from "../utils/validacionesContacto.js";

// Le avisa al menú que cambió la cantidad de respuestas sin leer.
const avisarCambio = () =>
  window.dispatchEvent(new Event("mis-mensajes-actualizados"));

function formatearFecha(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Ventana para escribirle al equipo por primera vez.
function NuevoMensaje({ onCerrar, onEnviado }) {
  const toast = useToast();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    const limpio = texto.trim();

    if (limpio.length < MENSAJE_MIN) {
      setError(`El mensaje es muy corto (mínimo ${MENSAJE_MIN} caracteres).`);
      return;
    }

    setEnviando(true);
    setError("");
    try {
      await iniciarConversacion(limpio);
      toast.exito("Mensaje enviado. Te respondemos acá mismo.");
      onEnviado();
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Nuevo mensaje" ocupado={enviando} onCerrar={onCerrar} ancho={560}>
      <form className="formulario" onSubmit={enviar} noValidate>
        <p className="ayuda">
          Escribinos tu consulta. Vamos a responderte dentro de la app y te
          avisamos acá cuando haya una respuesta.
        </p>

        <div className="campo">
          <label htmlFor="nuevo-mensaje">Tu mensaje</label>
          <textarea
            id="nuevo-mensaje"
            rows={6}
            value={texto}
            maxLength={MENSAJE_MAX}
            autoFocus
            aria-invalid={error ? "true" : undefined}
            onChange={(e) => {
              setTexto(e.target.value);
              setError("");
            }}
          />
          <small className="ayuda">
            {texto.length} / {MENSAJE_MAX}
          </small>
          {error && (
            <span className="error" role="alert">
              {error}
            </span>
          )}
        </div>

        <div className="modal-acciones">
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar mensaje"}
          </button>
          <button
            type="button"
            className="boton boton-secundario"
            disabled={enviando}
            onClick={onCerrar}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Una conversación abierta: se ven todos los mensajes y se puede seguir escribiendo.
function Conversacion({ id, onCerrar }) {
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState("");
  const [texto, setTexto] = useState("");
  const [errorEnvio, setErrorEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fin = useRef(null);

  useEffect(() => {
    let vigente = true;

    verMiConversacion(id)
      .then((datos) => {
        if (!vigente) return;
        setDetalle(datos);
        avisarCambio(); // al abrirla se marcan como leídas las respuestas
      })
      .catch((e) => {
        if (vigente) setError(e.message);
      });

    return () => {
      vigente = false;
    };
  }, [id]);

  // Siempre se muestra el último mensaje.
  useEffect(() => {
    fin.current?.scrollIntoView?.({ block: "end" });
  }, [detalle]);

  async function enviar(evento) {
    evento.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;

    setEnviando(true);
    setErrorEnvio("");
    try {
      const actualizado = await responderMiConversacion(id, limpio);
      setDetalle(actualizado);
      setTexto("");
    } catch (e) {
      setErrorEnvio(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Conversación con el equipo"
      ocupado={enviando}
      onCerrar={onCerrar}
      ancho={680}
    >
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : !detalle ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando conversación...
        </p>
      ) : (
        <>
          <HiloMensajes mensajes={detalle.mensajes} yo="cliente" />
          <div ref={fin} />

          <form className="formulario hilo-responder" onSubmit={enviar} noValidate>
            <div className="campo">
              <label htmlFor="responder-hilo">Tu respuesta</label>
              <textarea
                id="responder-hilo"
                rows={3}
                value={texto}
                maxLength={MENSAJE_MAX}
                onChange={(e) => setTexto(e.target.value)}
              />
              {errorEnvio && (
                <span className="error" role="alert">
                  {errorEnvio}
                </span>
              )}
            </div>
            <div className="modal-acciones">
              <button
                type="submit"
                className="boton"
                disabled={enviando || !texto.trim()}
              >
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

// "Mis mensajes": las conversaciones del cliente con el equipo.
function MisMensajes() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [abierta, setAbierta] = useState(null); // id de la conversación abierta

  const cargar = useCallback(async () => {
    setError("");
    try {
      const datos = await listarMisMensajes();
      setItems(datos.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function cerrarConversacion() {
    setAbierta(null);
    cargar();
    avisarCambio();
  }

  return (
    <div className="pagina">
      <div className="prestamos-cabecera">
        <h1>Mis mensajes</h1>
        <button
          type="button"
          className="boton"
          style={{ width: "auto" }}
          onClick={() => setNuevoAbierto(true)}
        >
          Nuevo mensaje
        </button>
      </div>

      <p className="subtitulo">
        Tus conversaciones con el equipo. Las respuestas aparecen acá.
      </p>

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando mensajes...
        </p>
      ) : error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : items.length === 0 ? (
        <div className="tarjeta">
          <p>
            Todavía no le escribiste al equipo. Tocá «Nuevo mensaje» para
            hacernos una consulta.
          </p>
        </div>
      ) : (
        <ul className="mis-mensajes-lista">
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`tarjeta mis-mensajes-item ${c.sin_leer ? "sin-leer" : ""}`}
                onClick={() => setAbierta(c.id)}
              >
                <span className="mis-mensajes-asunto">
                  {c.asunto}
                  {c.sin_leer && (
                    <span className="etiqueta disponible">Respuesta nueva</span>
                  )}
                </span>
                <span className="mis-mensajes-meta">
                  {formatearFecha(c.ultima_actividad)} ·{" "}
                  {c.cantidad_respuestas === 0
                    ? "Esperando respuesta"
                    : `${c.cantidad_respuestas} ${
                        c.cantidad_respuestas === 1 ? "respuesta" : "respuestas"
                      }`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {nuevoAbierto && (
        <NuevoMensaje
          onCerrar={() => setNuevoAbierto(false)}
          onEnviado={() => {
            setNuevoAbierto(false);
            cargar();
            avisarCambio();
          }}
        />
      )}

      {abierta !== null && (
        <Conversacion key={abierta} id={abierta} onCerrar={cerrarConversacion} />
      )}
    </div>
  );
}

export default MisMensajes;
