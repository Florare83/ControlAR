
import { useState } from "react";
import { imagenDeJuego } from "../api/imagenes.js";
import { useCarrito } from "../context/CarritoContext.jsx";
import { formatearPrecio } from "./LineaCarrito.jsx";

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

  // Botón "me gusta": sobre la foto, solo para visitantes y clientes.
  const propsFavorito = {
    type: "button",
    disabled: cargandoFavoritos,
    "aria-pressed": esFavorito,
    "aria-label": esFavorito
      ? `Quitar ${juego.titulo} de favoritos`
      : `Agregar ${juego.titulo} a favoritos`,
    title: esFavorito ? "Quitar de favoritos" : "Me gusta",
    onClick: onToggleFavorito,
  };
  const corazon = esFavorito ? "❤️" : "♡";

  return (
    <article
      className={`tarjeta tarjeta-juego ${esAdmin ? "tarjeta-juego-admin" : ""}`}
      aria-labelledby={idTitulo}
    >
      <div className="juego-foto">
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
            {...propsFavorito}
            className={`favorito-foto ${esFavorito ? "activo" : ""}`}
          >
            {corazon}
          </button>
        )}
      </div>

      <div className="tarjeta-info">
        <div className="etiquetas">
          <span
            className={`etiqueta ${enPrestamo ? "no-disponible" : "disponible"}`}
          >
            {enPrestamo ? "Prestado" : "En préstamo"}
          </span>

          <span className={`etiqueta ${enVenta ? "disponible" : "neutra"}`}>
            {enVenta ? "En tienda" : "No está en tienda"}
          </span>
        </div>

        <h3 id={idTitulo}>{juego.titulo}</h3>

        <p className="datos-juego">
          <span title="Jugadores">
            <span role="img" aria-label="Jugadores">👥</span>{" "}
            {juego.cantidad_jugadores}
          </span>
          <span title="Duración">
            <span role="img" aria-label="Duración">⏱️</span>{" "}
            {juego.duracion_minutos} min
          </span>
          <span title="Categoría">
            <span role="img" aria-label="Categoría">🏷️</span>{" "}
            {juego.categoria.nombre}
          </span>
        </p>

        {enVenta && (
          <p className="datos-venta">
            <span
              className={sinStock ? "sin-stock" : undefined}
              title="Stock"
            >
              <span role="img" aria-label="Stock">📦</span>{" "}
              {sinStock ? "Sin stock" : juego.stock}
            </span>
            <strong className="precio">{formatearPrecio(juego.precio)}</strong>
          </p>
        )}
      </div>

      {/* Visitantes y clientes: agregar al carrito. Administrador: editar y eliminar. */}
      {esAdmin ? (
        <div className="tarjeta-acciones">
          <div className="admin-acciones">
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
        </div>
      ) : (
        enVenta && (
          <div className="tarjeta-acciones">
            <div className="acciones-tarjeta">
              <button
                type="button"
                className="boton boton-carrito-tarjeta"
                disabled={sinStock}
                aria-label={
                  sinStock
                    ? `${juego.titulo}: sin stock`
                    : `Agregar ${juego.titulo} al carrito`
                }
                title={sinStock ? "Sin stock" : "Agregar al carrito"}
                onClick={() => agregar(juego)}
              >
                {sinStock ? "Sin stock" : "🛒 Agregar"}
              </button>
            </div>
          </div>
        )
      )}
    </article>
  );
}

export default TarjetaJuego;
