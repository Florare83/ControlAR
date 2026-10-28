import { useEffect, useState } from "react";
import { obtenerReportePrestamos } from "../api/api.js";
import FiltroFechas from "../components/FiltroFechas.jsx";

// "2026-10-25" -> "25/10/2026" (sin pasar por Date para no correr el día por la zona horaria).
function fechaCorta(iso) {
  const [anio, mes, dia] = String(iso).split("-");
  return `${dia}/${mes}/${anio}`;
}

// Minutos -> "45 min" / "2 h 15 min".
function duracionTexto(minutos) {
  if (minutos === null || minutos === undefined) return "—";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

// Barra proporcional al valor máximo de la lista.
function Barra({ valor, maximo }) {
  const porcentaje = maximo > 0 ? Math.max(4, Math.round((valor / maximo) * 100)) : 0;

  return (
    <div className="reporte-barra" aria-hidden="true">
      <span style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

// Reportes del administrador: estadísticas simples de préstamos.
function Reportes() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError("");

    obtenerReportePrestamos({ desde, hasta })
      .then((respuesta) => {
        if (vigente) setDatos(respuesta);
      })
      .catch((e) => {
        if (vigente) setError(e.message || "No se pudo cargar el reporte.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [desde, hasta, intento]);

  const resumen = datos?.resumen;
  const juegos = datos?.juegos_mas_prestados ?? [];
  const dias = datos?.por_evento ?? [];
  const maxJuego = juegos.reduce((m, j) => Math.max(m, j.cantidad), 0);
  const maxDia = dias.reduce((m, d) => Math.max(m, d.cantidad), 0);

  return (
    <div className="reportes">
      <h1>Reportes</h1>
      <p className="subtitulo">
        Estadísticas de los préstamos de la ludoteca. Se calculan según la fecha
        de retiro del juego.
      </p>

      <div className="prestamos-filtros">
        <FiltroFechas
          desde={desde}
          hasta={hasta}
          onDesde={setDesde}
          onHasta={setHasta}
          etiqueta="Período"
        />
      </div>

      {cargando && !datos && (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando reportes...
        </p>
      )}

      {error && (
        <div role="alert">
          <span className="error">{error}</span>
          <button
            type="button"
            className="boton"
            style={{ width: "auto", marginTop: 12 }}
            onClick={() => setIntento((n) => n + 1)}
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && resumen && (
        <div aria-busy={cargando}>
          {resumen.total === 0 ? (
            <div className="tarjeta">
              <p>
                {desde || hasta
                  ? "No hay préstamos en ese período."
                  : "Todavía no hay préstamos registrados."}
              </p>
            </div>
          ) : (
            <>
              <dl className="prestamos-resumen">
                <div>
                  <dd>{resumen.total}</dd>
                  <dt>{resumen.total === 1 ? "Préstamo" : "Préstamos"}</dt>
                </div>
                <div>
                  <dd>{resumen.personas}</dd>
                  <dt>{resumen.personas === 1 ? "Persona" : "Personas distintas"}</dt>
                </div>
                <div>
                  <dd>{resumen.activos}</dd>
                  <dt>Activos ahora</dt>
                </div>
                <div className={resumen.sin_devolver > 0 ? "reporte-alerta" : undefined}>
                  <dd>{resumen.sin_devolver}</dd>
                  <dt>Sin devolver (días anteriores)</dt>
                </div>
                <div>
                  <dd>{resumen.devueltos}</dd>
                  <dt>{resumen.devueltos === 1 ? "Devuelto" : "Devueltos"}</dt>
                </div>
                <div>
                  <dd>{duracionTexto(resumen.duracion_promedio_minutos)}</dd>
                  <dt>Duración promedio</dt>
                </div>
              </dl>

              <section className="tarjeta tarjeta-columna reporte-seccion" aria-labelledby="rep-juegos">
                <h2 id="rep-juegos">Juegos más prestados</h2>
                <ol className="reporte-lista">
                  {juegos.map((j, i) => (
                    <li key={`${j.titulo}-${i}`}>
                      <span className="reporte-nombre">{j.titulo}</span>
                      <Barra valor={j.cantidad} maximo={maxJuego} />
                      <strong className="reporte-valor">
                        {j.cantidad} {j.cantidad === 1 ? "vez" : "veces"}
                      </strong>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="tarjeta tarjeta-columna reporte-seccion" aria-labelledby="rep-dias">
                <h2 id="rep-dias">Movimiento por día de evento</h2>
                <p className="ayuda">
                  Los préstamos se agrupan por el día en que se retiraron. Si ese
                  día hubo un evento cargado, se muestra su nombre.
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table className="tabla">
                    <caption className="solo-lectores">Préstamos por día</caption>
                    <thead>
                      <tr>
                        <th scope="col">Fecha</th>
                        <th scope="col">Evento</th>
                        <th scope="col">Préstamos</th>
                        <th scope="col">Personas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dias.map((d) => (
                        <tr key={d.fecha}>
                          <td>{fechaCorta(d.fecha)}</td>
                          <td>{d.evento || <span className="ayuda">Sin evento cargado</span>}</td>
                          <td>
                            <div className="reporte-celda-barra">
                              <strong>{d.cantidad}</strong>
                              <Barra valor={d.cantidad} maximo={maxDia} />
                            </div>
                          </td>
                          <td>{d.personas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Reportes;
