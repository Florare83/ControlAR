import { useEffect, useState } from "react";
import {
  listarJuegos,
  listarPrestamos,
  registrarPrestamo,
  buscarPersonaPorDni,
  cambiarJuegoPrestamo,
  devolverPrestamo,
  reabrirPrestamo,
} from "../api/api.js";
import { useToast } from "../context/ToastContext.jsx";
import Modal from "../components/Modal.jsx";
import FiltroFechas from "../components/FiltroFechas.jsx";
import ThOrdenable, { siguienteOrden } from "../components/ThOrdenable.jsx";
import {
  ENCABEZADO_CSV_PRESTAMOS,
  descargarCsv,
  diaArgentina,
  diasSinDevolver,
  fechaHoraArgentina,
  filaCsvPrestamo,
  textoDiasSinDevolver,
} from "../utils/prestamos.js";

// Una devolución se puede deshacer hasta 48 horas después (lo valida la API).
const VENTANA_DESHACER_MS = 48 * 60 * 60 * 1000;

function sePuedeDeshacer(prestamo) {
  if (prestamo.estado !== "cerrado" || !prestamo.fecha_cierre) return false;
  return Date.now() - new Date(prestamo.fecha_cierre).getTime() <= VENTANA_DESHACER_MS;
}

// Sin tildes ni mayúsculas, para que "carcasone" encuentre "Carcassonne" y "Peña" a "pena".
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const FILTROS_ESTADO = [
  { valor: "activo", texto: "Activos" },
  { valor: "atrasado", texto: "Sin devolver" },
  { valor: "cerrado", texto: "Cerrados" },
  { valor: "todos", texto: "Todos" },
];

const FORMULARIO_VACIO = { juego_id: "", dni: "", nombre: "", email: "", sexo: "Femenino", telefono: "" };

