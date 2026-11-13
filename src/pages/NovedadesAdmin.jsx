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

function fechaCorta(iso) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  });
}

// Panel del administrador: resumen de novedades por correo (próximos eventos, juegos
// nuevos y, para cada persona, sus favoritos que ya están a la venta).
function NovedadesAdmin() {
  const toast = useToast();
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Qué se va a mandar. Al cargar, todo viene tildado; el administrador destilda lo que no quiera.
  const [eventosSel, setEventosSel] = useState(new Set());
  const [juegosSel, setJuegosSel] = useState(new Set());
  const [incluirFavoritos, setIncluirFavoritos] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const datos = await obtenerResumenNovedades();
      setEstado(datos);
      setEventosSel(new Set(datos.eventos.map((e) => e.id)));
      setJuegosSel(new Set(datos.juegos_nuevos.map((j) => j.id)));
      setIncluirFavoritos(true);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function alternar(setConjunto, id) {
    setConjunto((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  async function enviar() {
    const cantidad = estado?.suscriptores ?? 0;

    if (
      !window.confirm(
        `Se va a mandar el resumen con lo que elegiste a los ${cantidad} suscriptores. ¿Continuar?`
      )
    ) {
      return;
    }

    setEnviando(true);

    try {
      const { enviados } = await enviarResumenNovedades({
        eventos_ids: [...eventosSel],
        juegos_ids: [...juegosSel],
        incluir_favoritos: incluirFavoritos,
      });
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
  const hayAlgoElegido =
    eventosSel.size > 0 ||
    juegosSel.size > 0 ||
    (incluirFavoritos && !estado.primera_vez);

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

      <p>Elegí qué querés incluir en el resumen:</p>

      <fieldset className="resumen-opcion">
        <legend>Próximos eventos ({eventosSel.size} de {estado.eventos.length})</legend>
        {estado.eventos.length === 0 ? (
          <p className="ayuda">No hay eventos próximos.</p>
        ) : (
          <ul className="resumen-lista">
            {estado.eventos.map((evento) => (
              <li key={evento.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={eventosSel.has(evento.id)}
                    onChange={() => alternar(setEventosSel, evento.id)}
                  />{" "}
                  {evento.titulo}
                  {evento.fecha && ` · ${fechaCorta(evento.fecha)}`}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset className="resumen-opcion">
        <legend>
          Juegos nuevos
          {!estado.primera_vez &&
            ` (${juegosSel.size} de ${estado.juegos_nuevos.length})`}
        </legend>
        {estado.primera_vez ? (
          <p className="ayuda">
            Se empiezan a contar desde este primer envío.
          </p>
        ) : estado.juegos_nuevos.length === 0 ? (
          <p className="ayuda">No hay juegos nuevos desde el último envío.</p>
        ) : (
          <>
            <ul className="resumen-lista">
              {estado.juegos_nuevos.map((juego) => (
                <li key={juego.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={juegosSel.has(juego.id)}
                      onChange={() => alternar(setJuegosSel, juego.id)}
                    />{" "}
                    {juego.titulo}
                  </label>
                </li>
              ))}
            </ul>
            {juegosSel.size < estado.juegos_nuevos.length && (
              <p className="ayuda">
                Si dejás juegos sin tildar, siguen pendientes para el próximo
                resumen.
              </p>
            )}
          </>
        )}
      </fieldset>

      <fieldset className="resumen-opcion">
        <legend>Favoritos a la venta</legend>
        {estado.primera_vez ? (
          <p className="ayuda">
            Se empiezan a contar desde este primer envío.
          </p>
        ) : (
          <label>
            <input
              type="checkbox"
              checked={incluirFavoritos}
              onChange={(e) => setIncluirFavoritos(e.target.checked)}
            />{" "}
            Avisar a cada persona de sus favoritos que ya están a la venta (
            {pendiente.personas_con_favoritos}{" "}
            {pendiente.personas_con_favoritos === 1 ? "persona" : "personas"})
          </label>
        )}
      </fieldset>

      <button
        type="button"
        className="boton"
        onClick={enviar}
        disabled={enviando || estado.suscriptores === 0 || !hayAlgoElegido}
      >
        {enviando ? "Enviando..." : "Enviar resumen ahora"}
      </button>

      {estado.suscriptores === 0 && (
        <p className="ayuda">Todavía no hay suscriptores.</p>
      )}

      {estado.suscriptores > 0 && !hayAlgoElegido && (
        <p className="ayuda">Elegí al menos algo para enviar.</p>
      )}
    </div>
  );
}

export default NovedadesAdmin;
