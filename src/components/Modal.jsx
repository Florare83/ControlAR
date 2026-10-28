import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

// Ventana superpuesta (modal) reutilizable.
//  - Escape y el botón × la cierran (salvo que esté "ocupado", p. ej. guardando).
//  - Un clic en el fondo NO la cierra: así no se pierde lo que se estaba cargando.
//  - El fondo no se desplaza y el foco queda dentro mientras está abierta.
function Modal({ titulo, onCerrar, ocupado = false, ancho = 640, children }) {
  const idTitulo = useId();
  const caja = useRef(null);
  const alCerrar = useRef(onCerrar);
  const estaOcupado = useRef(ocupado);

  alCerrar.current = onCerrar;
  estaOcupado.current = ocupado;

  useEffect(() => {
    const anterior = document.activeElement;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Si ningún campo tomó el foco por su cuenta, lo recibe la caja.
    if (!caja.current?.contains(document.activeElement)) {
      caja.current?.focus();
    }

    function alTeclear(e) {
      if (e.key === "Escape") {
        if (!estaOcupado.current) alCerrar.current?.();
        return;
      }

      // Tab no sale de la ventana.
      if (e.key === "Tab" && caja.current) {
        const enfocables = caja.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (enfocables.length === 0) return;

        const primero = enfocables[0];
        const ultimo = enfocables[enfocables.length - 1];

        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    }

    document.addEventListener("keydown", alTeclear);

    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener("keydown", alTeclear);
      anterior?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="modal-fondo">
      <div
        ref={caja}
        className="modal-caja"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        style={{ maxWidth: ancho }}
      >
        <header className="modal-cabecera">
          <h2 id={idTitulo}>{titulo}</h2>
          <button
            type="button"
            className="modal-cerrar"
            aria-label="Cerrar ventana"
            disabled={ocupado}
            onClick={onCerrar}
          >
            ×
          </button>
        </header>

        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;
