import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { rolDe, useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

function Login() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [recordarme, setRecordarme] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const perfil = await login(email, contrasena, recordarme);
      toast.exito(`¡Hola, ${perfil.nombre}!`);
      // Si lo mandaron al login desde una página protegida, vuelve a ella.
      // Si no: el admin va al panel; el resto, al catálogo.
      const rol = rolDe(perfil);
      const porDefecto = rol === "admin" ? "/panel" : "/juegos";
      navegar(ubicacion.state?.desde ?? porDefecto, { replace: true });
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="pagina">
      <div className="tarjeta tarjeta-central">
        <h1 className="titulo-tarjeta">Iniciar sesión</h1>
        <p className="subtitulo">Bienvenido</p>

        <form className="formulario" onSubmit={manejarEnvio} aria-busy={enviando}>
          <div className="campo" style={{ textAlign: "left" }}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "error-login" : undefined}
              required
            />
          </div>

          <div className="campo" style={{ textAlign: "left" }}>
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "error-login" : undefined}
              required
            />
          </div>

          <div
            className="campo"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              fontSize: 13,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
                style={{ width: "auto" }}
              />
              Recordarme
            </label>
            <a href="#">¿Olvidaste tu contraseña?</a>
          </div>

          {error && (
            <span id="error-login" className="error" role="alert">
              {error}
            </span>
          )}

          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 13 }}>
          ¿No tenés cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;