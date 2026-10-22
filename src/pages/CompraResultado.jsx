import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmarPedido } from "../api/api.js";
import { useCarrito } from "../context/CarritoContext.jsx";
import { formatearPrecio } from "../components/LineaCarrito.jsx";
import logo from "../img/logo.png";

// Pantalla completa a la que vuelve el cliente desde Mercado Pago.
// No se fía de la URL: le pide al servidor que verifique el pago.
function CompraResultado() {
  const [params] = useSearchParams();
  const { vaciar } = useCarrito();

  const pedidoId = params.get("pedido");
  const pagoId = params.get("payment_id") || params.get("collection_id");

  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState("");
  const yaConsultado = useRef(false);

  useEffect(() => {
    if (!pedidoId || yaConsultado.current) return;
    yaConsultado.current = true;

    confirmarPedido(pedidoId, pagoId)
      .then((datos) => {
        setPedido(datos);
        // El carrito se vacía solo cuando el pago está aprobado de verdad.
        if (datos.estado === "aprobado") vaciar();
      })
      .catch((e) => setError(e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  let contenido;

  if (!pedidoId) {
    contenido = (
      <>
        <h1>No encontramos tu compra</h1>
        <Link to="/juegos" className="boton">Volver a la tienda</Link>
      </>
    );
  } else if (error) {
    contenido = (
      <>
        <p className="pc-icono" aria-hidden="true">⚠️</p>
        <h1>No pudimos verificar el pago</h1>
        <p role="alert">{error}</p>
        <Link to="/checkout" className="boton">Volver al carrito</Link>
      </>
    );
  } else if (!pedido) {
    contenido = (
      <p className="cargando" role="status">
        <span className="spinner" aria-hidden="true" />
        Verificando tu pago...
      </p>
    );
  } else if (pedido.estado === "aprobado") {
    contenido = (
      <>
        <p className="pc-icono" aria-hidden="true">✅</p>
        <h1>¡Compra confirmada!</h1>
        <p>Pedido #{pedido.id} · {formatearPrecio(pedido.total)}</p>
        <ul className="pc-detalle">
          {pedido.items.map((i, n) => (
            <li key={n}>
              <span>{i.cantidad} × {i.titulo}</span>
              <span>{formatearPrecio(i.precio_unitario * i.cantidad)}</span>
            </li>
          ))}
        </ul>
        <Link to="/juegos" className="boton">Seguir explorando</Link>
      </>
    );
  } else if (pedido.estado === "rechazado") {
    contenido = (
      <>
        <p className="pc-icono" aria-hidden="true">❌</p>
        <h1>El pago no se completó</h1>
        <p>No se realizó ningún cobro. Tu carrito sigue guardado.</p>
        <Link to="/checkout" className="boton">Intentar de nuevo</Link>
      </>
    );
  } else {
    contenido = (
      <>
        <p className="pc-icono" aria-hidden="true">⏳</p>
        <h1>Tu pago está pendiente</h1>
        <p>
          Mercado Pago todavía está procesando el pago del pedido #{pedido.id}.
          Cuando se acredite, tu compra quedará confirmada.
        </p>
        <Link to="/juegos" className="boton">Volver a la tienda</Link>
      </>
    );
  }

  return (
    <div className="pantalla-completa">
      <header className="pc-cabecera">
        <Link to="/juegos" className="pc-marca">
          <img src={logo} alt="" />
          <span>El Rincón de Hermes</span>
        </Link>
      </header>
      <div className="pc-contenido pc-resultado">{contenido}</div>
    </div>
  );
}

export default CompraResultado;
