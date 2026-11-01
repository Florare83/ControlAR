import { useCallback, useEffect, useState } from "react";
import {
  enviarResumenNovedades,
  obtenerResumenNovedades,
} from "../api/api.js";
import { useToast } from "../context/ToastContext.jsx";

function fechaLarga(iso) {
  if (!iso) return "todavía no se envió ninguno";
  return new Date(iso).toLocaleString("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

// Panel del administrador: resumen de novedades por correo (próximos eventos, juegos
// nuevos y, para cada persona, sus favoritos que ya están a la venta).
function NovedadesAdmin() {
  const toast = useToast();
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setEstado(await obtenerResumenNovedades());
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function enviar() {
    const cantidad = estado?.suscriptores ?? 0;

    if (
      !window.confirm(
        `Se va a mandar el resumen a los ${cantidad} suscriptores. ¿Continuar?`
      )
    ) {
      return;
    }

    setEnviando(true);

    try {
      const { enviados } = await enviarResumenNovedades();
      toast.exito(
        enviados > 0
          ? `Resumen enviado a ${enviados} ${enviados === 1 ? "persona" : "personas"}.`
          : "No había nada para mandar."
      );
      await cargar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (error) {
    return (
      <div>
        <h1>Novedades</h1>
        <p className="error" role="alert">{error}</p>
      </div>
    );
  }

  if (!estado) {
    return (
      <div>
        <h1>Novedades</h1>
        <p role="status">Cargando...</p>
      </div>
    );
  }

  const { pendiente } = estado;

  return (
    <div>
      <h1>Novedades por correo</h1>

      <p className="subtitulo">
        {estado.suscriptores}{" "}
        {estado.suscriptores === 1 ? "persona está suscripta" : "personas están suscriptas"}.
        Los avisos de eventos y juegos nuevos se mandan al crearlos (casilla
        «Avisar a los suscriptores» del formulario). Desde acá se manda el resumen.
      </p>

      <h2>Resumen de novedades</h2>

      <p>Último envío: {fechaLarga(estado.ultimo_envio)}.</p>

      <p>Lo que llevaría el próximo resumen:</p>
      <ul>
        <li>{pendiente.eventos} próximos eventos</li>
        <li>
          {estado.primera_vez
            ? "Juegos nuevos: se empiezan a contar desde este primer envío"
            : `${pendiente.juegos_nuevos} juegos nuevos`}
        </li>
        <li>
          {estado.primera_vez
            ? "Favoritos a la venta: se empiezan a contar desde este primer envío"
            : `${pendiente.personas_con_favoritos} personas con favoritos que ya están a la venta`}
        </li>
      </ul>

      <button
        type="button"
        className="boton"
        onClick={enviar}
        disabled={enviando || estado.suscriptores === 0}
      >
        {enviando ? "Enviando..." : "Enviar resumen ahora"}
      </button>

      {estado.suscriptores === 0 && (
        <p className="ayuda">Todavía no hay suscriptores.</p>
      )}
    </div>
  );
}

export default NovedadesAdmin;
