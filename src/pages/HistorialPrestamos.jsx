import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  historialPrestamosDePersona,
  listarHistorialPrestamos,
} from "../api/api.js";
import FiltroFechas from "../components/FiltroFechas.jsx";
import ThOrdenable, { siguienteOrden } from "../components/ThOrdenable.jsx";
import {
  ENCABEZADO_CSV_PRESTAMOS,
  descargarCsv,
  diasSinDevolver,
  fechaHoraArgentina,
  filaCsvPrestamo,
  textoDiasSinDevolver,
} from "../utils/prestamos.js";

const POR_PAGINA = 20;

function fechaArgentina(fecha) {
  if (!fecha) return "—";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "—";
  return valor.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function EstadoPrestamo({ prestamo }) {
  const activo = prestamo.estado === "activo";
  return (
    <>
      <span className={`prestamo-estado ${activo ? "activo" : "devuelto"}`}>
        {activo ? "En préstamo" : "Devuelto"}
      </span>
      {!activo && (
        <small className="historial-fecha-cierre">
          {fechaHoraArgentina(prestamo.fecha_cierre)}
        </small>
      )}
      {diasSinDevolver(prestamo) > 0 && (
        <small className="badge-atraso" title="Se retiró antes de hoy y sigue sin devolverse">
          Sin devolver · {textoDiasSinDevolver(diasSinDevolver(prestamo))}
        </small>
      )}
    </>
  );
}

// Historial completo de préstamos de todos los clientes (solo administrador).
// Con ?dni=... o ?email=... muestra el historial de una sola persona.
function HistorialPrestamos() {
  const [params] = useSearchParams();
  const dni = (params.get("dni") || "").trim();
  const email = (params.get("email") || "").trim();

  if (dni || email) {
    return <HistorialPersona dni={dni} email={email} />;
  }
  return <HistorialGeneral />;
}

function HistorialGeneral() {
  const [texto, setTexto] = useState("");
  const [buscar, setBuscar] = useState(""); // texto ya "asentado" (con retardo al escribir)
  const [estado, setEstado] = useState(""); // "" | "activo" | "atrasado" | "cerrado"
  const [desde, setDesde] = useState(""); // fecha de retiro, AAAA-MM-DD
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState({ campo: "fecha", direccion: "desc" });
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  // Cantidades por estado para la búsqueda actual: { activos, cerrados, total }.
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState("");

  // Espera un momento después de la última tecla para no consultar en cada letra.
  useEffect(() => {
    const espera = setTimeout(() => setBuscar(texto.trim()), 350);
    return () => clearTimeout(espera);
  }, [texto]);

  // "Sin devolver" es un filtro de la API aparte: préstamos activos de días anteriores.
  const consultaApi = {
    buscar,
    estado: estado === "atrasado" ? "activo" : estado,
    atrasados: estado === "atrasado",
    desde,
    hasta,
    ordenar: orden.campo,
    direccion: orden.direccion,
  };

  const cargar = useCallback(async (vigente) => {
    setError("");
    setCargando(true);
    try {
      const datos = await listarHistorialPrestamos({
        buscar,
        estado: estado === "atrasado" ? "activo" : estado,
        atrasados: estado === "atrasado",
        desde,
        hasta,
        ordenar: orden.campo,
        direccion: orden.direccion,
        limite: POR_PAGINA,
      });
      if (!vigente.activo) return;
      setItems(datos.items);
      setTotal(datos.total);
      setResumen(datos.resumen ?? null);
    } catch (e) {
      if (vigente.activo) setError(e.message);
    } finally {
      if (vigente.activo) setCargando(false);
    }
  }, [buscar, estado, desde, hasta, orden]);

  useEffect(() => {
    const vigente = { activo: true };
    cargar(vigente);
    return () => {
      vigente.activo = false;
    };
  }, [cargar]);

  // Descarga TODO lo que coincide con los filtros (no solo la página en pantalla).
  async function exportar() {
    setExportando(true);
    setErrorExportar("");

    try {
      const todos = [];
      let desplazamiento = 0;
      let totalRemoto = Infinity;

      while (desplazamiento < totalRemoto) {
        const datos = await listarHistorialPrestamos({
          ...consultaApi,
          limite: 100,
          desplazamiento,
        });
        if (datos.items.length === 0) break;
        todos.push(...datos.items);
        totalRemoto = datos.total;
        desplazamiento += datos.items.length;
      }

      descargarCsv("historial-prestamos", [
        ENCABEZADO_CSV_PRESTAMOS,
        ...todos.map((p) =>
          filaCsvPrestamo({
            retirado: p.fecha_inicio,
            juego: p.titulo_juego,
            nombre: p.nombre,
            dni: p.dni,
            email: p.email,
            telefono: p.telefono,
            estado: p.estado,
            cierre: p.fecha_cierre,
            atraso: diasSinDevolver(p),
          })
        ),
      ]);
    } catch (e) {
      setErrorExportar(e.message || "No se pudo descargar el historial.");
    } finally {
      setExportando(false);
    }
  }

  async function verMas() {
    setCargandoMas(true);
    try {
      const datos = await listarHistorialPrestamos({
        ...consultaApi,
        limite: POR_PAGINA,
        desplazamiento: items.length,
      });
      setItems((actuales) => [...actuales, ...datos.items]);
      setTotal(datos.total);
      setResumen(datos.resumen ?? null);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoMas(false);
    }
  }

  return (
    <div>
      <h1>Historial de préstamos</h1>
      <p className="subtitulo">
        Todos los préstamos registrados, del más reciente al más antiguo.
        Buscá por DNI, juego, nombre o email.
      </p>

      <div className="historial-herramientas">
        <div className="campo historial-buscador">
          <label htmlFor="historial-buscar">Buscar</label>
          <input
            id="historial-buscar"
            type="search"
            value={texto}
            maxLength={100}
            placeholder="Buscar por DNI, juego, nombre o email..."
            autoComplete="off"
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <div className="mensajes-filtros" role="group" aria-label="Filtrar por estado">
          {[
            ["activo", "Activos", resumen?.activos],
            ["atrasado", "Sin devolver", resumen?.atrasados],
            ["cerrado", "Cerrados", resumen?.cerrados],
            ["", "Todos", resumen?.total],
          ].map(([valor, etiqueta, cantidad]) => (
            <button
              key={valor || "todos"}
              type="button"
              className={`filtro-boton ${estado === valor ? "activo" : ""}`}
              aria-pressed={estado === valor}
              onClick={() => setEstado(valor)}
            >
              {etiqueta}
              {cantidad !== undefined && ` (${cantidad})`}
            </button>
          ))}
        </div>

        <FiltroFechas
          desde={desde}
          hasta={hasta}
          onDesde={setDesde}
          onHasta={setHasta}
        />

        <button
          type="button"
          className="boton boton-secundario"
          style={{ width: "auto" }}
          disabled={exportando || total === 0}
          onClick={exportar}
        >
          {exportando ? "Preparando..." : "Descargar CSV"}
        </button>
      </div>

      {errorExportar && (
        <p className="error" role="alert">
          {errorExportar}
        </p>
      )}

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando historial...
        </p>
      ) : error ? (
        <div role="alert">
          <span className="error">{error}</span>
          <button
            className="boton"
            style={{ width: "auto", marginTop: 12 }}
            onClick={() => cargar({ activo: true })}
          >
            Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="tarjeta">
          <p>
            {buscar || estado || desde || hasta
              ? `No hay préstamos${
                  estado === "activo"
                    ? " activos"
                    : estado === "atrasado"
                      ? " sin devolver"
                      : estado === "cerrado"
                        ? " cerrados"
                        : ""
                }${buscar ? ` que coincidan con "${buscar}"` : ""}${
                  desde || hasta ? " en ese rango de fechas" : ""
                }.`
              : "Todavía no hay préstamos registrados."}
          </p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="tabla">
              <caption className="solo-lectores">Historial de préstamos</caption>
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
                    etiqueta="Cliente"
                    campo="cliente"
                    orden={orden}
                    onOrdenar={(c) => setOrden((o) => siguienteOrden(o, c))}
                  />
                  <th scope="col">DNI</th>
                  <ThOrdenable
                    etiqueta="Estado"
                    campo="estado"
                    orden={orden}
                    onOrdenar={(c) => setOrden((o) => siguienteOrden(o, c))}
                  />
                  <th scope="col">Historial</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className={diasSinDevolver(p) > 0 ? "fila-atrasada" : undefined}>
                    <td>{fechaHoraArgentina(p.fecha_inicio)}</td>
                    <td>{p.titulo_juego}</td>
                    <td>
                      {p.nombre}
                      {p.email && <small className="historial-email">{p.email}</small>}
                    </td>
                    <td>{p.dni}</td>
                    <td>
                      <EstadoPrestamo prestamo={p} />
                    </td>
                    <td>
                      <Link
                        className="usuario-enlace-historial"
                        to={`/panel/historial?dni=${encodeURIComponent(p.dni)}`}
                        aria-label={`Ver todos los préstamos de ${p.nombre}`}
                      >
                        Ver todos
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mensajes-pie">
            Mostrando {items.length} de {total}
          </p>

          {items.length < total && (
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

function HistorialPersona({ dni, email }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError("");
    setDatos(null);

    historialPrestamosDePersona({ dni, email })
      .then((respuesta) => {
        if (vigente) setDatos(respuesta);
      })
      .catch((e) => {
        if (vigente) setError(e.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [dni, email]);

  const persona = datos?.persona;
  const titulo = persona?.nombre || (dni ? `DNI ${dni}` : email);

  return (
    <div>
      <Link className="historial-volver" to="/panel/historial">
        ← Volver al historial
      </Link>

      <h1>{titulo}</h1>

      {cargando && (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando historial...
        </p>
      )}

      {!cargando && error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!cargando && !error && datos && (
        <>
          {persona && (
            <p className="subtitulo historial-persona-datos">
              DNI {persona.dni}
              {persona.email && <> · {persona.email}</>}
              {persona.telefono && <> · {persona.telefono}</>}
            </p>
          )}

          {datos.items.length === 0 ? (
            <div className="tarjeta">
              <p>
                {dni ? `No hay préstamos con el DNI ${dni}.` : `No hay préstamos registrados con el email ${email}.`}
              </p>
              {!dni && (
                <p className="ayuda">
                  Solo aparecen los préstamos que se registraron con ese email.
                  Si se cargaron sin email, buscalos por nombre o DNI en el historial general.
                </p>
              )}
            </div>
          ) : (
            <>
              <dl className="prestamos-resumen">
                <div>
                  <dd>{datos.resumen.activos}</dd>
                  <dt>En préstamo ahora</dt>
                </div>
                <div>
                  <dd>{datos.resumen.devueltos}</dd>
                  <dt>{datos.resumen.devueltos === 1 ? "Devuelto" : "Devueltos"}</dt>
                </div>
                <div>
                  <dd>{datos.resumen.total}</dd>
                  <dt>En total</dt>
                </div>
              </dl>

              <div style={{ overflowX: "auto" }}>
                <table className="tabla">
                  <caption className="solo-lectores">
                    Préstamos de {persona?.nombre || email}
                  </caption>
                  <thead>
                    <tr>
                      {["Juego", "Retirado", "Devuelto", "Estado"].map((t) => (
                        <th key={t} scope="col">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.items.map((p) => (
                      <tr key={p.id}>
                        <td>{p.titulo_juego}</td>
                        <td>{fechaArgentina(p.fecha_inicio)}</td>
                        <td>
                          {p.estado === "activo"
                            ? "Pendiente"
                            : fechaArgentina(p.fecha_cierre)}
                        </td>
                        <td>
                          <span
                            className={`prestamo-estado ${
                              p.estado === "activo" ? "activo" : "devuelto"
                            }`}
                          >
                            {p.estado === "activo" ? "En préstamo" : "Devuelto"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default HistorialPrestamos;
