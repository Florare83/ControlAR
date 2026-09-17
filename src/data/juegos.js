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
    precio: 45.0,
    disponible: true,
    imagen: "https://picsum.photos/seed/catan/400/300",
  },
  {
    id: 2,
    nombre: "Carcassonne",
    categoria: "Familiar",
    jugadores: "2-5",
    duracion: "40 min",
    precio: 32.0,
    disponible: true,
    imagen: "https://picsum.photos/seed/carcassonne/400/300",
  },
  {
    id: 3,
    nombre: "Terraforming Mars",
    categoria: "Estrategia",
    jugadores: "1-5",
    duracion: "120 min",
    precio: 65.0,
    disponible: false,
    imagen: "https://picsum.photos/seed/terraforming/400/300",
  },
  {
    id: 4,
    nombre: "Dixit",
    categoria: "Fiesta",
    jugadores: "3-6",
    duracion: "30 min",
    precio: 25.0,
    disponible: true,
    imagen: "https://picsum.photos/seed/dixit/400/300",
  },
  {
    id: 5,
    nombre: "Azul",
    categoria: "Abstracto",
    jugadores: "2-4",
    duracion: "45 min",
    precio: 29.0,
    disponible: true,
    imagen: "https://picsum.photos/seed/azul/400/300",
  },
  {
    id: 6,
    nombre: "Qwirkle",
    categoria: "Familiar",
    jugadores: "2-4",
    duracion: "45 min",
    precio: 24.0,
    disponible: true,
    imagen: "https://picsum.photos/seed/qwirkle/400/300",
  },
];

// Lista de categorías para el filtro (se arma sola a partir
// de los juegos de arriba, sin repetir nombres).
export const categorias = [...new Set(juegos.map((j) => j.categoria))];