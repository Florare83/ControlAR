import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { eliminarCuenta } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

function EliminarCuenta() {
  const [contrasena, setContrasena] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const { logout } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();

  async function eliminar(e) {
    e.preventDefault();
    setError("");

    if (!confirmado) {
      setError("Debés confirmar que querés eliminar tu cuenta.");
      return;
    }

    const acepto = window.confirm(
      "¿Estás seguro de que querés eliminar tu cuenta? Esta acción no se puede deshacer."
    );

    if (!acepto) return;

    setCargando(true);

    try {
      await eliminarCuenta(contrasena);
      logout();
      toast.info("Tu cuenta fue eliminada.");
      navegar("/login", { replace: true });
    } catch (e) {
      setError(e.message || "No se pudo eliminar la cuenta.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="pagina">
      <h1>🗑️ Eliminar cuenta</h1>

      <p className="subtitulo">
        Esta opción elimina el acceso a tu cuenta. La acción no se puede
        deshacer.
      </p>

      <form onSubmit={eliminar} className="formulario">
        <div className="campo">
          <label htmlFor="contrasena-eliminar">
            Confirmá tu contraseña
          </label>
          <input
            id="contrasena-eliminar"
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label>
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              required
            />{" "}
            Entiendo que quiero eliminar mi cuenta y que no podré
            iniciar sesión con ella.
          </label>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="boton"
          disabled={cargando || !confirmado || !contrasena}
          style={{ background: "#c62828" }}
        >
          {cargando ? "Eliminando cuenta..." : "Eliminar mi cuenta"}
        </button>
      </form>

      <p>
        <Link to="/cuenta">Cancelar y volver a Mi cuenta</Link>
      </p>
    </section>
  );
}

export default EliminarCuenta;