// Gestión de préstamos (operador y administrador). Se muestra dentro del PanelLayout.
// Reglas (las valida la API): una persona tiene un solo préstamo activo a la vez,
// y un juego solo puede estar en un préstamo activo.
function Prestamos() {
  const toast = useToast();
  const [juegos, setJuegos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [mensajeBusqueda, setMensajeBusqueda] = useState("");
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("activo"); // activo | cerrado | todos
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState(""); // fecha de retiro, AAAA-MM-DD
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState({ campo: "fecha", direccion: "desc" });
  const [nuevoJuego, setNuevoJuego] = useState({}); // { [id del préstamo]: id del juego elegido }
  const [ocupado, setOcupado] = useState(null); // id del préstamo que se está procesando

  async function cargar() {
    setErrorCarga("");
    try {
      const [listaJuegos, listaPrestamos] = await Promise.all([listarJuegos(), listarPrestamos()]);
      setJuegos(listaJuegos);
      setPrestamos(listaPrestamos);
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  // Solo se puede prestar (o cambiar por) un juego de la ludoteca que no esté ya en préstamo.
  const juegosLibres = juegos.filter((j) => j.se_presta && !j.en_prestamo);
  const hayJuegosDeLudoteca = juegos.some((j) => j.se_presta);

  const termino = normalizar(busqueda);
  const dniBuscado = busqueda.replace(/[.\s]/g, ""); // permite escribir 12.345.678
  const rangoInvalido = Boolean(desde && hasta && desde > hasta);

  // Búsqueda y fechas (sin el estado): sobre esto se cuentan los botones.
  const prestamosBuscados = prestamos.filter((p) => {
    if (desde || hasta) {
      const dia = diaArgentina(p.fecha_inicio);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
    }

    if (!termino) return true;

    const buscaDni = /^\d+$/.test(dniBuscado) ? dniBuscado : termino;

    return (
      String(p.dni ?? "").includes(buscaDni) ||
      normalizar(p.juego?.titulo ?? p.titulo_juego).includes(termino) ||
      normalizar(p.nombre).includes(termino)
    );
  });

  const cantidadPorEstado = {
    activo: prestamosBuscados.filter((p) => p.estado === "activo").length,
    atrasado: prestamosBuscados.filter((p) => diasSinDevolver(p) > 0).length,
    cerrado: prestamosBuscados.filter((p) => p.estado === "cerrado").length,
    todos: prestamosBuscados.length,
  };

  const prestamosVisibles = rangoInvalido
    ? []
    : prestamosBuscados
        .filter((p) => {
          if (filtroEstado === "todos") return true;
          if (filtroEstado === "atrasado") return diasSinDevolver(p) > 0;
          return p.estado === filtroEstado;
        })
        .sort((a, b) => {
          const sentido = orden.direccion === "asc" ? 1 : -1;

          if (orden.campo === "cliente" || orden.campo === "estado") {
            const porColumna =
              orden.campo === "cliente"
                ? normalizar(a.nombre).localeCompare(normalizar(b.nombre), "es")
                : a.estado.localeCompare(b.estado);
            if (porColumna !== 0) return porColumna * sentido;
            // Empate: el más reciente primero.
            return new Date(b.fecha_inicio) - new Date(a.fecha_inicio);
          }

          if (orden.campo === "juego") {
            const porJuego = normalizar(a.juego?.titulo).localeCompare(
              normalizar(b.juego?.titulo),
              "es"
            );
            if (porJuego !== 0) return porJuego * sentido;
            // Mismo juego: el más reciente primero.
            return new Date(b.fecha_inicio) - new Date(a.fecha_inicio);
          }

          const porFecha = new Date(a.fecha_inicio) - new Date(b.fecha_inicio);
          return (porFecha !== 0 ? porFecha : a.id - b.id) * sentido;
        });

  const etiquetaEstado =
    filtroEstado === "activo" ? "activos" : filtroEstado === "cerrado" ? "cerrados" : "registrados";

  function cambiar(campo, valor) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function buscarPersona() {
    const dni = form.dni.trim();
    setMensajeBusqueda("");
    if (!/^[0-9]{6,9}$/.test(dni)) return;
    setBuscandoPersona(true);
    try {
      const persona = await buscarPersonaPorDni(dni);
      if (persona.encontrado) {
        setForm((anterior) => ({
          ...anterior,
          nombre: persona.nombre || anterior.nombre,
          email: persona.email || anterior.email,
          sexo: persona.sexo || anterior.sexo,
          telefono: persona.telefono || anterior.telefono,
        }));
        setMensajeBusqueda("Encontramos datos previos para este DNI; podés corregirlos si hace falta.");
      } else {
        setMensajeBusqueda("No hay datos previos para este DNI. Completá nombre y apellido y los demás datos.");
      }
    } catch (err) {
      setMensajeBusqueda(`No se pudieron buscar los datos: ${err.message}`);
    } finally {
      setBuscandoPersona(false);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    setErrorForm("");
    setGuardando(true);
    try {
      await registrarPrestamo({
        juego_id: Number(form.juego_id),
        nombre: form.nombre.trim(),
        dni: form.dni.trim(),
        email: form.email.trim() || null,
        sexo: form.sexo,
        telefono: form.telefono.trim(),
      });
      setForm(FORMULARIO_VACIO);
      setMensajeBusqueda("");
      setFormAbierto(false);
      toast.exito("Préstamo registrado.");
      await cargar();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarJuego(prestamo) {
    const elegido = nuevoJuego[prestamo.id];
    if (!elegido) return;
    setOcupado(prestamo.id);
    try {
      const actualizado = await cambiarJuegoPrestamo(prestamo.id, Number(elegido));
      setNuevoJuego((anterior) => ({ ...anterior, [prestamo.id]: "" }));
      toast.exito(`Juego cambiado a "${actualizado.juego.titulo}".`);
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  }

  async function deshacerDevolucion(prestamo) {
    setOcupado(prestamo.id);
    try {
      await reabrirPrestamo(prestamo.id);
      toast.exito(`Devolución deshecha: "${prestamo.juego.titulo}" vuelve a estar prestado a ${prestamo.nombre}.`);
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  }

  async function devolver(prestamo) {
    if (
      !window.confirm(
        `¿Registrar la devolución de "${prestamo.juego.titulo}" de ${prestamo.nombre} (DNI ${prestamo.dni})?`
      )
    ) {
      return;
    }
    setOcupado(prestamo.id);
    try {
      await devolverPrestamo(prestamo.id);
      toast.exito("Devolución registrada. El juego quedó disponible.", {
        duracion: 10000,
        accion: {
          texto: "Deshacer",
          onClick: () => deshacerDevolucion(prestamo),
        },
      });
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      <h1>Gestión de préstamos</h1>
      <p className="subtitulo">Registrá quién se lleva un juego, cambialo o registrá su devolución.</p>

      <button
        type="button"
        className="boton"
        style={{ width: "auto", marginBottom: 28 }}
        onClick={() => {
          setErrorForm("");
          setFormAbierto(true);
        }}
      >
        Registrar préstamo
      </button>

      {formAbierto && (
        <Modal
          titulo="Registrar préstamo"
          ocupado={guardando}
          onCerrar={() => setFormAbierto(false)}
        >
        <form className="formulario" onSubmit={enviar} aria-busy={guardando}>
          <div className="campo">
            <label htmlFor="juego_id">Juego disponible</label>
            <select
              id="juego_id"
              value={form.juego_id}
              onChange={(e) => cambiar("juego_id", e.target.value)}
              required
            >
              <option value="">Seleccioná un juego</option>
              {juegosLibres.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.titulo}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="dni">DNI (solo números)</label>
            <input
              id="dni"
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
            {buscandoPersona && <small>Buscando datos por DNI...</small>}
            {mensajeBusqueda && <small role="status">{mensajeBusqueda}</small>}
          </div>
          <div className="campo">
            <label htmlFor="nombre">Nombre y apellido</label>
            <input
              id="nombre"
              value={form.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              minLength={2}
              maxLength={100}
              autoComplete="name"
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="email">E-mail (opcional)</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => cambiar("email", e.target.value)}
              maxLength={255}
              autoComplete="email"
            />
          </div>
          <div className="campo">
            <label htmlFor="sexo">Sexo</label>
            <select id="sexo" value={form.sexo} onChange={(e) => cambiar("sexo", e.target.value)} required>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
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

          <button className="boton" type="submit" disabled={guardando || juegosLibres.length === 0}>
            {guardando ? "Guardando..." : "Registrar préstamo"}
          </button>
          {!cargando && juegosLibres.length === 0 && (
            <p>
              {hayJuegosDeLudoteca
                ? "No hay juegos disponibles: todos están en préstamo."
                : "Todavía no hay juegos marcados como \"Disponible para préstamo\". Tildá esa opción al editar cada juego de la ludoteca."}
            </p>
          )}
        </form>
        </Modal>
      )}

      <div className="prestamos-cabecera">
        <h2>Préstamos</h2>
        <button
          type="button"
          className="boton boton-secundario"
          style={{ width: "auto" }}
          disabled={prestamosVisibles.length === 0}
          onClick={() =>
            descargarCsv("prestamos", [
              ENCABEZADO_CSV_PRESTAMOS,
              ...prestamosVisibles.map((p) =>
                filaCsvPrestamo({
                  retirado: p.fecha_inicio,
                  juego: p.juego?.titulo,
                  nombre: p.nombre,
                  dni: p.dni,
                  email: p.email,
                  telefono: p.telefono,
                  estado: p.estado,
                  cierre: p.fecha_cierre,
                  atraso: diasSinDevolver(p),
                })
              ),
            ])
          }
        >
          Descargar CSV
        </button>
      </div>

      <div className="prestamos-filtros">
        <div className="mensajes-filtros" role="group" aria-label="Filtrar por estado">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.valor}
              type="button"
              className={`filtro-boton ${filtroEstado === f.valor ? "activo" : ""}`}
              aria-pressed={filtroEstado === f.valor}
              onClick={() => setFiltroEstado(f.valor)}
            >
              {f.texto} ({cantidadPorEstado[f.valor]})
            </button>
          ))}
        </div>

        <div className="prestamos-busqueda">
          <label htmlFor="prestamos-buscar" className="solo-lectores">
            Buscar préstamos por DNI, juego o nombre
          </label>
          <input
            id="prestamos-buscar"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por DNI, juego o nombre..."
          />
        </div>

        <FiltroFechas
          desde={desde}
          hasta={hasta}
          onDesde={setDesde}
          onHasta={setHasta}
        />
      </div>

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando préstamos...
        </p>
      ) : errorCarga ? (
        <div role="alert">
          <span className="error">{errorCarga}</span>
          <button className="boton" style={{ width: "auto", marginTop: 12 }} onClick={cargar}>
            Reintentar
          </button>
        </div>
      ) : prestamosVisibles.length === 0 ? (
        <p>
          {rangoInvalido
            ? "La fecha «Desde» no puede ser posterior a «Hasta»."
            : `No hay préstamos ${etiquetaEstado}${
                termino ? ` que coincidan con "${busqueda.trim()}"` : ""
              }${desde || hasta ? " en ese rango de fechas" : ""}.`}
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="tabla">
            <caption className="solo-lectores">Lista de préstamos</caption>
            <thead>
              <tr>
                <ThOrdenable
                  etiqueta="Retirado"
                  campo="fecha"
                  orden={orden}
                  onOrdenar={(c) => setOrden((o) => siguienteOrden(o, c))}
                />
                <ThOrdenable
                  etiqueta="Juego"
                  campo="juego"
                  orden={orden}
                  onOrdenar={(c) => setOrden((o) => siguienteOrden(o, c))}
                />
                <ThOrdenable
                  etiqueta="Nombre y apellido"
                  campo="cliente"
                  orden={orden}
                  onOrdenar={(c) => setOrden((o) => siguienteOrden(o, c))}
                />
                {["DNI", "E-mail", "Teléfono", "Sexo"].map((t) => (
                  <th key={t} scope="col">
                    {t}
                  </th>
                ))}
                <ThOrdenable
                  etiqueta="Estado"
                  campo="estado"
                  orden={orden}
                  onOrdenar={(c) => setOrden((o) => siguienteOrden(o, c))}
                />
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {prestamosVisibles.map((p) => (
                <tr key={p.id} className={diasSinDevolver(p) > 0 ? "fila-atrasada" : undefined}>
                  <td>{fechaHoraArgentina(p.fecha_inicio)}</td>
                  <td>{p.juego.titulo}</td>
                  <td>{p.nombre}</td>
                  <td>{p.dni}</td>
                  <td>{p.email || "—"}</td>
                  <td>{p.telefono}</td>
                  <td>{p.sexo}</td>
                  <td>
                    {p.estado === "activo"
                      ? "Activo"
                      : `Cerrado (${new Date(p.fecha_cierre).toLocaleDateString("es-AR")})`}
                    {diasSinDevolver(p) > 0 && (
                      <span className="badge-atraso" title="Se retiró antes de hoy y sigue sin devolverse">
                        Sin devolver · {textoDiasSinDevolver(diasSinDevolver(p))}
                      </span>
                    )}
                  </td>
                  <td>
                    {p.estado === "activo" ? (
                      <div className="acciones-fila">
                        <select
                          aria-label={`Nuevo juego para ${p.nombre}`}
                          value={nuevoJuego[p.id] ?? ""}
                          onChange={(e) => setNuevoJuego((a) => ({ ...a, [p.id]: e.target.value }))}
                        >
                          <option value="">Cambiar por...</option>
                          {juegosLibres.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.titulo}
                            </option>
                          ))}
                        </select>
                        <button
                          className="boton"
                          style={{ width: "auto" }}
                          disabled={!nuevoJuego[p.id] || ocupado === p.id}
                          onClick={() => cambiarJuego(p)}
                        >
                          Cambiar
                        </button>
                        <button
                          className="boton"
                          style={{ width: "auto" }}
                          disabled={ocupado === p.id}
                          onClick={() => devolver(p)}
                        >
                          Devolver
                        </button>
                      </div>
                    ) : sePuedeDeshacer(p) ? (
                      <button
                        className="boton boton-secundario"
                        style={{ width: "auto" }}
                        disabled={ocupado === p.id}
                        title="Solo disponible hasta 48 horas después de la devolución"
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Deshacer la devolución de "${p.juego.titulo}"? Vuelve a figurar prestado a ${p.nombre}.`
                            )
                          ) {
                            deshacerDevolucion(p);
                          }
                        }}
                      >
                        Deshacer devolución
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
    </div>
  );
}

export default Prestamos;