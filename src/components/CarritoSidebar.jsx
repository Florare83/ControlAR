import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCarrito } from "../context/CarritoContext.jsx";
import LineaCarrito, { formatearPrecio } from "./LineaCarrito.jsx";

// Panel lateral derecho del carrito (el típico "drawer").
function CarritoSidebar() {
  const { items, cantidadTotal, total, abierto, cerrar, vaciar } = useCarrito();
  const navegar = useNavigate();
  const botonCerrar = useRef(null);

  // Escape cierra, el fondo no se desplaza y el foco entra al panel.
  useEffect(() => {
    if (!abierto) return;

    const anterior = document.activeElement;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botonCerrar.current?.focus();

    function alTeclear(e) {
      if (e.key === "Escape") cerrar();
    }
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener("keydown", alTeclear);
      anterior?.focus?.();
    };
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  function finalizar() {
    cerrar();
    navegar("/checkout");
  }

  return (
    <>
      <div
        className={`carrito-fondo ${abierto ? "visible" : ""}`}
        onClick={cerrar}
        aria-hidden="true"
      />

      <aside
        className={`carrito-sidebar ${abierto ? "abierto" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="carrito-titulo"
        aria-hidden={!abierto}
        // Cerrado, no debe poder enfocarse con Tab.
        {...(!abierto ? { inert: "" } : {})}
      >
        <header className="carrito-cabecera">
          <h2 id="carrito-titulo">
            Tu carrito{cantidadTotal > 0 && ` (${cantidadTotal})`}
          </h2>
          <button
            ref={botonCerrar}
            type="button"
            className="carrito-cerrar"
            aria-label="Cerrar carrito"
            onClick={cerrar}
          >
            ×
          </button>
        </header>

        {items.length === 0 ? (
          <div className="carrito-vacio">
            <p aria-hidden="true" style={{ fontSize: 48, margin: 0 }}>🛒</p>
            <p>Tu carrito está vacío.</p>
            <button type="button" className="boton" onClick={() => { cerrar(); navegar("/juegos"); }}>
              Ver juegos
            </button>
          </div>
        ) : (
          <>
            <ul className="carrito-lista">
              {items.map((item) => (
                <LineaCarrito key={item.id} item={item} />
              ))}
            </ul>

            <footer className="carrito-pie">
              <div className="carrito-total">
                <span>Total</span>
                <strong>{formatearPrecio(total)}</strong>
              </div>

              <button type="button" className="boton" onClick={finalizar}>
                Finalizar compra
              </button>

              <button type="button" className="carrito-vaciar" onClick={vaciar}>
                Vaciar carrito
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

export default CarritoSidebar;
