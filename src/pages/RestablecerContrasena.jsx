import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { restablecerContrasena } from "../api/api.js";

// Enlace del correo (/restablecer?token=...): la persona elige su contraseña nueva.
function RestablecerContrasena() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [contrasena, setContrasena] = useState("");
  const [repetir, setRepetir] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");

  async function enviar(evento) {
    evento.preventDefault();
    setError("");

    if (contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (contrasena !== repetir) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);

    try {
      await restablecerContrasena(token, contrasena);
      setListo(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina">
      <div className="tarjeta tarjeta-central">
        <h1 className="titulo-tarjeta">Contraseña nueva</h1>

        {!token ? (
          <>
            <p className="error" role="alert">
              El enlace está incompleto. Pedí uno nuevo.
            </p>
            <p style={{ marginTop: 16, fontSize: 13 }}>
              <Link to="/recuperar">Pedir un enlace nuevo</Link>
            </p>
          </>
        ) : listo ? (
          <>
            <p role="status">
              Listo, ya podés iniciar sesión con tu contraseña nueva.
            </p>
            <p style={{ marginTop: 16, fontSize: 13 }}>
              <Link to="/login">Iniciar sesión</Link>
            </p>
          </>
        ) : (
          <>
            <form className="formulario" onSubmit={enviar} aria-busy={enviando}>
              <div className="campo" style={{ textAlign: "left" }}>
                <label htmlFor="contrasena">Contraseña nueva</label>
                <input
                  id="contrasena"
                  type="password"
                  autoComplete="new-password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  aria-describedby={error ? "error-restablecer" : undefined}
                  required
                  minLength={8}
                />
              </div>

              <div className="campo" style={{ textAlign: "left" }}>
                <label htmlFor="repetir">Repetí la contraseña</label>
                <input
                  id="repetir"
                  type="password"
                  autoComplete="new-password"
                  value={repetir}
                  onChange={(e) => setRepetir(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <span id="error-restablecer" className="error" role="alert">
                  {error}
                </span>
              )}

              <button type="submit" className="boton" disabled={enviando}>
                {enviando ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>

            {error.includes("venció") && (
              <p style={{ marginTop: 16, fontSize: 13 }}>
                <Link to="/recuperar">Pedir un enlace nuevo</Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default RestablecerContrasena;
