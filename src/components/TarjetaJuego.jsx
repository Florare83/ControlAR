import { imagenDeJuego } from "../api/imagenes.js";

// Recibe un juego tal como lo devuelve la API (titulo, cantidad_jugadores,
// duracion_minutos, stock, categoria: {id, nombre}...) y lo muestra.
// Los botones Editar / Eliminar avisan a la página con onEditar / onEliminar.

function TarjetaJuego({ juego, onEditar, onEliminar }) {
  const disponible = juego.stock > 0;

  return (
    <div className="tarjeta tarjeta-juego">
      <img src={imagenDeJuego(juego.titulo)} alt={juego.titulo} />

      <span
        className={`etiqueta ${disponible ? "disponible" : "no-disponible"}`}
      >
        {disponible ? `Disponible (${juego.stock})` : "Sin stock"}
      </span>

      <h3>{juego.titulo}</h3>

      <div className="detalle">
        <span>Jugadores</span>
        <span>{juego.cantidad_jugadores}</span>
      </div>
      <div className="detalle">
        <span>Duración</span>
        <span>{juego.duracion_minutos} min</span>
      </div>
      <div className="detalle">
        <span>Categoría</span>
        <span>{juego.categoria.nombre}</span>
      </div>

      <p className="precio">${juego.precio.toFixed(2)}</p>

      <button className="boton" disabled={!disponible}>
        {disponible ? "Solicitar préstamo" : "No disponible"}
      </button>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="boton" onClick={() => onEditar(juego)}>
          Editar
        </button>
        <button
          className="boton"
          style={{ background: "#e63946" }}
          onClick={() => onEliminar(juego)}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

export default TarjetaJuego;