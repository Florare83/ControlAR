
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
  const sinStock = Number(juego.stock ?? 0) <= 0;
  const idTitulo = `juego-${juego.id}-titulo`;

  const [imagenFallida, setImagenFallida] = useState(false);

  const imagenAlternativa = imagenDeJuego(juego.titulo);

  const imagen =
    juego.imagen_url?.trim() && !imagenFallida
      ? juego.imagen_url.trim()
      : imagenAlternativa;

  const categoria = juego.categoria?.nombre ?? "Sin categoría";
  const cantidadJugadores = juego.cantidad_jugadores ?? "No especificado";
  const duracion = juego.duracion_minutos ?? "No especificada";
  const stock = Number(juego.stock ?? 0);
  const precio = Number(juego.precio ?? 0);

  return (
    <article
      className="tarjeta tarjeta-juego"
      aria-labelledby={idTitulo}
      style={{ position: "relative" }}
    >
      {/* Imagen del juego */}
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

        {/* Favoritos */}
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

      {/* Disponibilidad para préstamo y tienda */}
      <div
        className="etiquetas"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 8,
        }}
      >
        <span
          className={`etiqueta ${
            enPrestamo ? "no-disponible" : "disponible"
          }`}
          title={
            enPrestamo
              ? "El juego está en préstamo"
              : "El juego está disponible para préstamo"
          }
        >
          <span aria-hidden="true">
            {enPrestamo ? "📤" : "📥"}
          </span>{" "}
          {enPrestamo
            ? "En préstamo"
            : "Disponible para préstamo"}
        </span>

        <span
          className={`etiqueta ${
            enVenta ? "disponible" : "neutra"
          }`}
          title={
            enVenta
              ? "Disponible en tienda"
              : "No disponible en tienda"
          }
        >
          <span aria-hidden="true">
            {enVenta ? "🛒" : "🚫"}
          </span>{" "}
          {enVenta
            ? "Disponible en tienda"
            : "No disponible en tienda"}
        </span>
      </div>

      {/* Título */}
      <h3 id={idTitulo}>{juego.titulo}</h3>

      {/* Características compactas */}
      <div
        className="caracteristicas-juego"
        aria-label={`Características de ${juego.titulo}`}
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px 14px",
          margin: "10px 0",
        }}
      >
        <span
          className="caracteristica-juego"
          title="Cantidad de jugadores"
          aria-label={`Jugadores: ${cantidadJugadores}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 19 }}>
            ♟
          </span>
          <span>{cantidadJugadores}</span>
        </span>

        <span
          className="caracteristica-juego"
          title="Duración de la partida"
          aria-label={`Duración: ${duracion} minutos`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 19 }}>
            ◷
          </span>
          <span>
            {duracion}
            {typeof duracion === "number" ||
            !Number.isNaN(Number(duracion))
              ? " min"
              : ""}
          </span>
        </span>

        <span
          className="caracteristica-juego"
          title="Categoría del juego"
          aria-label={`Categoría: ${categoria}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 19 }}>
            ▦
          </span>
          <span>{categoria}</span>
        </span>
      </div>

      {/* Información comercial */}
      {enVenta && (
        <>
          <div
            className="detalle"
            title="Stock disponible"
            aria-label={
              sinStock
                ? "Sin stock"
                : `Stock: ${stock} unidades`
            }
          >
            <span aria-hidden="true">📦</span>{" "}
            <span>
              {sinStock ? "Sin stock" : `${stock} un.`}
            </span>
          </div>

          <p className="precio">${precio.toFixed(2)}</p>

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

      {/* Acciones exclusivas del administrador */}
      {esAdmin && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
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
