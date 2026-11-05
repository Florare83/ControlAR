import { useEffect, useMemo, useState } from "react";
import { obtenerOpcionesTablaDinamica, obtenerTablaDinamica } from "../../api/api.js";
import { dinero, descargarCsv, etiquetaDimension, numero } from "./utilidades.js";

// Valores iniciales y "vistas rápidas" de cada fuente de datos.
const INICIO = {
  prestamos: { filas: "juego", columnas: "", medida: "cantidad" },
  ventas: { filas: "juego", columnas: "", medida: "ingresos" },
  reservas: { filas: "evento", columnas: "estado", medida: "cantidad" },
};

const VISTAS = {
  prestamos: [
    { nombre: "Juegos por mes", filas: "juego", columnas: "mes", medida: "cantidad" },
    { nombre: "Día de la semana × sexo", filas: "dia_semana", columnas: "sexo", medida: "cantidad" },
    { nombre: "Categoría × mes", filas: "categoria", columnas: "mes", medida: "cantidad" },
    { nombre: "Duración por juego", filas: "juego", columnas: "", medida: "duracion_promedio" },
  ],
  ventas: [
    { nombre: "Ingresos por mes y forma de pago", filas: "mes", columnas: "forma_pago", medida: "ingresos" },
    { nombre: "Juegos por mes", filas: "juego", columnas: "mes", medida: "unidades" },
    { nombre: "Mejores clientes", filas: "cliente", columnas: "", medida: "ingresos" },
  ],
  reservas: [
    { nombre: "Evento × estado", filas: "evento", columnas: "estado", medida: "cantidad" },
    { nombre: "Juego × estado", filas: "juego", columnas: "estado", medida: "cantidad" },
    { nombre: "Quién reserva más", filas: "persona", columnas: "", medida: "cantidad" },
  ],
};

// Las opciones no cambian: se piden una sola vez por sesión.
let opcionesGuardadas = null;

