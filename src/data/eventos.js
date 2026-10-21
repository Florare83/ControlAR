import tardes from "../img/eventos.jpeg";
import flyerOctubre from "../img/tarde-25-octubre.jpeg";

// ---------------------------------------------------------------
// Datos de los eventos del club (compartidos por Club y Nosotros).
// Cuando el backend tenga esta info, esto se va a reemplazar
// por un fetch a la API (igual que los juegos).
//
// Cómo cargar un evento nuevo:
// - fechaISO: "AAAA-MM-DD". Con esto la página decide sola si el evento es
//   próximo o anterior (pasada la fecha, pasa a "Eventos anteriores").
// - Si todavía no hay fecha exacta, dejá fechaISO en null y completá
//   fechaTexto (ej: "Durante junio") y mesCorto (ej: "JUN").
// - imagen / imagenAlt son opcionales (si faltan, se usa una foto genérica).
// - Los eventos con tipo: "Torneo" se muestran en la sección "Torneos".
//   Para indicar el valor de la inscripción agregá, por ejemplo:
//   aporte: "Inscripción: $5.000 por persona"
// ---------------------------------------------------------------

export const APORTE_MINIMO = "$2.000";

// Aviso destacado arriba de los eventos. Se oculta solo después de "hasta".
export const aviso = {
  texto:
    "Desde el domingo 25 de octubre, el ingreso a las tardes de juego tiene un aporte mínimo de $2.000 por persona.",
  hasta: "2026-11-30",
};

export const eventos = [
  {
    id: 4,
    tipo: "Tarde de juegos",
    titulo: "Tarde de juegos",
    descripcion: "Una tarde mensual para descubrir juegos de mesa modernos.",
    fechaISO: "2026-10-25",
    hora: "17 a 21 h",
    lugar: "Fundación Copaipa",
    direccion: "Zuviría 291",
    inscripcion: false,
    aporte: `Aporte mínimo: ${APORTE_MINIMO} por persona`,
    imagen: flyerOctubre,
    imagenAlt:
      "Flyer de la tarde de juegos del domingo 25 de octubre, a las 17 horas, en Fundación Copaipa, Zuviría 291. Aporte mínimo de $2.000 por persona.",
  },
  {
    id: 1,
    tipo: "Tarde de juegos",
    titulo: "Tarde de juegos",
    descripcion: "Una tarde mensual para descubrir juegos de mesa modernos",
    fechaISO: "2026-09-27",
    hora: "17 a 21 h",
    lugar: "Fundación Copaipa",
    direccion: "Zuviría 291",
    inscripcion: false,
  },
  {
    id: 2,
    tipo: "Torneo",
    titulo: "Torneo de Catan",
    descripcion:
      "Torneo abierto a todos los niveles. Inscripción previa por Whatsapp",
    fechaISO: "2026-09-27",
    hora: "17 a 21 h",
    lugar: "Fundación Copaipa",
    direccion: "Zuviría 291",
    inscripcion: true,
  },
  {
    id: 3,
    tipo: "Encuentro",
    titulo: "Encuentro Provincial de Juegos de Mesa",
    descripcion:
      "Clubes y Editoriales brindando sus servicios al público en general",
    fechaISO: null,
    fechaTexto: "Durante junio",
    mesCorto: "JUN",
    hora: "12 a 22 h",
    lugar: "Usina Cultural",
    direccion: "España 1-98",
    inscripcion: false,
  },
];

// Foto genérica para los eventos que no tienen flyer propio.
export const imagenGenerica = tardes;

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

export function clasificarEventos() {
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
export function proximoEvento() {
  const { proximos } = clasificarEventos();
  return proximos.find((evento) => evento.fechaISO) || null;
}

export function avisoVigente() {
  const limite = partesFecha(aviso.hasta);
  return Boolean(limite) && inicioDeHoy() <= limite.fecha;
}
