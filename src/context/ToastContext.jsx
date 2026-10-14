import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// Avisos cortos ("toasts") que aparecen abajo a la derecha y se van solos.
// Uso en cualquier componente:
//   const toast = useToast();
//   toast.exito("Juego creado");   toast.error("No se pudo guardar");   toast.info("...");
const ToastContext = createContext(null);

const DURACION_MS = 4500;

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const contador = useRef(0);

  const quitar = useCallback((id) => {
    setAvisos((actuales) => actuales.filter((a) => a.id !== id));
  }, []);

  const mostrar = useCallback(
    (mensaje, tipo) => {
      contador.current += 1;
      const id = contador.current;
      setAvisos((actuales) => [...actuales, { id, mensaje, tipo }]);
      window.setTimeout(() => quitar(id), DURACION_MS);
    },
    [quitar]
  );

  const toast = useMemo(
    () => ({
      exito: (mensaje) => mostrar(mensaje, "exito"),
      error: (mensaje) => mostrar(mensaje, "error"),
      info: (mensaje) => mostrar(mensaje, "info"),
    }),
    [mostrar]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* El contenedor existe siempre: los lectores de pantalla solo anuncian
          los avisos nuevos si la región "en vivo" ya estaba en la página. */}
      <div className="toasts" role="region" aria-label="Notificaciones" aria-live="polite">
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            className={`toast toast-${aviso.tipo}`}
            role={aviso.tipo === "error" ? "alert" : "status"}
          >
            <span>{aviso.mensaje}</span>
            <button
              type="button"
              className="toast-cerrar"
              aria-label="Cerrar aviso"
              onClick={() => quitar(aviso.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}