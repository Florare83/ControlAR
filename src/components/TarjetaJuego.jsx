// Este componente recibe un juego por props y solo se encarga
// de mostrarlo. No sabe nada del filtro ni de la búsqueda:
// esa lógica vive en la página que lo usa (Juegos.jsx).

function TarjetaJuego({ juego }) {
  return (
    <div className="tarjeta tarjeta-juego">
      <img src={juego.imagen} alt={juego.nombre} />

      <span
        className={`etiqueta ${
          juego.disponible ? "disponible" : "no-disponible"
        }`}
      >
        {juego.disponible ? "Disponible" : "Prestado"}
      </span>

      <h3>{juego.nombre}</h3>

      <div className="detalle">
        <span>Jugadores</span>
        <span>{juego.jugadores}</span>
      </div>
      <div className="detalle">
        <span>Duración</span>
        <span>{juego.duracion}</span>
      </div>
      <div className="detalle">
        <span>Categoría</span>
        <span>{juego.categoria}</span>
      </div>

      <p className="precio">${juego.precio.toFixed(2)}</p>

      <button className="boton" disabled={!juego.disponible}>
        {juego.disponible ? "Solicitar préstamo" : "No disponible"}
      </button>
    </div>
  );
}

export default TarjetaJuego;