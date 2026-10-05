// La base de datos no guarda imágenes: acá asociamos cada juego con su
// foto por el título. Los juegos nuevos usan el logo como imagen por defecto.
import catan from "../img/catan.webp";
import carcassonne from "../img/carcassonne.webp";
import ierusalem from "../img/ierusalem.webp";
import exit from "../img/exit.webp";
import elLavarropas from "../img/el_lavarropas.webp";
import flamencos from "../img/flamencos.webp";
import elTiburon from "../img/el_tiburon.webp";
import esquinados from "../img/esquinados.webp";
import faraway from "../img/faraway.webp";
import logo from "../img/logo.webp";

const imagenes = {
  catan,
  carcassonne,
  ierusalem,
  exit,
  "el lavarropas": elLavarropas,
  flamencos,
  "el tiburon": elTiburon,
  esquinados,
  faraway,
};

// Compara sin mayúsculas ni tildes: "El Tiburón" -> "el tiburon"
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function imagenDeJuego(titulo) {
  return imagenes[normalizar(titulo)] ?? logo;
}