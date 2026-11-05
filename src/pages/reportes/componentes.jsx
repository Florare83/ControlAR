import { useEffect, useState } from "react";
import { variacion } from "./utilidades.js";

// Carga un reporte, lo guarda en `cache` (para que volver a una pestaña o período ya visto
// sea instantáneo) y expone el estado de carga / error.
export function useReporte(clave, cargar, cache) {
  const [estado, setEstado] = useState(() => ({
    datos: cache.get(clave) ?? null,
    cargando: !cache.has(clave),
    error: "",
  }));
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;

    if (intento === 0 && cache.has(clave)) {
      setEstado({ datos: cache.get(clave), cargando: false, error: "" });
      return undefined;
    }

    setEstado((anterior) => ({ ...anterior, cargando: true, error: "" }));
    cargar()
      .then((datos) => {
        cache.set(clave, datos);
        if (vigente) setEstado({ datos, cargando: false, error: "" });
      })
      .catch((e) => {
        if (vigente) {
          setEstado((anterior) => ({
            ...anterior,
            cargando: false,
            error: e.message || "No se pudo cargar el reporte.",
          }));
        }
      });

    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, intento]);

  return { ...estado, reintentar: () => setIntento((n) => n + 1) };
}

export function Esqueleto() {
  return (
    <div role="status" aria-label="Cargando reporte">
      <div className="rep-kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rep-esqueleto" style={{ height: 84 }} />
        ))}
      </div>
      <div className="rep-esqueleto" style={{ height: 260 }} />
    </div>
  );
}

// Muestra el esqueleto la primera vez, el error con "Reintentar", y atenúa el contenido
// anterior mientras llegan los datos nuevos (así la página no salta).
export function Carga({ estado, children }) {
  const { datos, cargando, error, reintentar } = estado;

  if (!datos && cargando) return <Esqueleto />;

  if (!datos && error) {
    return (
      <div role="alert" className="rep-tarjeta">
        <span className="error">{error}</span>
        <div>
          <button type="button" className="rep-boton" style={{ marginTop: 12 }} onClick={reintentar}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!datos) return null;

  return (
    <div className={cargando ? "rep-cargando" : undefined} aria-busy={cargando}>
      {error && (
        <p role="alert" className="error" style={{ marginBottom: 12 }}>
          {error}{" "}
          <button type="button" className="rep-boton" onClick={reintentar}>
            Reintentar
          </button>
        </p>
      )}
      {children(datos)}
    </div>
  );
}

// Indicador con comparación contra el período anterior.
//   menosEsMejor: para cosas como "vencidas", donde bajar es bueno.
//   neutro: cuando subir o bajar no es ni bueno ni malo (la flecha se muestra en gris).
export function Kpi({ etiqueta, valor, nota, actual, anterior, menosEsMejor = false, neutro = false, alerta = false }) {
  const v = variacion(actual, anterior);
  let delta = null;

  if (v) {
    const sentido = v.sentido === 0 ? "igual" : v.sentido > 0 ? "sube" : "baja";
    const bueno = menosEsMejor ? v.sentido < 0 : v.sentido > 0;
    const clase = sentido === "igual" || neutro ? "igual" : `${sentido}-${bueno ? "bien" : "mal"}`;
    const flecha = sentido === "igual" ? "＝" : sentido === "sube" ? "▲" : "▼";
    const texto = v.pct === null ? "nuevo" : sentido === "igual" ? "igual" : `${Math.abs(v.pct)}%`;
    delta = (
      <span className={`rep-delta ${clase}`}>
        {flecha} {texto} <span>vs. anterior</span>
      </span>
    );
  }

  return (
    <div className={`rep-kpi${alerta ? " alerta" : ""}`}>
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
      {delta}
      {nota && <small>{nota}</small>}
    </div>
  );
}

export function Tarjeta({ titulo, ayuda, ancha = false, children, id }) {
  return (
    <section className={`rep-tarjeta${ancha ? " ancha" : ""}`} aria-labelledby={id}>
      <h2 id={id}>{titulo}</h2>
      {ayuda && <p className="rep-ayuda">{ayuda}</p>}
      {children}
    </section>
  );
}

export function LeyendaLinea({ items }) {
  return (
    <ul className="rep-leyenda-linea">
      {items.map((i) => (
        <li key={i.nombre}>
          <i style={{ background: i.color }} aria-hidden="true" />
          {i.nombre}
        </li>
      ))}
    </ul>
  );
}

export function MiniBarra({ valor, maximo }) {
  const pct = maximo > 0 ? Math.max(4, Math.round((valor / maximo) * 100)) : 0;
  return (
    <div className="rep-minibarra" aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
