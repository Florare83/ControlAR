import { useEffect, useState } from "react";
import FiltroSelect from "../components/FiltroSelect.jsx";
import {
  buscarPersonaPorDni,
  entregarReserva,
  listarReservasAdmin,
} from "../api/api.js";
import { partesFecha } from "../data/eventos.js";
import { useToast } from "../context/ToastContext.jsx";

const ETIQUETA_ESTADO = {
  activa: "Reservada",
  entregada: "Entregada",
  cancelada: "Cancelada",
  vencida: "Vencida",
};

const ENTREGA_VACIA = { dni: "", nombre: "", sexo: "Femenino", telefono: "" };

function horaArgentina(fecha) {
  if (!fecha) return "";

  return new Date(fecha).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Salta",
  });
}

// Reservas del próximo evento. Al entregar un juego se pide el DNI y el teléfono
// (la cuenta del cliente no los tiene) y se crea el préstamo.
function Reservas() {
  const toast = useToast();
  const [datos, setDatos] = useState({ evento: null, reservas: [] });
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activa");
  const [busqueda, setBusqueda] = useState("");

  const [entregando, setEntregando] = useState(null); // reserva en la que se está cargando la entrega
  const [form, setForm] = useState(ENTREGA_VACIA);
  const [mensajeBusqueda, setMensajeBusqueda] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setErrorCarga("");

    try {
      setDatos(await listarReservasAdmin());
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirEntrega(reserva) {
    setEntregando(reserva);
    setForm({ ...ENTREGA_VACIA, nombre: reserva.usuario.nombre });
    setMensajeBusqueda("");
    setErrorForm("");
  }

  function cambiar(campo, valor) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function buscarPersona() {
    const dni = form.dni.trim();
    setMensajeBusqueda("");

    if (!/^[0-9]{6,9}$/.test(dni)) return;

    try {
      const persona = await buscarPersonaPorDni(dni);

      if (persona.encontrado) {
        setForm((anterior) => ({
          ...anterior,
          nombre: persona.nombre || anterior.nombre,
          sexo: persona.sexo || anterior.sexo,
          telefono: persona.telefono || anterior.telefono,
        }));
        setMensajeBusqueda("Encontramos datos previos para este DNI; podés corregirlos.");
      }
    } catch (e) {
      setMensajeBusqueda(`No se pudieron buscar los datos: ${e.message}`);
    }
  }

  async function confirmarEntrega(e) {
    e.preventDefault();
    setErrorForm("");
    setGuardando(true);

    try {
      await entregarReserva(entregando.id, {
        dni: form.dni.trim(),
        nombre: form.nombre.trim() || null,
        sexo: form.sexo,
        telefono: form.telefono.trim(),
      });
      toast.exito(`Entregaste "${entregando.juego.titulo}". Quedó registrado el préstamo.`);
      setEntregando(null);
      await cargar();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const { evento, reservas } = datos;
  const texto = busqueda.trim().toLowerCase();
  const visibles = reservas.filter(
    (r) =>
      (filtroEstado === "todas" || r.estado === filtroEstado) &&
      (!texto ||
        [r.juego.titulo, r.usuario.nombre, r.usuario.email]
          .join(" ")
          .toLowerCase()
          .includes(texto))
  );
  const cantidad = (estado) => reservas.filter((r) => r.estado === estado).length;
  const hayFiltros = filtroEstado !== "activa" || texto !== "";
  const partes = evento ? partesFecha(evento.fecha) : null;

  return (
    <div>
      <h1>Reservas</h1>

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando reservas...
        </p>
      ) : errorCarga ? (
        <div role="alert">
          <span className="error">{errorCarga}</span>
          <button className="boton" style={{ width: "auto", marginTop: 12 }} onClick={cargar}>
            Reintentar
          </button>
        </div>
      ) : !evento ? (
        <p>
          No hay un evento próximo con reservas. Cargalo en la sección Eventos
          (con fecha, hora de inicio y la opción "Permite reservar juegos").
        </p>
      ) : (
        <>
          <p className="subtitulo">
            {evento.titulo}
            {partes ? ` · ${partes.larga}` : ""}
            {evento.hora_texto ? ` · ${evento.hora_texto}` : ""}. Las reservas que no se retiran
            vencen a las {horaArgentina(datos.espera_hasta)} h.
          </p>

          <div className="barra-filtros">
            <div className="filtro-busqueda">
              <label htmlFor="reservas-buscar">Buscar</label>
              <input
                id="reservas-buscar"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Juego, cliente o correo..."
              />
            </div>
            <FiltroSelect
              id="reservas-estado"
              etiqueta="Estado"
              valor={filtroEstado}
              onCambio={setFiltroEstado}
              opciones={[
                { valor: "activa", texto: `Reservadas (${cantidad("activa")})` },
                { valor: "entregada", texto: `Entregadas (${cantidad("entregada")})` },
                { valor: "cancelada", texto: `Canceladas (${cantidad("cancelada")})` },
                { valor: "vencida", texto: `Vencidas (${cantidad("vencida")})` },
                { valor: "todas", texto: `Todas (${reservas.length})` },
              ]}
            />
            {hayFiltros && (
              <button
                type="button"
                className="boton boton-secundario boton-chico"
                onClick={() => {
                  setFiltroEstado("activa");
                  setBusqueda("");
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {visibles.length === 0 ? (
            <p>
              {hayFiltros
                ? "No hay reservas que coincidan con los filtros."
                : "No hay reservas activas para este evento."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="tabla">
                <caption className="solo-lectores">Reservas del evento</caption>
                <thead>
                  <tr>
                    {["Juego", "Cliente", "E-mail", "Estado", "Acciones"].map((t) => (
                      <th key={t} scope="col">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((r) => (
                    <tr key={r.id}>
                      <td>{r.juego.titulo}</td>
                      <td>{r.usuario.nombre}</td>
                      <td>{r.usuario.email}</td>
                      <td>{ETIQUETA_ESTADO[r.estado] ?? r.estado}</td>
                      <td>
                        {r.estado === "activa" ? (
                          <button
                            className="boton"
                            style={{ width: "auto" }}
                            onClick={() => abrirEntrega(r)}
                          >
                            Entregar
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {entregando && (
            <section
              className="tarjeta tarjeta-columna"
              style={{ marginTop: 24 }}
              aria-labelledby="titulo-entrega"
            >
              <h2 id="titulo-entrega">Entregar "{entregando.juego.titulo}"</h2>
              <form className="formulario" onSubmit={confirmarEntrega} aria-busy={guardando}>
                <div className="campo">
                  <label htmlFor="entrega-dni">DNI (solo números)</label>
                  <input
                    id="entrega-dni"
                    value={form.dni}
                    onChange={(e) => cambiar("dni", e.target.value.replace(/\D/g, "").slice(0, 9))}
                    onBlur={buscarPersona}
                    inputMode="numeric"
                    pattern="[0-9]{6,9}"
                    title="Entre 6 y 9 números, sin puntos"
                    maxLength={9}
                    autoComplete="off"
                    required
                  />
                  {mensajeBusqueda && <small role="status">{mensajeBusqueda}</small>}
                </div>
                <div className="campo">
                  <label htmlFor="entrega-nombre">Nombre y apellido</label>
                  <input
                    id="entrega-nombre"
                    value={form.nombre}
                    onChange={(e) => cambiar("nombre", e.target.value)}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="campo">
                  <label htmlFor="entrega-sexo">Sexo</label>
                  <select id="entrega-sexo" value={form.sexo} onChange={(e) => cambiar("sexo", e.target.value)} required>
                    <option value="Femenino">F</option>
                    <option value="Masculino">M</option>
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor="entrega-telefono">Teléfono</label>
                  <input
                    id="entrega-telefono"
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => cambiar("telefono", e.target.value)}
                    maxLength={30}
                    autoComplete="off"
                    required
                  />
                </div>

                {errorForm && (
                  <span className="error" role="alert">
                    {errorForm}
                  </span>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="boton" type="submit" disabled={guardando}>
                    {guardando ? "Guardando..." : "Confirmar entrega"}
                  </button>
                  <button className="boton" type="button" disabled={guardando} onClick={() => setEntregando(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default Reservas;
