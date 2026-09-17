import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [recordarme, setRecordarme] = useState(false);

  function manejarEnvio(evento) {
    evento.preventDefault();
    // Todavía no hay backend conectado: esto se resuelve en la
    // Entrega 4 (JWT) y se conecta desde el frontend en la Entrega 5.
    console.log("Intento de login:", { email, contrasena, recordarme });
  }

  return (
    <div className="pagina">
      <div className="tarjeta tarjeta-central">
        <h2>Iniciar sesión</h2>
        <p className="subtitulo">Bienvenido de nuevo, ¡te esperábamos!</p>

        <form className="formulario" onSubmit={manejarEnvio}>
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
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
          </div>

          <div
            className="campo"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
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

          <button type="submit" className="boton">
            Iniciar sesión
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 13 }}>
          ¿No tenés cuenta? <a href="#">Crear cuenta</a>
        </p>
      </div>
    </div>
  );
}

export default Login;