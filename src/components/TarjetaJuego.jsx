import { imagenDeJuego } from "../api/imagenes.js";
import { useCarrito } from "../context/CarritoContext.jsx";

function TarjetaJuego({
  juego,
  esAdmin,
  esFavorito = false,
  cargandoFavoritos = false,
  onToggleFavorito,
  onEditar,
  onEliminar,
}) {
  const { agregar } = useCarrito();

  const enPrestamo = Boolean(juego.en_prestamo);
  const enVenta = Boolean(juego.en_venta);
  const sinStock = juego.stock <= 0;
  const idTitulo = `juego-${juego.id}-titulo`;

  return (
    <article
      className="tarjeta tarjeta-juego"
      aria-labelledby={idTitulo}
    >
      <img src={imagenDeJuego(juego.titulo)} alt="" />

      <div className="etiquetas">
        <span
          className={`etiqueta ${
            enPrestamo ? "no-disponible" : "disponible"
          }`}
        >
          {enPrestamo
            ? "En préstamo"
            : "Disponible para préstamo"}
        </span>

        <span
          className={`etiqueta ${
            enVenta ? "disponible" : "neutra"
          }`}
        >
          {enVenta
            ? "Disponible en tienda"
            : "No disponible en tienda"}
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

      {/* Botón de favoritos */}
      <button
        type="button"
        className="boton"
        style={{
          marginTop: 10,
          background: esFavorito ? "#e63946" : undefined,
        }}
        disabled={cargandoFavoritos}
        aria-pressed={esFavorito}
        aria-label={
          esFavorito
            ? `Quitar ${juego.titulo} de favoritos`
            : `Agregar ${juego.titulo} a favoritos`
        }
        onClick={onToggleFavorito}
      >
        {esFavorito ? "❤️ En favoritos" : "♡ Me gusta"}
      </button>

      {enVenta && (
        <>
          <div className="detalle">
            <span>Stock</span>
            <span>
              {sinStock ? "Sin stock" : `${juego.stock} unidades`}
            </span>
          </div>

          <p className="precio">
            ${juego.precio.toFixed(2)}
          </p>

          <button
            type="button"
            className="boton"
            disabled={sinStock}
            aria-label={
              sinStock
                ? `${juego.titulo}: sin stock`
                : `Agregar ${juego.titulo} al carrito`
            }
            onClick={() => agregar(juego)}
          >
            {sinStock ? "Sin stock" : "Agregar al carrito"}
          </button>
        </>
      )}

      {esAdmin && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 8,
          }}
        >
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
