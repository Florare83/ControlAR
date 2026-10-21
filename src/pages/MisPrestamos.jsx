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

function diasDesde(fecha) {
  if (!fecha) return null;

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return null;

  const dias = Math.floor((Date.now() - valor.getTime()) / 86400000);

  return dias < 0 ? 0 : dias;
}

function textoDias(dias) {
  if (dias === null) return "";
  if (dias === 0) return "Retirado hoy";
  if (dias === 1) return "Hace 1 día";
  return `Hace ${dias} días`;
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

  const activos = prestamos.filter((p) => p.estado === "activo").length;
  const devueltos = prestamos.length - activos;

  return (
    <main className="pagina mis-prestamos">
      <h1>Mis préstamos</h1>
      <p className="subtitle">
        Consultá los juegos que retiraste y el estado de cada préstamo.
      </p>

      {cargando && (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando historial...
        </p>
      )}

      {!cargando && error && (
        <div className="prestamos-error" role="alert">
          <strong>No pudimos cargar tus préstamos.</strong>
          <span>{error}</span>
        </div>
      )}

      {!cargando && !error && prestamos.length === 0 && (
        <div className="prestamos-vacio">
          <p className="prestamos-vacio-icono" aria-hidden="true">
            🎲
          </p>
          <p className="prestamos-vacio-titulo">Todavía no tenés préstamos</p>
          <p>
            Cuando retires un juego del club, vas a verlo acá con su estado
            y sus fechas.
          </p>
        </div>
      )}

      {!cargando && !error && prestamos.length > 0 && (
        <>
          <dl className="prestamos-resumen">
            <div>
              <dd>{activos}</dd>
              <dt>{activos === 1 ? "En préstamo" : "En préstamo ahora"}</dt>
            </div>
            <div>
              <dd>{devueltos}</dd>
              <dt>{devueltos === 1 ? "Devuelto" : "Devueltos"}</dt>
            </div>
            <div>
              <dd>{prestamos.length}</dd>
              <dt>En total</dt>
            </div>
          </dl>

          <ul className="prestamos-lista">
            {prestamos.map((prestamo) => {
              const activo = prestamo.estado === "activo";
              const dias = activo ? diasDesde(prestamo.fecha_inicio) : null;

              return (
                <li
                  key={prestamo.id}
                  className={`prestamo-item ${activo ? "activo" : "devuelto"}`}
                >
                  <div className="prestamo-cabecera">
                    <h2 className="prestamo-titulo">
                      {prestamo.titulo_juego}
                    </h2>
                    <span
                      className={`prestamo-estado ${
                        activo ? "activo" : "devuelto"
                      }`}
                    >
                      {activo ? "En préstamo" : "Devuelto"}
                    </span>
                  </div>

                  <dl className="prestamo-fechas">
                    <div>
                      <dt>Retirado el</dt>
                      <dd>{fechaArgentina(prestamo.fecha_inicio)}</dd>
                    </div>
                    <div>
                      <dt>Devuelto el</dt>
                      <dd>
                        {activo
                          ? "Pendiente de devolución"
                          : fechaArgentina(prestamo.fecha_cierre)}
                      </dd>
                    </div>
                    {activo && dias !== null && (
                      <div>
                        <dt>Tiempo</dt>
                        <dd>{textoDias(dias)}</dd>
                      </div>
                    )}
                  </dl>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}

export default MisPrestamos;
