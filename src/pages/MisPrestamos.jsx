
import { useEffect, useState } from "react";
import { listarMisPrestamos } from "../api/api.js";

function fechaArgentina(fecha) {
  if (!fecha) return "—";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return "—";

  return valor.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function MisPrestamos() {
  const [prestamos, setPrestamos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;

    listarMisPrestamos()
      .then((datos) => {
        if (vigente) {
          setPrestamos(Array.isArray(datos) ? datos : []);
        }
      })
      .catch((e) => {
        if (vigente) {
          setError(e.message || "No se pudo cargar tu historial.");
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  return (
    <main className="pagina">
      <h1>Mis préstamos</h1>
      <p>
        Consultá los juegos que retiraste y el estado de cada préstamo.
      </p>

      {cargando && <p role="status">Cargando historial...</p>}

      {!cargando && error && (
        <div role="alert">
          <p>No pudimos cargar tus préstamos.</p>
          <p>{error}</p>
        </div>
      )}

      {!cargando && !error && prestamos.length === 0 && (
        <p>Todavía no hay préstamos asociados a tu cuenta.</p>
      )}

      {!cargando && !error && prestamos.length > 0 && (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Juego</th>
                <th>Fecha del préstamo</th>
                <th>Fecha de devolución</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {prestamos.map((prestamo) => (
                <tr key={prestamo.id}>
                  <td>{prestamo.titulo_juego}</td>
                  <td>{fechaArgentina(prestamo.fecha_inicio)}</td>
                  <td>{fechaArgentina(prestamo.fecha_cierre)}</td>
                  <td>
                    {prestamo.estado === "activo"
                      ? "En préstamo"
                      : "Devuelto"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default MisPrestamos;
