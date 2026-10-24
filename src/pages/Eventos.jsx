import { useEffect, useState } from "react";
import {
  actualizarEvento,
  crearEvento,
  duplicarEvento,
  eliminarEvento,
  listarEventos,
} from "../api/api.js";
import { partesFecha } from "../data/eventos.js";
import Modal from "../components/Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";

const TIPOS = ["Tarde de juegos", "Torneo", "Encuentro"];

const VACIO = {
  tipo: "Tarde de juegos",
  titulo: "",
  descripcion: "",
  fecha: "",
  fecha_texto: "",
  mes_corto: "",
  hora_inicio: "",
  hora_texto: "",
  lugar: "",
  direccion: "",
  inscripcion: false,
  aporte: "",
  imagen_url: "",
  permite_reservas: false,
};

function desdeEvento(e) {
  return {
    tipo: e.tipo,
    titulo: e.titulo,
    descripcion: e.descripcion ?? "",
    fecha: e.fecha ?? "",
    fecha_texto: e.fecha_texto ?? "",
    mes_corto: e.mes_corto ?? "",
    hora_inicio: e.hora_inicio ? e.hora_inicio.slice(0, 5) : "",
    hora_texto: e.hora_texto ?? "",
    lugar: e.lugar,
    direccion: e.direccion,
    inscripcion: e.inscripcion,
    aporte: e.aporte ?? "",
    imagen_url: e.imagen_url ?? "",
    permite_reservas: e.permite_reservas,
  };
}

// Textos vacíos -> null; fecha y hora vacías -> null.
function haciaApi(form) {
  return {
    tipo: form.tipo,
    titulo: form.titulo.trim(),
    descripcion: form.descripcion.trim() || null,
    fecha: form.fecha || null,
    fecha_texto: form.fecha_texto.trim() || null,
    mes_corto: form.mes_corto.trim().toUpperCase() || null,
    hora_inicio: form.hora_inicio || null,
    hora_texto: form.hora_texto.trim(),
    lugar: form.lugar.trim(),
    direccion: form.direccion.trim(),
    inscripcion: form.inscripcion,
    aporte: form.aporte.trim() || null,
    imagen_url: form.imagen_url.trim() || null,
    permite_reservas: form.permite_reservas,
  };
}

