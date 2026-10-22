import { useState } from "react";
import { Link } from "react-router-dom";
import { crearCheckout } from "../api/api.js";
import { useCarrito } from "../context/CarritoContext.jsx";
import LineaCarrito, { formatearPrecio } from "../components/LineaCarrito.jsx";
import logo from "../img/logo.png";

// Pantalla completa de confirmación de compra. Al confirmar, el servidor
// crea el pedido y el cliente pasa a pagar en Mercado Pago.
function Checkout() {
  const { items, cantidadTotal, total } = useCarrito();
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  async function pagar() {
    setError("");
    setProcesando(true);

    try {
      const { init_point } = await crearCheckout(items);
      // Redirección completa: Mercado Pago es otro sitio.
      window.location.assign(init_point);
    } catch (e) {
      setError(e.message);
      setProcesando(false);
    }
  }

  return (
    <div className="pantalla-completa">
      <header className="pc-cabecera">
        <Link to="/juegos" className="pc-marca">
          <img src={logo} alt="" />
          <span>El Rincón de Hermes</span>
        </Link>
        <Link to="/juegos" className="pc-volver">← Seguir comprando</Link>
      </header>

      <div className="pc-contenido">
        <h1>Confirmá tu compra</h1>

        {items.length === 0 ? (
          <div className="tarjeta pc-vacio">
            <p>Tu carrito está vacío.</p>
            <Link to="/juegos" className="boton">Ver juegos</Link>
          </div>
        ) : (
          <div className="pc-grilla">
            <section className="tarjeta" aria-labelledby="pc-resumen">
              <h2 id="pc-resumen">
                Resumen ({cantidadTotal} {cantidadTotal === 1 ? "producto" : "productos"})
              </h2>
              <ul className="carrito-lista">
                {items.map((item) => (
                  <LineaCarrito key={item.id} item={item} />
                ))}
              </ul>
            </section>

            <section className="tarjeta pc-pago" aria-labelledby="pc-pago-titulo">
              <h2 id="pc-pago-titulo">Pago</h2>

              <div className="carrito-total">
                <span>Total a pagar</span>
                <strong>{formatearPrecio(total)}</strong>
              </div>

              <p className="ayuda">
                Vas a pasar a Mercado Pago para completar el pago de forma
                segura. Cuando termines, volvés automáticamente a la tienda.
              </p>

              {error && (
                <p className="error" role="alert">{error}</p>
              )}

              <button
                type="button"
                className="boton boton-mp"
                disabled={procesando}
                onClick={pagar}
              >
                {procesando ? "Conectando con Mercado Pago..." : "Confirmar y pagar con Mercado Pago"}
              </button>

              <Link to="/juegos" className="pc-cancelar">Cancelar</Link>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default Checkout;
