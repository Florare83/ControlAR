import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Esqueleto } from "./reportes/componentes.jsx";
import { PERIODOS, fechaCorta, periodoActivo, rangoDe } from "./reportes/utilidades.js";
import "./reportes/reportes.css";

// Cada pestaña se descarga recién cuando se abre.
const PanelPrestamos = lazy(() => import("./reportes/PanelPrestamos.jsx"));
const PanelVentas = lazy(() => import("./reportes/PanelVentas.jsx"));
const PanelReservas = lazy(() => import("./reportes/PanelReservas.jsx"));
const TablaDinamica = lazy(() => import("./reportes/TablaDinamica.jsx"));

const PESTANAS = [
  { id: "prestamos", nombre: "Préstamos", Panel: PanelPrestamos },
  { id: "ventas", nombre: "Ventas", Panel: PanelVentas },
  { id: "reservas", nombre: "Reservas", Panel: PanelReservas },
  { id: "tabla", nombre: "Tabla dinámica", Panel: TablaDinamica },
];

const PERIODO_INICIAL = "30d";

// Reportes del administrador: préstamos, ventas y reservas con gráficos, comparación con el
// período anterior y una tabla dinámica. El estado (pestaña y período) vive en la dirección,
// así se puede recargar o compartir el enlace sin perder lo que se estaba mirando.
function Reportes() {
  const [parametros, setParametros] = useSearchParams();

  const pestana = PESTANAS.find((p) => p.id === parametros.get("tab")) ?? PESTANAS[0];

  // Sin fechas en la dirección arranca en los últimos 30 días (con comparación).
  const { desde, hasta } = useMemo(() => {
    if (parametros.has("desde") || parametros.has("hasta")) {
      return { desde: parametros.get("desde") ?? "", hasta: parametros.get("hasta") ?? "" };
    }
    return rangoDe(PERIODO_INICIAL);
  }, [parametros]);

  // Reportes ya pedidos: volver a una pestaña o período visto es instantáneo.
  const cache = useRef(new Map());
  const [generacion, setGeneracion] = useState(0);

  function actualizarUrl(cambios) {
    const siguiente = new URLSearchParams(parametros);
    Object.entries(cambios).forEach(([clave, valor]) => siguiente.set(clave, valor));
    setParametros(siguiente, { replace: true });
  }

  function elegirPeriodo(id) {
    const r = rangoDe(id);
    actualizarUrl({ desde: r.desde, hasta: r.hasta });
  }

  function teclasPestanas(e) {
    const i = PESTANAS.findIndex((p) => p.id === pestana.id);
    let siguiente = null;
    if (e.key === "ArrowRight") siguiente = PESTANAS[(i + 1) % PESTANAS.length];
    if (e.key === "ArrowLeft") siguiente = PESTANAS[(i - 1 + PESTANAS.length) % PESTANAS.length];
    if (!siguiente) return;
    e.preventDefault();
    actualizarUrl({ tab: siguiente.id });
    document.getElementById(`tab-${siguiente.id}`)?.focus();
  }

  const activo = periodoActivo(desde, hasta);
  const Panel = pestana.Panel;
  const conComparacion = Boolean(desde && hasta) && pestana.id !== "tabla";

  return (
    <div className="rep">
      <div className="rep-cabecera">
        <div>
          <h1>Reportes</h1>
          <p className="subtitulo">
            Cómo van los préstamos, las ventas y las reservas del club. Elegí un período y, para cruzar los datos a tu
            manera, usá la tabla dinámica.
          </p>
        </div>
        <button
          type="button"
          className="rep-actualizar"
          onClick={() => setGeneracion((n) => n + 1)}
          title="Volver a pedir los datos al servidor"
        >
          ↻ Actualizar
        </button>
      </div>

      <div className="rep-controles">
        <div className="rep-tabs" role="tablist" aria-label="Tipo de reporte" onKeyDown={teclasPestanas}>
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              id={`tab-${p.id}`}
              type="button"
              role="tab"
              className="rep-tab"
              aria-selected={p.id === pestana.id}
              aria-controls="rep-panel"
              tabIndex={p.id === pestana.id ? 0 : -1}
              onClick={() => actualizarUrl({ tab: p.id })}
            >
              {p.nombre}
            </button>
          ))}
        </div>

        <div className="rep-periodo">
          <div className="rep-chips" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="rep-chip"
                aria-pressed={activo === p.id}
                onClick={() => elegirPeriodo(p.id)}
              >
                {p.nombre}
              </button>
            ))}
          </div>

          <div className="rep-fechas">
            <label>
              Desde
              <input
                type="date"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => actualizarUrl({ desde: e.target.value, hasta })}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => actualizarUrl({ desde, hasta: e.target.value })}
              />
            </label>
          </div>
        </div>

        {conComparacion ? (
          <p className="rep-comparacion">
            Las flechas comparan con el período anterior de la misma duración (las fechas inmediatamente previas).
          </p>
        ) : (
          pestana.id !== "tabla" && (
            <p className="rep-comparacion">
              {desde || hasta
                ? `Mostrando ${desde ? `desde el ${fechaCorta(desde)}` : ""}${desde && hasta ? " " : ""}${hasta ? `hasta el ${fechaCorta(hasta)}` : ""}. Poné las dos fechas para ver la comparación con el período anterior.`
                : "Mostrando todo el historial. Elegí un período para ver la comparación con el anterior."}
            </p>
          )
        )}
      </div>

      <div id="rep-panel" role="tabpanel" aria-labelledby={`tab-${pestana.id}`}>
        <Suspense fallback={<Esqueleto />}>
          <Panel desde={desde} hasta={hasta} cache={cache.current} generacion={generacion} />
        </Suspense>
      </div>
    </div>
  );
}

export default Reportes;
