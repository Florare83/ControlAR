import { useState } from "react";
import { Link } from "react-router-dom";
import { cambiarContrasena } from "../api/api.js";
import { useToast } from "../context/ToastContext.jsx";

function CambiarContrasena() {
  const toast = useToast();

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(e) {
    e.preventDefault();
    setError("");

    if (nueva.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (nueva !== confirmacion) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    if (actual === nueva) {
      setError("La nueva contraseña debe ser diferente de la actual.");
      return;
    }

    setCargando(true);

    try {
      await cambiarContrasena(actual, nueva);
      setActual("");
      setNueva("");
      setConfirmacion("");
      toast.exito("La contraseña se cambió correctamente.");
    } catch (e) {
      setError(e.message || "No se pudo cambiar la contraseña.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="pagina">
      <h1>🔑 Cambiar contraseña</h1>
      <p className="subtitulo">
        Ingresá tu contraseña actual y elegí una nueva.
      </p>

      <form onSubmit={guardar} className="formulario">
        <div className="campo">
          <label htmlFor="contrasena-actual">Contraseña actual</label>
          <input
            id="contrasena-actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="contrasena-nueva">Nueva contraseña</label>
          <input
            id="contrasena-nueva"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            minLength={8}
            required
          />
          <small>Debe tener al menos 8 caracteres.</small>
        </div>

        <div className="campo">
          <label htmlFor="confirmar-contrasena">
            Repetir nueva contraseña
          </label>
          <input
            id="confirmar-contrasena"
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            minLength={8}
            required
          />
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="boton" disabled={cargando}>
          {cargando ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>

      <p>
        <Link to="/cuenta">Volver a Mi cuenta</Link>
      </p>
    </section>
  );
}

export default CambiarContrasena;