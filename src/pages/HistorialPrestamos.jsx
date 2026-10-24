import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  historialPrestamosDePersona,
  listarHistorialPrestamos,
} from "../api/api.js";

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
          {fechaArgentina(prestamo.fecha_cierre)}
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
  const [estado, setEstado] = useState(""); // "" | "activo" | "cerrado"
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState("");

  // Espera un momento después de la última tecla para no consultar en cada letra.
  useEffect(() => {
    const espera = setTimeout(() => setBuscar(texto.trim()), 350);
    return () => clearTimeout(espera);
  }, [texto]);

  const cargar = useCallback(async (vigente) => {
    setError("");
    setCargando(true);
    try {
      const datos = await listarHistorialPrestamos({
        buscar,
        estado,
        limite: POR_PAGINA,
      });
      if (!vigente.activo) return;
      setItems(datos.items);
      setTotal(datos.total);
    } catch (e) {
      if (vigente.activo) setError(e.message);
    } finally {
      if (vigente.activo) setCargando(false);
    }
  }, [buscar, estado]);

  useEffect(() => {
    const vigente = { activo: true };
    cargar(vigente);
    return () => {
      vigente.activo = false;
    };
  }, [cargar]);

  async function verMas() {
    setCargandoMas(true);
    try {
      const datos = await listarHistorialPrestamos({
        buscar,
        estado,
        limite: POR_PAGINA,
        desplazamiento: items.length,
      });
      setItems((actuales) => [...actuales, ...datos.items]);
      setTotal(datos.total);
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
        Buscá por nombre, DNI, email o juego.
      </p>

      <div className="historial-herramientas">
        <div className="campo historial-buscador">
          <label htmlFor="historial-buscar">Buscar</label>
          <input
            id="historial-buscar"
            type="search"
            value={texto}
            maxLength={100}
            placeholder="Nombre, DNI, email o juego"
            autoComplete="off"
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <div className="mensajes-filtros" role="group" aria-label="Filtrar por estado">
          {[
            ["", "Todos"],
            ["activo", "En préstamo"],
            ["cerrado", "Devueltos"],
          ].map(([valor, etiqueta]) => (
            <button
              key={valor || "todos"}
              type="button"
              className={`filtro-boton ${estado === valor ? "activo" : ""}`}
              aria-pressed={estado === valor}
              onClick={() => setEstado(valor)}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

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
            {buscar || estado
              ? "No hay préstamos que coincidan con la búsqueda."
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
                  {["Retirado", "Juego", "Cliente", "DNI", "Estado", "Historial"].map(
                    (t) => (
                      <th key={t} scope="col">
                        {t}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>{fechaArgentina(p.fecha_inicio)}</td>
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
