import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// Avisos cortos ("toasts") que aparecen abajo a la derecha y se van solos.
// Uso en cualquier componente:
//   const toast = useToast();
//   toast.exito("Juego creado");   toast.error("No se pudo guardar");   toast.info("...");
// Con botón de acción (p. ej. "Deshacer") y duración propia:
//   toast.exito("Devuelto", { accion: { texto: "Deshacer", onClick: () => ... }, duracion: 10000 });
const ToastContext = createContext(null);

const DURACION_MS = 4500;

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const contador = useRef(0);

  const quitar = useCallback((id) => {
    setAvisos((actuales) => actuales.filter((a) => a.id !== id));
  }, []);

  const mostrar = useCallback(
    (mensaje, tipo, opciones = {}) => {
      contador.current += 1;
      const id = contador.current;
      setAvisos((actuales) => [
        ...actuales,
        { id, mensaje, tipo, accion: opciones.accion ?? null },
      ]);
      window.setTimeout(() => quitar(id), opciones.duracion ?? DURACION_MS);
    },
    [quitar]
  );

  const toast = useMemo(
    () => ({
      exito: (mensaje, opciones) => mostrar(mensaje, "exito", opciones),
      error: (mensaje, opciones) => mostrar(mensaje, "error", opciones),
      info: (mensaje, opciones) => mostrar(mensaje, "info", opciones),
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
            {aviso.accion && (
              <button
                type="button"
                className="toast-accion"
                onClick={() => {
                  quitar(aviso.id);
                  aviso.accion.onClick();
                }}
              >
                {aviso.accion.texto}
              </button>
            )}
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