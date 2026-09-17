// Esta lista es un ejemplo "a mano" para poder armar y probar
// la pantalla del catálogo antes de tener el backend conectado.
// En la Entrega 5 esto se va a reemplazar por datos que vengan
// de la API real (fetch a /productos o /recursos).

export const juegos = [
  {
    id: 1,
    nombre: "Catan",
    categoria: "Estrategia",
    jugadores: "3-4",
    duracion: "90 min",
    precio: 45000,
    disponible: true,
    imagen: "/src/img/catan.webp",
  },
  {
    id: 2,
    nombre: "Carcassonne",
    categoria: "Familiar",
    jugadores: "2-5",
    duracion: "40 min",
    precio: 32000,
    disponible: true,
    imagen: "/src/img/carcassonne.webp",
  },
  {
    id: 3,
    nombre: "Ierusalem",
    categoria: "Estrategia",
    jugadores: "1-5",
    duracion: "120 min",
    precio: 65000,
    disponible: false,
    imagen: "/src/img/ierusalem.webp",
  },
  {
    id: 4,
    nombre: "Exit",
    categoria: "Escape",
    jugadores: "3-6",
    duracion: "30 min",
    precio: 25000,
    disponible: true,
    imagen: "/src/img/exit.webp",
  },
  {
    id: 5,
    nombre: "El lavarropas",
    categoria: "Memoria",
    jugadores: "2-4",
    duracion: "45 min",
    precio: 29000,
    disponible: true,
    imagen: "/src/img/el_lavarropas.webp",
  },
  {
    id: 6,
    nombre: "Flamencos",
    categoria: "Memoria",
    jugadores: "2-4",
    duracion: "45 min",
    precio: 24.0,
    disponible: true,
    imagen: "/src/img/flamencos.webp",
  },
];

// Lista de categorías para el filtro (se arma sola a partir
// de los juegos de arriba, sin repetir nombres).
export const categorias = [...new Set(juegos.map((j) => j.categoria))];