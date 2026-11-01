import { useState } from "react";
import { Link } from "react-router-dom";
import { pedirRecuperacion } from "../api/api.js";

// «Olvidé mi contraseña»: la persona escribe su correo y le llega un enlace.
// La respuesta es siempre la misma, exista o no la cuenta (no se revela quién está registrado).
function RecuperarContrasena() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    setEnviando(true);

    try {
      await pedirRecuperacion(email.trim());
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
        <h1 className="titulo-tarjeta">Recuperar contraseña</h1>

        {listo ? (
          <>
            <p role="status">
              Si el correo está registrado, te mandamos un enlace para elegir una
              contraseña nueva. Revisá también la carpeta de spam. El enlace vale
              1 hora.
            </p>
            <p style={{ marginTop: 16, fontSize: 13 }}>
              <Link to="/login">Volver a iniciar sesión</Link>
            </p>
          </>
        ) : (
          <>
            <p className="subtitulo">
              Escribí el correo de tu cuenta y te mandamos un enlace para elegir
              una contraseña nueva.
            </p>

            <form className="formulario" onSubmit={enviar} aria-busy={enviando}>
              <div className="campo" style={{ textAlign: "left" }}>
                <label htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? "true" : undefined}
                  aria-describedby={error ? "error-recuperar" : undefined}
                  required
                />
              </div>

              {error && (
                <span id="error-recuperar" className="error" role="alert">
                  {error}
                </span>
              )}

              <button type="submit" className="boton" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviarme el enlace"}
              </button>
            </form>

            <p style={{ marginTop: 16, fontSize: 13 }}>
              <Link to="/login">Volver a iniciar sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default RecuperarContrasena;
