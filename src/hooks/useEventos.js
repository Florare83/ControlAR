import { useCallback, useEffect, useState } from "react";
import { listarEventos } from "../api/api.js";
import { adaptarEvento } from "../data/eventos.js";

// Trae los eventos de la API y los deja en el formato de las pantallas.
// Si falla, devuelve la lista vacía y el mensaje de error (las páginas siguen funcionando).
export function useEventos() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    setError("");
    try {
      const lista = await listarEventos();
      setEventos((Array.isArray(lista) ? lista : []).map(adaptarEvento));
    } catch (e) {
      setError(e.message || "No se pudieron cargar los eventos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { eventos, cargando, error, recargar };
}
