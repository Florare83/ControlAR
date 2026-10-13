import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrarUsuario } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await registrarUsuario({ nombre, email, contrasena });
      await login(email, contrasena, false); // entra directo después de registrarse
      toast.exito("¡Cuenta creada! Ya iniciaste sesión.");
      navegar("/juegos");
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="pagina">
      <div className="tarjeta tarjeta-central">
        <h1 className="titulo-tarjeta">Crear cuenta</h1>

        <form className="formulario" onSubmit={manejarEnvio} aria-busy={enviando}>
          <div className="campo" style={{ textAlign: "left" }}>
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div className="campo" style={{ textAlign: "left" }}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={error ? "error-registro" : undefined}
              required
            />
          </div>

          <div className="campo" style={{ textAlign: "left" }}>
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              autoComplete="new-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              aria-describedby="ayuda-contrasena"
              required
              minLength={8}
              maxLength={128}
            />
            <small id="ayuda-contrasena" className="ayuda">
              Mínimo 8 caracteres.
            </small>
          </div>

          {error && (
            <span id="error-registro" className="error" role="alert">
              {error}
            </span>
          )}

          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 13 }}>
          ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default Registro;