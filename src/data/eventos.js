import tardes from "../img/eventos.jpeg";

// ---------------------------------------------------------------
// Eventos del club (compartidos por Club y Nosotros).
// Los eventos ya no se escriben acá: los carga el administrador desde el panel
// ("Eventos") y se leen de la API con el hook useEventos().
// Este archivo solo tiene las funciones para mostrarlos.
// ---------------------------------------------------------------

// El monto del aporte NO se escribe acá: lo carga el administrador en cada evento
// (campo "Aporte o inscripción" del panel). Esta función lo extrae del texto del
// evento para mostrarlo en otras pantallas. Ej: "Aporte mínimo: $2.000 por persona" -> "$2.000".
// Devuelve null si el texto no tiene un monto.
export function montoDelAporte(texto) {
  const coincidencia = /\$\s?\d[\d.,]*/.exec(texto || "");
  return coincidencia ? coincidencia[0].replace(/\s/g, "").replace(/[.,]+$/, "") : null;
}

// Aviso destacado arriba de los eventos. Se oculta solo después de "hasta".
// (Sin montos: el valor figura en cada evento.)
export const aviso = {
  texto:
    "Desde el domingo 25 de octubre, el ingreso a las tardes de juego tiene un aporte mínimo por persona. El monto figura en cada evento.",
  hasta: "2026-11-30",
};

// Foto genérica para los eventos que no tienen flyer propio.
export const imagenGenerica = tardes;

// Convierte un evento de la API al formato que usan las pantallas.
// La hora de inicio llega como "17:00:00"; se muestra "hora_texto" ("17 a 21 h").
export function adaptarEvento(e) {
  return {
    id: e.id,
    tipo: e.tipo,
    titulo: e.titulo,
    descripcion: e.descripcion || "",
    fechaISO: e.fecha || null,
    fechaTexto: e.fecha_texto || "",
    mesCorto: e.mes_corto || "",
    hora: e.hora_texto || "",
    horaInicio: e.hora_inicio ? e.hora_inicio.slice(0, 5) : "",
    lugar: e.lugar,
    direccion: e.direccion,
    inscripcion: Boolean(e.inscripcion),
    aporte: e.aporte || "",
    imagen: e.imagen_url || "",
    imagenAlt: `Flyer de ${e.titulo}`,
    permiteReservas: Boolean(e.permite_reservas),
  };
}

const MESES_CORTOS = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

// Convierte "2026-09-27" en las partes que muestran las tarjetas.
export function partesFecha(iso) {
  if (!iso) return null;

  const [anio, mes, dia] = iso.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  if (Number.isNaN(fecha.getTime())) return null;

  const diaSemana = fecha.toLocaleDateString("es-AR", { weekday: "long" });
  const larga = fecha
    .toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(",", "");

  return {
    fecha,
    dia,
    mes: MESES_CORTOS[mes - 1],
    diaSemana,
    larga: larga.charAt(0).toUpperCase() + larga.slice(1),
  };
}

// Inicio del día de hoy: un evento de hoy todavía cuenta como próximo.
export function inicioDeHoy() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}

export function clasificarEventos(eventos = []) {
  const hoy = inicioDeHoy();

  const conFecha = eventos.map((evento) => ({
    evento,
    partes: partesFecha(evento.fechaISO),
  }));

  const proximos = conFecha
    .filter(({ partes }) => !partes || partes.fecha >= hoy)
    .sort((a, b) => {
      if (!a.partes) return 1;
      if (!b.partes) return -1;
      return a.partes.fecha - b.partes.fecha;
    })
    .map(({ evento }) => evento);

  const anteriores = conFecha
    .filter(({ partes }) => partes && partes.fecha < hoy)
    .sort((a, b) => b.partes.fecha - a.partes.fecha)
    .map(({ evento }) => evento);

  return { proximos, anteriores };
}

// Primer evento próximo que ya tiene fecha exacta (o null).
export function proximoEvento(eventos = []) {
  const { proximos } = clasificarEventos(eventos);
  return proximos.find((evento) => evento.fechaISO) || null;
}

export function avisoVigente() {
  const limite = partesFecha(aviso.hasta);
  return Boolean(limite) && inicioDeHoy() <= limite.fecha;
}