function Opcion({ id, etiqueta, valor, onCambio, opciones, ninguna, deshabilitar }) {
  return (
    <label htmlFor={id}>
      {etiqueta}
      <select id={id} value={valor} onChange={(e) => onCambio(e.target.value)}>
        {ninguna && <option value="">{ninguna}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor} disabled={o.valor === deshabilitar}>
            {o.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

function TablaDinamica({ desde, hasta, cache, generacion }) {
  const [opciones, setOpciones] = useState(opcionesGuardadas);
  const [errorOpciones, setErrorOpciones] = useState("");
  const [fuente, setFuente] = useState("prestamos");
  const [config, setConfig] = useState(INICIO.prestamos);
  const [calor, setCalor] = useState(true);
  const [totales, setTotales] = useState(true);
  const [orden, setOrden] = useState(null); // { por: "total" | número de columna, dir: "desc" | "asc" }

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (opciones) return undefined;
    let vigente = true;
    obtenerOpcionesTablaDinamica()
      .then((o) => {
        opcionesGuardadas = o;
        if (vigente) setOpciones(o);
      })
      .catch((e) => {
        if (vigente) setErrorOpciones(e.message || "No se pudieron cargar las opciones.");
      });
    return () => {
      vigente = false;
    };
  }, [opciones]);

  const { filas, columnas, medida } = config;

  useEffect(() => {
    if (!opciones) return undefined;

    const clave = `tabla|${fuente}|${filas}|${columnas}|${medida}|${desde}|${hasta}|${generacion}`;
    if (intento === 0 && cache.has(clave)) {
      setDatos(cache.get(clave));
      setCargando(false);
      setError("");
      return undefined;
    }

    let vigente = true;
    setCargando(true);
    setError("");
    obtenerTablaDinamica({ fuente, filas, columnas, medida, desde, hasta })
      .then((respuesta) => {
        cache.set(clave, respuesta);
        if (vigente) setDatos(respuesta);
      })
      .catch((e) => {
        if (vigente) setError(e.message || "No se pudo armar la tabla.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opciones, fuente, filas, columnas, medida, desde, hasta, generacion, intento]);

  const definicion = opciones?.[fuente];
  const medidaInfo = definicion?.medidas.find((m) => m.valor === medida);
  const dimFilas = definicion?.dimensiones.find((d) => d.valor === filas);
  const dimColumnas = definicion?.dimensiones.find((d) => d.valor === columnas);

  const formato = (v) => {
    if (v === null || v === undefined) return "";
    return medidaInfo?.formato === "dinero" ? dinero(v) : numero(v);
  };

  function cambiarFuente(nueva) {
    setFuente(nueva);
    setConfig(INICIO[nueva]);
    setOrden(null);
    setDatos(null);
  }

  function cambiar(campo, valor) {
    setConfig((c) => ({ ...c, [campo]: valor }));
    setOrden(null);
  }

  function intercambiar() {
    if (!columnas) return;
    setConfig((c) => ({ ...c, filas: c.columnas, columnas: c.filas }));
    setOrden(null);
  }

  function aplicarVista(v) {
    setConfig({ filas: v.filas, columnas: v.columnas, medida: v.medida });
    setOrden(null);
  }

  // Clic en un encabezado: de mayor a menor, luego de menor a mayor, y después vuelve al orden natural.
  function ordenarPor(por) {
    setOrden((actual) => {
      if (!actual || actual.por !== por) return { por, dir: "desc" };
      if (actual.dir === "desc") return { por, dir: "asc" };
      return null;
    });
  }

  // Filas en el orden elegido (el servidor ya manda un orden razonable: por total o cronológico).
  const indices = useMemo(() => {
    if (!datos) return [];
    const lista = datos.filas.map((_, i) => i);
    if (!orden) return lista;
    const valor = (i) => (orden.por === "total" ? datos.totales_filas[i] : datos.celdas[i][orden.por]);
    const signo = orden.dir === "desc" ? -1 : 1;
    return lista.sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      return (va - vb) * signo;
    });
  }, [datos, orden]);

  // Para el mapa de calor.
  const rango = useMemo(() => {
    if (!datos || !columnas) return null;
    const valores = datos.celdas.flat().filter((v) => v !== null && v !== undefined);
    if (!valores.length) return null;
    return { min: Math.min(...valores), max: Math.max(...valores) };
  }, [datos, columnas]);

  function estiloCelda(v) {
    if (!calor || !rango || v === null || v === undefined) return undefined;
    const pct = rango.max === rango.min ? 40 : 8 + ((v - rango.min) / (rango.max - rango.min)) * 52;
    return { background: `color-mix(in srgb, var(--rep-1) ${Math.round(pct)}%, transparent)` };
  }

  // Sin columnas, el valor de cada fila se acompaña con una barra proporcional al máximo.
  const maxTotal = useMemo(() => {
    if (!datos) return 0;
    return datos.totales_filas.reduce((m, v) => Math.max(m, v ?? 0), 0);
  }, [datos]);

  function estiloBarra(v) {
    if (!maxTotal || v === null || v === undefined) return undefined;
    const pct = Math.max(2, Math.round((v / maxTotal) * 100));
    return {
      background: `linear-gradient(90deg, color-mix(in srgb, var(--rep-1) 26%, transparent) ${pct}%, transparent ${pct}%)`,
    };
  }

  function exportar() {
    if (!datos) return;
    const etiquetas = datos.columnas.map((c) => etiquetaDimension(c, columnas));
    const cabecera = [dimFilas?.nombre || "Fila", ...etiquetas, "Total"];
    const cuerpo = indices.map((i) => [
      etiquetaDimension(datos.filas[i], filas),
      ...datos.celdas[i],
      datos.totales_filas[i],
    ]);
    const pie = ["Total", ...datos.totales_columnas, datos.total];
    descargarCsv(`tabla-dinamica-${fuente}.csv`, [cabecera, ...cuerpo, pie]);
  }

  const flecha = (por) => (orden?.por === por ? (orden.dir === "desc" ? " ↓" : " ↑") : "");
  const hayColumnas = Boolean(columnas);

  if (errorOpciones) {
    return (
      <div role="alert" className="rep-tarjeta">
        <span className="error">{errorOpciones}</span>
      </div>
    );
  }

  if (!opciones) {
    return <div className="rep-esqueleto" style={{ height: 180 }} role="status" aria-label="Cargando" />;
  }

  return (
    <>
      <section className="rep-tarjeta" aria-labelledby="rep-pivot-config" style={{ marginBottom: 16 }}>
        <h2 id="rep-pivot-config">Armá tu tabla</h2>
        <p className="rep-ayuda">
          Elegí qué datos mirar, cómo agruparlos en filas y columnas y qué calcular. Respeta el período de arriba.
        </p>

        <div className="rep-config">
          <label htmlFor="pivot-fuente">
            Datos
            <select id="pivot-fuente" value={fuente} onChange={(e) => cambiarFuente(e.target.value)}>
              {Object.entries(opciones).map(([valor, info]) => (
                <option key={valor} value={valor}>
                  {info.titulo}
                </option>
              ))}
            </select>
          </label>

          <Opcion
            id="pivot-filas"
            etiqueta="Filas"
            valor={filas}
            onCambio={(v) => cambiar("filas", v)}
            opciones={definicion.dimensiones}
            deshabilitar={columnas}
          />

          <Opcion
            id="pivot-columnas"
            etiqueta="Columnas"
            valor={columnas}
            onCambio={(v) => cambiar("columnas", v)}
            opciones={definicion.dimensiones}
            ninguna="Ninguna (solo total)"
            deshabilitar={filas}
          />

          <Opcion
            id="pivot-medida"
            etiqueta="Valores"
            valor={medida}
            onCambio={(v) => cambiar("medida", v)}
            opciones={definicion.medidas}
          />

          <div className="rep-config-botones">
            <button type="button" className="rep-boton" onClick={intercambiar} disabled={!hayColumnas}>
              ⇄ Intercambiar
            </button>
            <button type="button" className="rep-boton" onClick={exportar} disabled={!datos || datos.filas.length === 0}>
              ⬇ Descargar CSV
            </button>
          </div>
        </div>

        <div className="rep-opciones">
          <label>
            <input type="checkbox" checked={totales} onChange={(e) => setTotales(e.target.checked)} /> Mostrar totales
          </label>
          <label>
            <input
              type="checkbox"
              checked={calor}
              disabled={!hayColumnas}
              onChange={(e) => setCalor(e.target.checked)}
            />{" "}
            Mapa de calor
          </label>
        </div>

        <div className="rep-vistas">
          <span>Vistas rápidas:</span>
          {VISTAS[fuente].map((v) => (
            <button
              key={v.nombre}
              type="button"
              className="rep-chip"
              aria-pressed={v.filas === filas && v.columnas === columnas && v.medida === medida}
              onClick={() => aplicarVista(v)}
            >
              {v.nombre}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div role="alert" className="rep-tarjeta" style={{ marginBottom: 16 }}>
          <span className="error">{error}</span>{" "}
          <button type="button" className="rep-boton" onClick={() => setIntento((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {!datos && cargando && <div className="rep-esqueleto" style={{ height: 220 }} role="status" aria-label="Cargando tabla" />}

      {datos && (
        <section className={`rep-tarjeta${cargando ? " rep-cargando" : ""}`} aria-busy={cargando} aria-labelledby="rep-pivot-titulo">
          <h2 id="rep-pivot-titulo">
            {medidaInfo?.nombre} por {dimFilas?.nombre.toLowerCase()}
            {hayColumnas && ` y ${dimColumnas?.nombre.toLowerCase()}`}
          </h2>

          {datos.filas.length === 0 ? (
            <p className="rep-vacio">No hay datos para armar esta tabla en el período elegido.</p>
          ) : (
            <>
              <div className="rep-pivot-caja">
                <table className="rep-pivot">
                  <caption className="solo-lectores">
                    {medidaInfo?.nombre} por {dimFilas?.nombre}
                    {hayColumnas ? ` y ${dimColumnas?.nombre}` : ""}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{dimFilas?.nombre}</th>
                      {datos.columnas.map((c, j) => (
                        <th key={c} scope="col">
                          <button type="button" onClick={() => ordenarPor(j)} title="Ordenar por esta columna">
                            {etiquetaDimension(c, columnas)}
                            {flecha(j)}
                          </button>
                        </th>
                      ))}
                      {(totales || !hayColumnas) && (
                        <th scope="col" className="total">
                          <button type="button" onClick={() => ordenarPor("total")} title="Ordenar por el total">
                            {hayColumnas ? "Total" : medidaInfo?.nombre}
                            {flecha("total")}
                          </button>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {indices.map((i) => (
                      <tr key={datos.filas[i]}>
                        <th scope="row" title={etiquetaDimension(datos.filas[i], filas)}>
                          {etiquetaDimension(datos.filas[i], filas)}
                        </th>
                        {datos.celdas[i].map((v, j) => (
                          <td
                            key={datos.columnas[j]}
                            className={v === null || v === undefined ? "vacia" : undefined}
                            style={estiloCelda(v)}
                          >
                            {v === null || v === undefined ? "·" : formato(v)}
                          </td>
                        ))}
                        {(totales || !hayColumnas) && (
                          <td className="total" style={hayColumnas ? undefined : estiloBarra(datos.totales_filas[i])}>
                            {datos.totales_filas[i] === null ? "—" : formato(datos.totales_filas[i])}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {totales && datos.filas.length > 1 && (
                    <tfoot>
                      <tr>
                        <th scope="row">Total</th>
                        {datos.totales_columnas.map((v, j) => (
                          <td key={datos.columnas[j]}>{v === null ? "—" : formato(v)}</td>
                        ))}
                        <td>{datos.total === null ? "—" : formato(datos.total)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <p className="rep-pivot-pie">
                {numero(datos.registros)} {datos.registros === 1 ? "registro" : "registros"} analizados
                {datos.truncado &&
                  ". Hay más filas o columnas de las que caben: se muestran las primeras (usá un período más corto o otro agrupamiento)"}
                .
                {medida === "personas" || medida === "pedidos"
                  ? " Los totales cuentan una sola vez a cada persona o pedido, por eso pueden ser menores que la suma de las celdas."
                  : ""}
              </p>
            </>
          )}
        </section>
      )}
    </>
  );
}

export default TablaDinamica;
