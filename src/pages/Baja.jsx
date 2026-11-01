import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { darseDeBajaNovedades } from "../api/api.js";

// Enlace de baja de cada correo de novedades (/baja?token=...). No hace falta iniciar
// sesión. La baja se confirma con un botón: así los programas que abren los enlaces
// de los mails por su cuenta (antivirus, vistas previas) no dan de baja a nadie sin querer.
function Baja() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [estado, setEstado] = useState("inicial"); // inicial | enviando | listo | error
  const [error, setError] = useState("");

  async function confirmar() {
    setEstado("enviando");
    setError("");

    try {
      await darseDeBajaNovedades(token);
      setEstado("listo");
    } catch (e) {
      setError(e.message);
      setEstado("error");
    }
  }

  return (
    <div className="pagina">
      <div className="tarjeta tarjeta-central">
        <h1 className="titulo-tarjeta">Novedades por correo</h1>

        {!token ? (
          <p role="alert" className="error">
            El enlace está incompleto. Abrilo de nuevo desde el correo, o
            cambiá la suscripción desde <Link to="/cuenta/novedades">Mi cuenta</Link>.
          </p>
        ) : estado === "listo" ? (
          <>
            <p role="status">
              Listo, ya no vas a recibir más novedades por correo.
            </p>
            <p style={{ fontSize: 13 }}>
              Si cambiás de idea, podés volver a suscribirte desde{" "}
              <Link to="/cuenta/novedades">Mi cuenta &gt; Novedades</Link>.
            </p>
          </>
        ) : (
          <>
            <p>
              ¿Querés dejar de recibir los avisos de eventos y juegos nuevos de
              El Rincón de Hermes?
            </p>

            {estado === "error" && (
              <span className="error" role="alert">
                {error}
              </span>
            )}

            <button
              type="button"
              className="boton"
              onClick={confirmar}
              disabled={estado === "enviando"}
            >
              {estado === "enviando" ? "Procesando..." : "Darme de baja"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Baja;
