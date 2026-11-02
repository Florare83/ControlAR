// Formatos y cálculos compartidos por los reportes.

const NUMERO = new Intl.NumberFormat("es-AR");
const DINERO = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const COMPACTO = new Intl.NumberFormat("es-AR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const numero = (n) => (n === null || n === undefined ? "—" : NUMERO.format(n));
export const dinero = (n) => (n === null || n === undefined ? "—" : DINERO.format(n));
export const compacto = (n) => COMPACTO.format(n);
export const porcentaje = (n) => (n === null || n === undefined ? "—" : `${n}%`);

// Minutos -> "45 min" / "2 h 15 min".
export function duracionTexto(minutos) {
  if (minutos === null || minutos === undefined) return "—";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

// "2026-10-25" -> "25/10/2026" (sin pasar por Date para no correr el día por la zona horaria).
export function fechaCorta(iso) {
  const [anio, mes, dia] = String(iso).split("-");
  return `${dia}/${mes}/${anio}`;
}

// "2026-10" -> "oct 2026"
export function mesCorto(clave) {
  const [anio, mes] = String(clave).split("-");
  return `${MESES_CORTOS[Number(mes) - 1] ?? mes} ${anio}`;
}

// Etiqueta de un punto del eje de tiempo: "25/10" (por día) o "oct 26" (por mes).
export function etiquetaEje(clave, granularidad) {
  const partes = String(clave).split("-");
  if (granularidad === "mes") return `${MESES_CORTOS[Number(partes[1]) - 1]} ${partes[0].slice(2)}`;
  return `${partes[2]}/${partes[1]}`;
}

// Etiqueta completa del mismo punto (para el detalle al pasar el mouse).
export function etiquetaLarga(clave, granularidad) {
  return granularidad === "mes" ? mesCorto(clave) : fechaCorta(clave);
}

// Cómo se muestra el nombre de una fila/columna de la tabla dinámica según su dimensión.
export function etiquetaDimension(valor, dimension) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (dimension === "mes") return mesCorto(valor);
  if (dimension === "fecha") return fechaCorta(valor);
  return String(valor);
}

// Variación porcentual contra el período anterior. null si no se puede comparar.
export function variacion(actual, anterior) {
  if (anterior === null || anterior === undefined || actual === null || actual === undefined) return null;
  if (anterior === 0) return actual === 0 ? { pct: 0, sentido: 0 } : { pct: null, sentido: 1 };
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  return { pct, sentido: Math.sign(pct) };
}

// ---------------------------------------------------------------- períodos rápidos

const dos = (n) => String(n).padStart(2, "0");
export const aIso = (fecha) => `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;

export const PERIODOS = [
  { id: "7d", nombre: "7 días" },
  { id: "30d", nombre: "30 días" },
  { id: "mes", nombre: "Este mes" },
  { id: "mes-pasado", nombre: "Mes pasado" },
  { id: "anio", nombre: "Este año" },
  { id: "todo", nombre: "Todo" },
];

// Fechas (AAAA-MM-DD) de un período rápido, contando desde hoy.
export function rangoDe(id, hoy = new Date()) {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const atras = (dias) => new Date(base.getFullYear(), base.getMonth(), base.getDate() - dias);

  switch (id) {
    case "7d":
      return { desde: aIso(atras(6)), hasta: aIso(base) };
    case "30d":
      return { desde: aIso(atras(29)), hasta: aIso(base) };
    case "mes":
      return { desde: aIso(new Date(base.getFullYear(), base.getMonth(), 1)), hasta: aIso(base) };
    case "mes-pasado":
      return {
        desde: aIso(new Date(base.getFullYear(), base.getMonth() - 1, 1)),
        hasta: aIso(new Date(base.getFullYear(), base.getMonth(), 0)),
      };
    case "anio":
      return { desde: aIso(new Date(base.getFullYear(), 0, 1)), hasta: aIso(base) };
    default:
      return { desde: "", hasta: "" };
  }
}

// Qué período rápido coincide con las fechas elegidas (o "personalizado").
export function periodoActivo(desde, hasta) {
  for (const { id } of PERIODOS) {
    const r = rangoDe(id);
    if (r.desde === desde && r.hasta === hasta) return id;
  }
  return "personalizado";
}

// ------------------------------------------------------------------------ CSV

// Arma un CSV que Excel abre bien (separador ; y BOM para las tildes).
export function descargarCsv(nombreArchivo, filas) {
  const celda = (v) => {
    const texto = v === null || v === undefined ? "" : String(v);
    return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const contenido = "\uFEFF" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
