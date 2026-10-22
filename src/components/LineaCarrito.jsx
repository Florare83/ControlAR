import { useCarrito } from "../context/CarritoContext.jsx";

export function formatearPrecio(valor) {
  return valor.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });
}

// Un renglón del carrito: imagen, título, cantidad (− / +) y quitar.
// Lo usan el sidebar y la pantalla de checkout.
function LineaCarrito({ item }) {
  const { cambiarCantidad, quitar } = useCarrito();

  return (
    <li className="carrito-linea">
      <img src={item.imagen} alt="" />

      <div className="carrito-linea-info">
        <p className="carrito-linea-titulo">{item.titulo}</p>
        <p className="carrito-linea-precio">{formatearPrecio(item.precio)}</p>

        <div className="carrito-cantidad" role="group" aria-label={`Cantidad de ${item.titulo}`}>
          <button
            type="button"
            aria-label={`Quitar una unidad de ${item.titulo}`}
            onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
          >
            −
          </button>
          <span aria-live="polite">{item.cantidad}</span>
          <button
            type="button"
            aria-label={`Agregar una unidad de ${item.titulo}`}
            disabled={item.cantidad >= item.stock}
            onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div className="carrito-linea-lado">
        <strong>{formatearPrecio(item.precio * item.cantidad)}</strong>
        <button
          type="button"
          className="carrito-quitar"
          aria-label={`Eliminar ${item.titulo} del carrito`}
          onClick={() => quitar(item.id)}
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}

export default LineaCarrito;
