// Utilidades compartidas por las pantallas de préstamos y reportes.

const ZONA = "America/Argentina/Salta";

// Día (AAAA-MM-DD) en horario argentino.
export function diaArgentina(fecha) {
  return new Date(fecha).toLocaleDateString("en-CA", { timeZone: ZONA });
}

export function fechaHoraArgentina(fecha) {
  if (!fecha) return "—";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "—";
  return valor.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA,
  });
}

// Días que lleva un préstamo activo sin devolverse. Como los juegos solo se
// prestan durante el evento, un préstamo activo retirado antes de hoy casi
// seguro quedó sin registrar su devolución. Devuelve 0 si no está atrasado.
export function diasSinDevolver(prestamo) {
  if (prestamo.estado !== "activo" || !prestamo.fecha_inicio) return 0;

  const hoy = Date.parse(diaArgentina(new Date()));
  const retiro = Date.parse(diaArgentina(prestamo.fecha_inicio));
  const dias = Math.round((hoy - retiro) / 86400000);

  return dias > 0 ? dias : 0;
}

export function textoDiasSinDevolver(dias) {
  return dias === 1 ? "desde ayer" : `hace ${dias} días`;
}

// Descarga una tabla (lista de filas) como CSV; se abre bien en Excel.
export function descargarCsv(nombreBase, filas) {
  const celda = (valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
  const texto = filas.map((fila) => fila.map(celda).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff" + texto], { type: "text/csv;charset=utf-8" });

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = `${nombreBase}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

// Filas de CSV de préstamos (mismas columnas en Gestionar préstamos y en Historial).
export const ENCABEZADO_CSV_PRESTAMOS = [
  "Retirado",
  "Juego",
  "Nombre y apellido",
  "DNI",
  "E-mail",
  "Teléfono",
  "Estado",
  "Devuelto",
  "Días sin devolver",
];

export function filaCsvPrestamo({ retirado, juego, nombre, dni, email, telefono, estado, cierre, atraso }) {
  return [
    fechaHoraArgentina(retirado),
    juego,
    nombre,
    dni,
    email || "",
    telefono || "",
    estado === "activo" ? "Activo" : "Cerrado",
    cierre ? fechaHoraArgentina(cierre) : "",
    atraso || "",
  ];
}
