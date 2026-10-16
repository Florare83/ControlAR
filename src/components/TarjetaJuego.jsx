
import { useState } from "react";
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

  const [imagenFallida, setImagenFallida] = useState(false);

  const imagenAlternativa = imagenDeJuego(juego.titulo);

  const imagen =
    juego.imagen_url?.trim() && !imagenFallida
      ? juego.imagen_url.trim()
      : imagenAlternativa;

  return (
    <article
      className="tarjeta tarjeta-juego"
      aria-labelledby={idTitulo}
      style={{ position: "relative" }}
    >
      <div style={{ position: "relative" }}>
        <img
          src={imagen}
          alt={`Imagen de ${juego.titulo}`}
          onError={() => {
            if (juego.imagen_url && !imagenFallida) {
              setImagenFallida(true);
            }
          }}
        />

        {!esAdmin && (
          <button
            type="button"
            disabled={cargandoFavoritos}
            onClick={onToggleFavorito}
            aria-pressed={esFavorito}
            aria-label={
              esFavorito
                ? `Quitar ${juego.titulo} de favoritos`
                : `Agregar ${juego.titulo} a favoritos`
            }
            title={
              esFavorito
                ? "Quitar de favoritos"
                : "Agregar a favoritos"
            }
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 42,
              height: 42,
              padding: 0,
              border: "none",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.95)",
              color: esFavorito ? "#e63946" : "#555",
              fontSize: 27,
              lineHeight: 1,
              cursor: cargandoFavoritos ? "default" : "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {esFavorito ? "♥" : "♡"}
          </button>
        )}
      </div>

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

      {enVenta && (
        <>
          <div className="detalle">
            <span>Stock</span>
            <span>
              {sinStock ? "Sin stock" : `${juego.stock} unidades`}
            </span>
          </div>

          <p className="precio">${juego.precio.toFixed(2)}</p>

          {!esAdmin && (
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
          )}
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
