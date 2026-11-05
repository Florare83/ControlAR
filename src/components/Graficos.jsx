// Gráficos livianos en SVG (sin librerías): barras, líneas, dona y ranking.
// Se dibujan al ancho real del contenedor y se ven bien en modo claro y oscuro
// (los colores salen de las variables --rep-1…--rep-6 definidas en reportes.css).
import { useEffect, useRef, useState } from "react";

const COLORES = ["var(--rep-1)", "var(--rep-2)", "var(--rep-3)", "var(--rep-4)", "var(--rep-5)", "var(--rep-6)"];
export const colorDe = (i) => COLORES[i % COLORES.length];

function useAncho(ref) {
  const [ancho, setAncho] = useState(520);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const medir = () => setAncho(Math.max(240, Math.floor(el.clientWidth)));
    medir();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref]);

  return ancho;
}

// Eje Y "redondo": máximo prolijo y 4 tramos. Para cantidades (enteras) los saltos son
// números enteros (1, 2, 5, 10, 20, 50…) para no mostrar "2,5 pedidos".
function escala(maximo, entero) {
  if (!(maximo > 0)) return entero ? { tope: 4, marcas: [0, 1, 2, 3, 4] } : { tope: 1, marcas: [0, 0.25, 0.5, 0.75, 1] };

  if (entero) {
    const crudo = Math.max(1, maximo / 4);
    const exp = 10 ** Math.floor(Math.log10(crudo));
    const salto = [1, 2, 5, 10].map((m) => m * exp).find((s) => s >= crudo) ?? 10 * exp;
    const tramos = Math.max(1, Math.ceil(maximo / salto));
    return { tope: tramos * salto, marcas: Array.from({ length: tramos + 1 }, (_, i) => i * salto) };
  }

  const exp = 10 ** Math.floor(Math.log10(maximo));
  const f = maximo / exp;
  const bonito = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  const tope = bonito * exp;
  return { tope, marcas: [0, 1, 2, 3, 4].map((i) => (tope * i) / 4) };
}

const ALTO_DEFECTO = 240;

// Qué etiquetas del eje X mostrar para que no se pisen.
function cadaCuantas(cantidad, anchoUtil, anchoEtiqueta = 46) {
  const caben = Math.max(1, Math.floor(anchoUtil / anchoEtiqueta));
  return Math.max(1, Math.ceil(cantidad / caben));
}

function Mensaje({ children }) {
  return <p className="rep-vacio">{children}</p>;
}

