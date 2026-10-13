import { imagenDeJuego } from "../api/imagenes.js";
import { useCarrito } from "../context/CarritoContext.jsx";

// Recibe un juego tal como lo devuelve la API (titulo, cantidad_jugadores,
// duracion_minutos, en_venta, en_prestamo, stock, precio, categoria: {id, nombre}...) y lo muestra.
// Los botones Editar / Eliminar avisan a la página con onEditar / onEliminar (solo admin).
//
// Reglas del catálogo público:
// - Siempre se ve si el juego está disponible para préstamo o "En préstamo".
// - Siempre se ve si está "Disponible en tienda" (en venta) o no.
// - Stock, precio y el botón "Agregar al carrito" aparecen SOLO si el juego está en venta.

function TarjetaJuego({ juego, esAdmin, onEditar, onEliminar }) {
  const { agregar } = useCarrito();
  const enPrestamo = Boolean(juego.en_prestamo);
  const enVenta = Boolean(juego.en_venta);
  const sinStock = juego.stock <= 0;
  const idTitulo = `juego-${juego.id}-titulo`;

  return (
    <article className="tarjeta tarjeta-juego" aria-labelledby={idTitulo}>
      <img src={imagenDeJuego(juego.titulo)} alt="" />

      <div className="etiquetas">
        <span className={`etiqueta ${enPrestamo ? "no-disponible" : "disponible"}`}>
          {enPrestamo ? "En préstamo" : "Disponible para préstamo"}
        </span>
        <span className={`etiqueta ${enVenta ? "disponible" : "neutra"}`}>
          {enVenta ? "Disponible en tienda" : "No disponible en tienda"}
        </span>
      </div>

      <h3 id={idTitulo}>{juego.titulo}</h3>

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

      {enVenta && (
        <>
          <div className="detalle">
            <span>Stock</span>
            <span>{sinStock ? "Sin stock" : `${juego.stock} unidades`}</span>
          </div>

          <p className="precio">${juego.precio.toFixed(2)}</p>

          <button
            type="button"
            className="boton"
            disabled={sinStock}
            aria-label={sinStock ? `${juego.titulo}: sin stock` : `Agregar ${juego.titulo} al carrito`}
            onClick={() => agregar(juego)}
          >
            {sinStock ? "Sin stock" : "Agregar al carrito"}
          </button>
        </>
      )}

      {esAdmin && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            className="boton"
            aria-label={`Editar ${juego.titulo}`}
            onClick={() => onEditar(juego)}
          >
            Editar
          </button>
          <button
            type="button"
            className="boton"
            style={{ background: "#e63946" }}
            aria-label={`Eliminar ${juego.titulo}`}
            onClick={() => onEliminar(juego)}
          >
            Eliminar
          </button>
        </div>
      )}
    </article>
  );
}

export default TarjetaJuego;