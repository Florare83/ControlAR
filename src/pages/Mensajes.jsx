import { useCallback, useEffect, useState } from "react";
import {
  eliminarMensaje,
  listarMensajes,
  marcarMensaje,
  responderMensaje,
  responderMensajeEnApp,
} from "../api/api.js";
import HiloMensajes from "../components/HiloMensajes.jsx";
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

  // Panel de respuesta por correo (SMTP): un solo mensaje abierto a la vez.
  const [respondiendoId, setRespondiendoId] = useState(null);
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Respuesta dentro de la app (solo para clientes con cuenta): un mensaje a la vez.
  const [respondiendoAppId, setRespondiendoAppId] = useState(null);
  const [textoApp, setTextoApp] = useState("");

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

  function abrirRespuestaApp(mensaje) {
    if (respondiendoAppId === mensaje.id) {
      setRespondiendoAppId(null);
      return;
    }
    setRespondiendoId(null);
    setRespondiendoAppId(mensaje.id);
    setTextoApp("");
  }

  // Aplica un mensaje actualizado a la lista y mantiene coherentes filtro y contadores.
  function aplicarRespuesta(mensaje, actualizado) {
    if (!mensaje.leido) {
      setNoLeidos((n) => n - 1);
      if (soloNoLeidos) setTotal((t) => t - 1);
    }
    setMensajes((actuales) =>
      soloNoLeidos
        ? actuales.filter((m) => m.id !== mensaje.id)
        : actuales.map((m) => (m.id === mensaje.id ? actualizado : m))
    );
    avisarCambio();
  }

  async function enviarRespuestaApp(evento, mensaje) {
    evento.preventDefault();
    if (enviando || !textoApp.trim()) return;

    setEnviando(true);
    try {
      const actualizado = await responderMensajeEnApp(mensaje.id, textoApp);
      aplicarRespuesta(mensaje, actualizado);
      setRespondiendoAppId(null);
      setTextoApp("");
      toast.exito(`Respuesta enviada a ${mensaje.nombre}. La verá en "Mis mensajes".`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  }

  function abrirRespuesta(mensaje) {
    if (respondiendoId === mensaje.id) {
      setRespondiendoId(null);
      return;
    }
    setRespondiendoAppId(null);
    setRespondiendoId(mensaje.id);
    setAsunto("Re: Tu consulta en ControlAR");
    setCuerpo(`Hola ${mensaje.nombre},\n\n`);
  }

  async function enviarRespuesta(evento, mensaje) {
    evento.preventDefault();
    if (enviando) return;

    setEnviando(true);
    try {
      const actualizado = await responderMensaje(mensaje.id, { asunto, cuerpo });

      // Responder lo marca como leído: se mantiene coherente el filtro y el contador.
      if (!mensaje.leido) {
        setNoLeidos((n) => n - 1);
        if (soloNoLeidos) setTotal((t) => t - 1);
      }
      setMensajes((actuales) =>
        soloNoLeidos
          ? actuales.filter((m) => m.id !== mensaje.id)
          : actuales.map((m) => (m.id === mensaje.id ? actualizado : m))
      );

      setRespondiendoId(null);
      avisarCambio();
      toast.exito(`Respuesta enviada a ${mensaje.email}.`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
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
        Consultas del formulario de contacto y mensajes de clientes con cuenta.
        A los clientes con cuenta se les responde dentro de la app; a los
        visitantes, por correo.
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
                      {m.es_cliente && (
                        <span className="etiqueta" title="Tiene cuenta: se le responde dentro de la app">
                          Cliente con cuenta
                        </span>
                      )}
                      {m.respondido_en && (
                        <span className="etiqueta mensaje-respondido">Respondido</span>
                      )}
                    </h2>
                    <p className="mensaje-meta">
                      {formatearFecha(m.creado_en)}
                      {m.email && (
                        <>
                          {" · "}
                          <button
                            type="button"
                            className="mensaje-email"
                            aria-expanded={respondiendoId === m.id}
                            title="Responder por correo"
                            onClick={() => abrirRespuesta(m)}
                          >
                            {m.email}
                          </button>
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

                {m.respuestas?.length > 0 && (
                  <HiloMensajes
                    mensajes={m.respuestas}
                    yo="admin"
                    nombreCliente={m.nombre}
                  />
                )}

                {respondiendoAppId === m.id && (
                  <form
                    className="mensaje-responder"
                    onSubmit={(e) => enviarRespuestaApp(e, m)}
                  >
                    <div className="campo">
                      <label htmlFor={`app-${m.id}`}>
                        Respuesta para {m.nombre} (la ve en "Mis mensajes")
                      </label>
                      <textarea
                        id={`app-${m.id}`}
                        rows={5}
                        value={textoApp}
                        maxLength={5000}
                        required
                        autoFocus
                        onChange={(e) => setTextoApp(e.target.value)}
                      />
                    </div>
                    <div className="mensaje-acciones">
                      <button
                        type="submit"
                        className="boton"
                        disabled={enviando || !textoApp.trim()}
                      >
                        {enviando ? "Enviando..." : "Enviar respuesta"}
                      </button>
                      <button
                        type="button"
                        className="boton boton-secundario"
                        disabled={enviando}
                        onClick={() => setRespondiendoAppId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {respondiendoId === m.id && (
                  <form
                    className="mensaje-responder"
                    onSubmit={(e) => enviarRespuesta(e, m)}
                  >
                    <div className="campo">
                      <label htmlFor={`para-${m.id}`}>Para</label>
                      <input id={`para-${m.id}`} type="email" value={m.email} readOnly />
                    </div>
                    <div className="campo">
                      <label htmlFor={`asunto-${m.id}`}>Asunto</label>
                      <input
                        id={`asunto-${m.id}`}
                        type="text"
                        value={asunto}
                        maxLength={150}
                        required
                        onChange={(e) => setAsunto(e.target.value)}
                      />
                    </div>
                    <div className="campo">
                      <label htmlFor={`cuerpo-${m.id}`}>Mensaje</label>
                      <textarea
                        id={`cuerpo-${m.id}`}
                        rows={6}
                        value={cuerpo}
                        maxLength={5000}
                        required
                        autoFocus
                        onChange={(e) => setCuerpo(e.target.value)}
                      />
                    </div>
                    <div className="mensaje-acciones">
                      <button type="submit" className="boton" disabled={enviando}>
                        {enviando ? "Enviando..." : "Enviar respuesta"}
                      </button>
                      <button
                        type="button"
                        className="boton boton-secundario"
                        disabled={enviando}
                        onClick={() => setRespondiendoId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                <div className="mensaje-acciones">
                  {m.es_cliente && (
                    <button
                      type="button"
                      className="boton"
                      aria-expanded={respondiendoAppId === m.id}
                      onClick={() => abrirRespuestaApp(m)}
                    >
                      Responder en la app
                    </button>
                  )}
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
