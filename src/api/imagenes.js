// Imagen predeterminada para los juegos que no tienen una imagen personalizada.
import logo from "../img/logo.webp";

// Devuelve el logo mientras el juego no tenga una imagen propia.
// La URL personalizada se gestiona en TarjetaJuego.jsx.
export function imagenDeJuego() {
  return logo;
}
