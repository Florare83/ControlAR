import { useState } from "react";
import { Link } from "react-router-dom";
import { crearCheckout, crearPedidoEfectivo } from "../api/api.js";
import { useCarrito } from "../context/CarritoContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import LineaCarrito, { formatearPrecio } from "../components/LineaCarrito.jsx";
import logo from "../img/logo.png";

// Número de WhatsApp de la tienda (formato internacional, sin "+" ni espacios).
const WHATSAPP_TIENDA = "543874491907";

// Pantalla completa de confirmación de compra. El cliente elige cómo pagar:
//  - Efectivo / transferencia: se registra el pedido (pendiente de pago) y se
//    abre WhatsApp con el número de pedido para coordinar el pago.
//  - Mercado Pago: el servidor crea el pedido y el cliente paga en Mercado Pago.
function Checkout() {
  const { items, cantidadTotal, total, vaciar } = useCarrito();
  const { usuario } = useAuth();
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  // Pedido ya registrado para pagar en efectivo/transferencia.
  const [pedidoEfectivo, setPedidoEfectivo] = useState(null);

  function armarEnlaceWhatsApp(pedido, lineas) {
    const mensaje = [
      `¡Hola! Hice el pedido #${pedido.id} y quiero pagarlo en efectivo/transferencia.`,
      usuario?.nombre ? `Nombre: ${usuario.nombre}` : null,
      "",
      "Pedido:",
      ...lineas,
      "",
      `Total: ${formatearPrecio(pedido.total)}`,
    ]
      .filter((l) => l !== null)
      .join("\n");

    return `https://wa.me/${WHATSAPP_TIENDA}?text=${encodeURIComponent(mensaje)}`;
  }

  async function pagarPorWhatsApp() {
    setError("");
    setProcesando(true);

    // La pestaña se abre ya, dentro del clic, para que el navegador no la
    // bloquee; después se le carga WhatsApp.
    const ventana = window.open("", "_blank");
    if (ventana) ventana.opener = null;

    const lineas = items.map(
      (i) =>
        `• ${i.cantidad} x ${i.titulo} - ${formatearPrecio(i.precio * i.cantidad)}`
    );

    try {
      const { pedido_id, total: totalPedido } = await crearPedidoEfectivo(items);
      const pedido = { id: pedido_id, total: totalPedido };
      const url = armarEnlaceWhatsApp(pedido, lineas);

      if (ventana) ventana.location.href = url;

      // El pedido ya quedó registrado: el carrito se vacía.
      setPedidoEfectivo({ ...pedido, url });
      vaciar();
    } catch (e) {
      if (ventana) ventana.close();
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  async function pagarConMercadoPago() {
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

  if (pedidoEfectivo) {
    return (
      <div className="pantalla-completa">
        <header className="pc-cabecera">
          <Link to="/juegos" className="pc-marca">
            <img src={logo} alt="" />
            <span>El Rincón de Hermes</span>
          </Link>
        </header>

        <div className="pc-contenido">
          <div className="tarjeta pc-vacio" role="status">
            <h1>¡Pedido #{pedidoEfectivo.id} registrado!</h1>
            <p>
              Total: <strong>{formatearPrecio(pedidoEfectivo.total)}</strong>
            </p>
            <p className="ayuda">
              Quedó pendiente de pago. Coordiná el pago en efectivo o por
              transferencia con nosotros por WhatsApp; cuando lo confirmemos,
              tu pedido pasa a "Pagado". Podés seguirlo en "Mis compras".
            </p>

            <a
              className="boton boton-wa"
              href={pedidoEfectivo.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir WhatsApp
            </a>
            <Link to="/mis-compras" className="boton boton-secundario">
              Ver mis compras
            </Link>
            <Link to="/juegos" className="pc-cancelar">Seguir comprando</Link>
          </div>
        </div>
      </div>
    );
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

              <p className="ayuda">Elegí cómo querés pagar:</p>

              {error && (
                <p className="error" role="alert">{error}</p>
              )}

              <div className="pc-opciones">
                <button
                  type="button"
                  className="boton boton-wa"
                  disabled={procesando}
                  onClick={pagarPorWhatsApp}
                >
                  Efectivo / Transferencia
                </button>
                <p className="ayuda pc-opcion-ayuda">
                  Registramos tu pedido y te llevamos a WhatsApp para coordinar
                  el pago con nosotros.
                </p>

                <button
                  type="button"
                  className="boton boton-mp"
                  disabled={procesando}
                  onClick={pagarConMercadoPago}
                >
                  {procesando ? "Un momento..." : "Mercado Pago"}
                </button>
                <p className="ayuda pc-opcion-ayuda">
                  Pagás de forma segura en Mercado Pago y volvés
                  automáticamente a la tienda.
                </p>
              </div>

              <Link to="/juegos" className="pc-cancelar">Cancelar</Link>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default Checkout;
