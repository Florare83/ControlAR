
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  cambiarContrasena,
  eliminarCuenta,
} from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

function Cuenta() {
  const { logout } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();

  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [repetirContrasena, setRepetirContrasena] = useState("");
  const [guardandoContrasena, setGuardandoContrasena] = useState(false);

  const [contrasenaEliminar, setContrasenaEliminar] = useState("");
  const [eliminandoCuenta, setEliminandoCuenta] = useState(false);

  async function manejarCambioContrasena(e) {
    e.preventDefault();

    if (contrasenaNueva.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (contrasenaNueva !== repetirContrasena) {
      toast.error("Las contraseñas nuevas no coinciden.");
      return;
    }

    setGuardandoContrasena(true);

    try {
      await cambiarContrasena(contrasenaActual, contrasenaNueva);

      setContrasenaActual("");
      setContrasenaNueva("");
      setRepetirContrasena("");

      toast.exito("Contraseña cambiada correctamente.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardandoContrasena(false);
    }
  }

  async function manejarEliminacion(e) {
    e.preventDefault();

    const confirmar = window.confirm(
      "¿Estás seguro de que querés eliminar tu cuenta? " +
      "Se desactivará el acceso, se anonimizarán tus datos " +
      "y se eliminarán tus favoritos. Esta acción no se puede deshacer."
    );

    if (!confirmar) return;

    setEliminandoCuenta(true);

    try {
      await eliminarCuenta(contrasenaEliminar);

      logout();
      toast.info("Tu cuenta fue desactivada correctamente.");
      navegar("/nosotros", { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEliminandoCuenta(false);
    }
  }

  return (
    <div className="pagina">
      <h1>Mi cuenta</h1>
      <p className="subtitulo">
        Administrá tu contraseña y tu cuenta personal.
      </p>

      <section
        id="cambiar-contrasena"
        style={{ marginBottom: 36, scrollMarginTop: 24 }}
      >
        <h2>Cambiar contraseña</h2>

        <form
          onSubmit={manejarCambioContrasena}
          style={{
            display: "grid",
            gap: 14,
            maxWidth: 440,
          }}
        >
          <label>
            Contraseña actual
            <input
              type="password"
              autoComplete="current-password"
              value={contrasenaActual}
              onChange={(e) => setContrasenaActual(e.target.value)}
              required
            />
          </label>

          <label>
            Nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={contrasenaNueva}
              onChange={(e) => setContrasenaNueva(e.target.value)}
              required
            />
          </label>

          <label>
            Repetir nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={repetirContrasena}
              onChange={(e) => setRepetirContrasena(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="boton"
            disabled={guardandoContrasena}
          >
            {guardandoContrasena
              ? "Guardando..."
              : "Cambiar contraseña"}
          </button>
        </form>
      </section>

      <section
        id="eliminar-cuenta"
        style={{
          borderTop: "1px solid var(--borde, #ccc)",
          paddingTop: 24,
          scrollMarginTop: 24,
        }}
      >
        <h2>Eliminar cuenta</h2>

        <p>
          Tu cuenta se desactivará y tus datos personales se anonimizarán.
          El historial de préstamos se conservará y tus favoritos se eliminarán.
        </p>

        <form
          onSubmit={manejarEliminacion}
          style={{
            display: "grid",
            gap: 14,
            maxWidth: 440,
          }}
        >
          <label>
            Confirmá tu contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={contrasenaEliminar}
              onChange={(e) => setContrasenaEliminar(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="boton"
            disabled={eliminandoCuenta}
            style={{ background: "#c62828" }}
          >
            {eliminandoCuenta
              ? "Procesando..."
              : "Eliminar mi cuenta"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default Cuenta;