function Burbuja({ x, y, ancho, titulo, lineas }) {
  if (titulo === undefined) return null;
  const alineada = x > ancho / 2 ? "rep-burbuja-izq" : "rep-burbuja-der";
  return (
    <div className={`rep-burbuja ${alineada}`} style={{ left: x, top: y }} role="presentation">
      <strong>{titulo}</strong>
      {lineas.map((l) => (
        <span key={l.nombre}>
          {l.color && <i style={{ background: l.color }} aria-hidden="true" />}
          {l.nombre}: <b>{l.valor}</b>
        </span>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ barras

// datos: [{ etiqueta, titulo?, valor }]  — formato: valor -> texto
export function GraficoBarras({
  datos,
  formato = (n) => String(n),
  formatoEje,
  nombreValor = "Total",
  entero = true,
  alto = ALTO_DEFECTO,
  ariaLabel,
  color = "var(--rep-1)",
  vacio = "No hay datos para mostrar.",
}) {
  const caja = useRef(null);
  const ancho = useAncho(caja);
  const [activo, setActivo] = useState(null);

  if (!datos.length || datos.every((d) => !d.valor)) return <Mensaje>{vacio}</Mensaje>;

  const maximo = Math.max(...datos.map((d) => d.valor));
  const { tope, marcas } = escala(maximo, entero);
  const textoEje = formatoEje || formato;

  const izquierda = Math.max(...marcas.map((m) => textoEje(m).length)) * 6.5 + 14;
  const abajo = 26;
  const arriba = 10;
  const util = ancho - izquierda - 8;
  const altoUtil = alto - abajo - arriba;
  const banda = util / datos.length;
  const barra = Math.max(3, Math.min(banda * 0.7, 44));
  const salto = cadaCuantas(datos.length, util);
  const yDe = (v) => arriba + altoUtil - (v / tope) * altoUtil;

  function mover(e) {
    const caja2 = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - caja2.left - izquierda) / banda);
    setActivo(i >= 0 && i < datos.length ? i : null);
  }

  const d = activo !== null ? datos[activo] : null;

  return (
    <div className="rep-grafico" ref={caja}>
      <svg
        width={ancho}
        height={alto}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={mover}
        onMouseLeave={() => setActivo(null)}
      >
        {marcas.map((m) => (
          <g key={m}>
            <line x1={izquierda} x2={ancho - 8} y1={yDe(m)} y2={yDe(m)} className="rep-rejilla" />
            <text x={izquierda - 8} y={yDe(m) + 4} textAnchor="end" className="rep-eje">
              {textoEje(m)}
            </text>
          </g>
        ))}

        {datos.map((punto, i) => {
          const x = izquierda + banda * i + (banda - barra) / 2;
          const h = Math.max(punto.valor > 0 ? 2 : 0, altoUtil - (yDe(punto.valor) - arriba));
          return (
            <g key={`${punto.etiqueta}-${i}`}>
              <rect
                x={x}
                y={arriba + altoUtil - h}
                width={barra}
                height={h}
                rx={Math.min(4, barra / 2)}
                fill={color}
                opacity={activo === null || activo === i ? 1 : 0.45}
              />
              {i % salto === 0 && (
                <text x={izquierda + banda * i + banda / 2} y={alto - 8} textAnchor="middle" className="rep-eje">
                  {punto.etiqueta}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {d && (
        <Burbuja
          x={izquierda + banda * activo + banda / 2}
          y={Math.max(0, yDe(d.valor) - 8)}
          ancho={ancho}
          titulo={d.titulo || d.etiqueta}
          lineas={[{ nombre: nombreValor, valor: formato(d.valor), color }]}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------- líneas

// etiquetas: [texto]; series: [{ nombre, valores: [n], color? }]; títulos: texto largo por punto.
export function GraficoLinea({
  etiquetas,
  titulos,
  series,
  formato = (n) => String(n),
  formatoEje,
  entero = true,
  alto = ALTO_DEFECTO,
  ariaLabel,
  vacio = "No hay datos para mostrar.",
}) {
  const caja = useRef(null);
  const ancho = useAncho(caja);
  const [activo, setActivo] = useState(null);

  const hayDatos = series.some((s) => s.valores.some((v) => v > 0));
  if (!etiquetas.length || !hayDatos) return <Mensaje>{vacio}</Mensaje>;

  const maximo = Math.max(...series.flatMap((s) => s.valores));
  const { tope, marcas } = escala(maximo, entero);
  const textoEje = formatoEje || formato;

  const izquierda = Math.max(...marcas.map((m) => textoEje(m).length)) * 6.5 + 14;
  const abajo = 26;
  const arriba = 10;
  const util = ancho - izquierda - 14;
  const altoUtil = alto - abajo - arriba;
  const n = etiquetas.length;
  const xDe = (i) => izquierda + 6 + (n === 1 ? util / 2 : (util * i) / (n - 1));
  const yDe = (v) => arriba + altoUtil - (v / tope) * altoUtil;
  const salto = cadaCuantas(n, util);

  const trazo = (valores) => valores.map((v, i) => `${i === 0 ? "M" : "L"}${xDe(i).toFixed(1)},${yDe(v).toFixed(1)}`).join(" ");
  const area = (valores) =>
    `${trazo(valores)} L${xDe(n - 1).toFixed(1)},${yDe(0)} L${xDe(0).toFixed(1)},${yDe(0)} Z`;

  function mover(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - r.left - izquierda - 6) / (n === 1 ? 1 : util / (n - 1));
    const i = Math.round(rel);
    setActivo(i >= 0 && i < n ? i : null);
  }

  const conPuntos = n <= 31;

  return (
    <div className="rep-grafico" ref={caja}>
      <svg
        width={ancho}
        height={alto}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={mover}
        onMouseLeave={() => setActivo(null)}
      >
        {marcas.map((m) => (
          <g key={m}>
            <line x1={izquierda} x2={ancho - 8} y1={yDe(m)} y2={yDe(m)} className="rep-rejilla" />
            <text x={izquierda - 8} y={yDe(m) + 4} textAnchor="end" className="rep-eje">
              {textoEje(m)}
            </text>
          </g>
        ))}

        <path d={area(series[0].valores)} fill={series[0].color || colorDe(0)} opacity="0.12" />

        {series.map((s, k) => (
          <g key={s.nombre}>
            <path
              d={trazo(s.valores)}
              fill="none"
              stroke={s.color || colorDe(k)}
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={k > 0 ? "5 4" : undefined}
            />
            {conPuntos &&
              s.valores.map((v, i) => (
                <circle key={i} cx={xDe(i)} cy={yDe(v)} r={activo === i ? 4.5 : 2.5} fill={s.color || colorDe(k)} />
              ))}
          </g>
        ))}

        {etiquetas.map(
          (e, i) =>
            i % salto === 0 && (
              <text key={`${e}-${i}`} x={xDe(i)} y={alto - 8} textAnchor="middle" className="rep-eje">
                {e}
              </text>
            )
        )}

        {activo !== null && (
          <line x1={xDe(activo)} x2={xDe(activo)} y1={arriba} y2={arriba + altoUtil} className="rep-guia" />
        )}
      </svg>

      {activo !== null && (
        <Burbuja
          x={xDe(activo)}
          y={arriba}
          ancho={ancho}
          titulo={titulos ? titulos[activo] : etiquetas[activo]}
          lineas={series.map((s, k) => ({
            nombre: s.nombre,
            valor: formato(s.valores[activo]),
            color: s.color || colorDe(k),
          }))}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------- dona

// datos: [{ nombre, valor }]
export function GraficoDona({
  datos,
  formato = (n) => String(n),
  formatoCentro,
  centro = "Total",
  ariaLabel,
  vacio = "No hay datos para mostrar.",
}) {
  const [activo, setActivo] = useState(null);
  const lista = datos.filter((d) => d.valor > 0);
  const total = lista.reduce((suma, d) => suma + d.valor, 0);

  if (total === 0) return <Mensaje>{vacio}</Mensaje>;

  const tam = 168;
  const radio = 64;
  const grosor = 24;
  const c = tam / 2;
  const perimetro = 2 * Math.PI * radio;

  let acumulado = 0;
  const arcos = lista.map((d, i) => {
    const largo = (d.valor / total) * perimetro;
    const arco = { ...d, i, largo, desfase: -acumulado };
    acumulado += largo;
    return arco;
  });

  const mostrado = activo !== null ? lista[activo] : null;
  const textoCentro = (formatoCentro || formato)(mostrado ? mostrado.valor : total);
  // Los importes largos se achican para que entren en el hueco de la dona.
  const tamanoCentro = textoCentro.length > 8 ? 14 : textoCentro.length > 6 ? 17 : 22;

  return (
    <div className="rep-dona">
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} role="img" aria-label={ariaLabel}>
        <circle cx={c} cy={c} r={radio} fill="none" className="rep-dona-fondo" strokeWidth={grosor} />
        <g transform={`rotate(-90 ${c} ${c})`}>
          {arcos.map((a) => (
            <circle
              key={a.nombre}
              cx={c}
              cy={c}
              r={radio}
              fill="none"
              stroke={colorDe(a.i)}
              strokeWidth={activo === a.i ? grosor + 4 : grosor}
              strokeDasharray={`${Math.max(0, a.largo - (arcos.length > 1 ? 1.5 : 0))} ${perimetro}`}
              strokeDashoffset={a.desfase}
              opacity={activo === null || activo === a.i ? 1 : 0.4}
              onMouseEnter={() => setActivo(a.i)}
              onMouseLeave={() => setActivo(null)}
            />
          ))}
        </g>
        <text x={c} y={c - 2} textAnchor="middle" className="rep-dona-numero" style={{ fontSize: tamanoCentro }}>
          {textoCentro}
        </text>
        <text x={c} y={c + 16} textAnchor="middle" className="rep-eje">
          {mostrado ? `${Math.round((mostrado.valor / total) * 100)}%` : centro}
        </text>
      </svg>

      <ul className="rep-leyenda">
        {lista.map((d, i) => (
          <li
            key={d.nombre}
            className={activo === i ? "activa" : undefined}
            onMouseEnter={() => setActivo(i)}
            onMouseLeave={() => setActivo(null)}
          >
            <i style={{ background: colorDe(i) }} aria-hidden="true" />
            <span>{d.nombre}</span>
            <b>{formato(d.valor)}</b>
            <small>{Math.round((d.valor / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------------- ranking

// datos: [{ nombre, valor, detalle? }] — barras horizontales ordenadas como vienen.
export function Ranking({ datos, formato = (n) => String(n), color = "var(--rep-1)", vacio = "No hay datos para mostrar." }) {
  if (!datos.length) return <Mensaje>{vacio}</Mensaje>;
  const maximo = Math.max(...datos.map((d) => d.valor), 0);

  return (
    <ol className="rep-ranking">
      {datos.map((d, i) => (
        <li key={`${d.nombre}-${i}`}>
          <span className="rep-ranking-posicion" aria-hidden="true">
            {i + 1}
          </span>
          <div className="rep-ranking-cuerpo">
            <div className="rep-ranking-linea">
              <span className="rep-ranking-nombre">{d.nombre}</span>
              <strong>{formato(d.valor)}</strong>
            </div>
            <div className="rep-ranking-barra" aria-hidden="true">
              <span style={{ width: `${maximo > 0 ? Math.max(3, (d.valor / maximo) * 100) : 0}%`, background: color }} />
            </div>
            {d.detalle && <small>{d.detalle}</small>}
          </div>
        </li>
      ))}
    </ol>
  );
}
