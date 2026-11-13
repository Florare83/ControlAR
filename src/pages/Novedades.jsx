import { useState } from "react";
import { guardarNovedades } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

// "Mi cuenta > Suscripción": el cliente elige si quiere recibir por correo los avisos
// de eventos y juegos nuevos. Se cambia con un botón y se guarda al instante.
function Novedades() {
  const { usuario, recargarPerfil } = useAuth();
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);

  const suscrito = Boolean(usuario?.suscrito_novedades);

  async function cambiar() {
    setGuardando(true);

    try {
      await guardarNovedades(!suscrito);
      await recargarPerfil();
      toast.exito(
        suscrito
          ? "Listo, no vas a recibir más novedades por correo."
          : "¡Listo! Te vamos a avisar de los eventos y juegos nuevos."
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <h1>📬 Suscripción</h1>

      <p className="subtitulo">
        Si te suscribís, te mandamos un correo a <strong>{usuario?.email}</strong>{" "}
        cuando cargamos un evento o un juego nuevo. Cada correo trae un enlace
        para darte de baja.
      </p>

      <p role="status">
        {suscrito
          ? "✓ Estás suscripto/a a las novedades."
          : "Por ahora no estás suscripto/a."}
      </p>

      <button
        type="button"
        className="boton"
        onClick={cambiar}
        disabled={guardando}
      >
        {guardando
          ? "Guardando..."
          : suscrito
          ? "Darme de baja"
          : "Suscribirme a las novedades"}
      </button>
    </section>
  );
}

export default Novedades;