function Eventos() {
  const toast = useToast();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [editando, setEditando] = useState(null); // null | "nuevo" | evento
  const [form, setForm] = useState(VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ocupado, setOcupado] = useState(null);

  async function cargar() {
    setErrorCarga("");

    try {
      setEventos(await listarEventos());
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrir(evento) {
    setEditando(evento);
    setForm(evento === "nuevo" ? VACIO : desdeEvento(evento));
    setErrorForm("");
  }

  function cambiar(campo, valor) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    setErrorForm("");

    if (form.permite_reservas && (!form.fecha || !form.hora_inicio)) {
      setErrorForm("Para permitir reservas hace falta la fecha exacta y la hora de inicio.");
      return;
    }

    setGuardando(true);

    try {
      if (editando === "nuevo") {
        await crearEvento(haciaApi(form));
        toast.exito("Evento creado.");
      } else {
        await actualizarEvento(editando.id, haciaApi(form));
        toast.exito("Evento actualizado.");
      }
      setEditando(null);
      await cargar();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function duplicar(evento) {
    const fecha = window.prompt(
      `Fecha del nuevo evento (AAAA-MM-DD), copia de "${evento.titulo}":`,
      ""
    );

    if (!fecha) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha.trim())) {
      toast.error("Escribí la fecha con el formato AAAA-MM-DD, por ejemplo 2026-11-29.");
      return;
    }

    setOcupado(evento.id);

    try {
      await duplicarEvento(evento.id, { fecha: fecha.trim() });
      toast.exito("Evento duplicado. Revisá los datos y ajustá lo que haga falta.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  }

  async function borrar(evento) {
    if (!window.confirm(`¿Eliminar "${evento.titulo}"? No se puede deshacer.`)) return;

    setOcupado(evento.id);

    try {
      await eliminarEvento(evento.id);
      toast.exito("Evento eliminado.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      <h1>Eventos</h1>
      <p className="subtitulo">
        Lo que cargues acá aparece en las páginas Club y Nosotros. Con fecha exacta, el evento
        pasa solo a "anteriores" después de ese día.
      </p>

      <button className="boton" style={{ width: "auto", marginBottom: 20 }} onClick={() => abrir("nuevo")}>
        Nuevo evento
      </button>

      {editando && (
        <Modal
          titulo={editando === "nuevo" ? "Nuevo evento" : `Editar "${editando.titulo}"`}
          ocupado={guardando}
          onCerrar={() => setEditando(null)}
        >
          <form className="formulario" onSubmit={guardar} aria-busy={guardando}>
            <div className="campo">
              <label htmlFor="ev-tipo">Tipo</label>
              <select id="ev-tipo" value={form.tipo} onChange={(e) => cambiar("tipo", e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <small className="ayuda">Los torneos se muestran en su propia sección.</small>
            </div>

            <div className="campo">
              <label htmlFor="ev-titulo">Título</label>
              <input id="ev-titulo" value={form.titulo} onChange={(e) => cambiar("titulo", e.target.value)} minLength={2} maxLength={120} required />
            </div>

            <div className="campo">
              <label htmlFor="ev-descripcion">Descripción (opcional)</label>
              <input id="ev-descripcion" value={form.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} maxLength={500} />
            </div>

            <div className="campo">
              <label htmlFor="ev-fecha">Fecha</label>
              <input id="ev-fecha" type="date" value={form.fecha} onChange={(e) => cambiar("fecha", e.target.value)} />
              <small className="ayuda">Si todavía no hay fecha exacta, dejala vacía y completá el texto de abajo.</small>
            </div>

            {!form.fecha && (
              <>
                <div className="campo">
                  <label htmlFor="ev-fecha-texto">Fecha en texto</label>
                  <input id="ev-fecha-texto" value={form.fecha_texto} onChange={(e) => cambiar("fecha_texto", e.target.value)} maxLength={60} placeholder="Durante junio" />
                </div>
                <div className="campo">
                  <label htmlFor="ev-mes">Mes abreviado</label>
                  <input id="ev-mes" value={form.mes_corto} onChange={(e) => cambiar("mes_corto", e.target.value)} maxLength={3} placeholder="JUN" />
                </div>
              </>
            )}

            <div className="campo">
              <label htmlFor="ev-hora-inicio">Hora de inicio</label>
              <input id="ev-hora-inicio" type="time" value={form.hora_inicio} onChange={(e) => cambiar("hora_inicio", e.target.value)} />
              <small className="ayuda">Se usa para calcular cuánto tiempo se guarda una reserva (30 minutos desde esta hora).</small>
            </div>

            <div className="campo">
              <label htmlFor="ev-hora-texto">Horario que se muestra</label>
              <input id="ev-hora-texto" value={form.hora_texto} onChange={(e) => cambiar("hora_texto", e.target.value)} maxLength={40} placeholder="17 a 21 h" />
            </div>

            <div className="campo">
              <label htmlFor="ev-lugar">Lugar</label>
              <input id="ev-lugar" value={form.lugar} onChange={(e) => cambiar("lugar", e.target.value)} maxLength={120} required />
            </div>

            <div className="campo">
              <label htmlFor="ev-direccion">Dirección</label>
              <input id="ev-direccion" value={form.direccion} onChange={(e) => cambiar("direccion", e.target.value)} maxLength={160} required />
            </div>

            <div className="campo">
              <label htmlFor="ev-aporte">Aporte o inscripción (opcional)</label>
              <input id="ev-aporte" value={form.aporte} onChange={(e) => cambiar("aporte", e.target.value)} maxLength={200} placeholder="Aporte mínimo: $2.000 por persona" />
            </div>

            <div className="campo">
              <label htmlFor="ev-imagen">URL del flyer (opcional)</label>
              <input id="ev-imagen" type="url" value={form.imagen_url} onChange={(e) => cambiar("imagen_url", e.target.value)} placeholder="https://ejemplo.com/flyer.jpg" />
              <small className="ayuda">Si la dejás vacía se usa una foto genérica.</small>
            </div>

            <div className="campo">
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={form.inscripcion} onChange={(e) => cambiar("inscripcion", e.target.checked)} style={{ width: "auto" }} />
                Requiere inscripción previa
              </label>
            </div>

            <div className="campo">
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={form.permite_reservas} onChange={(e) => cambiar("permite_reservas", e.target.checked)} style={{ width: "auto" }} aria-describedby="ayuda-reservas" />
                Permite reservar juegos
              </label>
              <small id="ayuda-reservas" className="ayuda">
                Para los eventos con préstamo. Necesita fecha exacta y hora de inicio. Los clientes
                reservan hasta las 20:00 del día anterior.
              </small>
            </div>

            {errorForm && (
              <span className="error" role="alert">
                {errorForm}
              </span>
            )}

            <div className="modal-acciones">
              <button className="boton" type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button className="boton" type="button" disabled={guardando} onClick={() => setEditando(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando eventos...
        </p>
      ) : errorCarga ? (
        <div role="alert">
          <span className="error">{errorCarga}</span>
          <button className="boton" style={{ width: "auto", marginTop: 12 }} onClick={cargar}>
            Reintentar
          </button>
        </div>
      ) : eventos.length === 0 ? (
        <p>Todavía no hay eventos cargados.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="tabla">
            <caption className="solo-lectores">Lista de eventos</caption>
            <thead>
              <tr>
                {["Evento", "Fecha", "Horario", "Lugar", "Reservas", "Acciones"].map((t) => (
                  <th key={t} scope="col">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eventos.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    {ev.titulo}
                    <br />
                    <small>{ev.tipo}</small>
                  </td>
                  <td>{partesFecha(ev.fecha)?.larga ?? (ev.fecha_texto || "A confirmar")}</td>
                  <td>{ev.hora_texto || "—"}</td>
                  <td>{ev.lugar}</td>
                  <td>{ev.permite_reservas ? "Sí" : "No"}</td>
                  <td>
                    <div className="acciones-fila">
                      <button className="boton" style={{ width: "auto" }} disabled={ocupado === ev.id} onClick={() => abrir(ev)}>
                        Editar
                      </button>
                      <button className="boton" style={{ width: "auto" }} disabled={ocupado === ev.id} onClick={() => duplicar(ev)}>
                        Duplicar
                      </button>
                      <button className="boton" style={{ width: "auto", background: "#e63946" }} disabled={ocupado === ev.id} onClick={() => borrar(ev)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Eventos;
