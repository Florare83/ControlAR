import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrarUsuario } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { login } = useAuth();
  const navegar = useNavigate();

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await registrarUsuario({ nombre, email, contrasena });
      await login(email, contrasena, false); // entra directo después de registrarse
      navegar("/juegos");
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina">
      <div className="tarjeta tarjeta-central">
        <h2>Crear cuenta</h2>

        <form className="formulario" onSubmit={manejarEnvio}>
          <div className="campo" style={{ textAlign: "left" }}>
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="campo" style={{ textAlign: "left" }}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="campo" style={{ textAlign: "left" }}>
            <label htmlFor="contrasena">Contraseña (mínimo 8 caracteres)</label>
            <input
              id="contrasena"
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <span className="error">{error}</span>}

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
