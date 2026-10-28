import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cancelarReserva, listarMisReservas } from "../api/api.js";
import { partesFecha } from "../data/eventos.js";
import { useToast } from "../context/ToastContext.jsx";

const ETIQUETA_ESTADO = {
  activa: "Reservado",
  entregada: "Retirado",
  cancelada: "Cancelada",
  vencida: "Vencida",
};

function horaArgentina(fecha) {
  if (!fecha) return "";

  return new Date(fecha).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Salta",
  });
}

function MisReservas() {
  const toast = useToast();
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(null);

  async function cargar() {
    setError("");

    try {
      const datos = await listarMisReservas();
      setReservas(Array.isArray(datos) ? datos : []);
    } catch (e) {
      setError(e.message || "No se pudieron cargar tus reservas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function cancelar(reserva) {
    if (!window.confirm(`¿Cancelar la reserva de "${reserva.juego.titulo}"?`)) {
      return;
    }

    setOcupado(reserva.id);

    try {
      await cancelarReserva(reserva.id);
      toast.exito("Reserva cancelada.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      await cargar();
      setOcupado(null);
    }
  }

  return (
    <main className="pagina mis-prestamos">
      <h1>Mis reservas</h1>
      <p className="subtitle">
        Los juegos se retiran en el evento y en el lugar. Te guardamos la
        reserva hasta 30 minutos después de que empiece.
      </p>

      {cargando && (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando reservas...
        </p>
      )}

      {!cargando && error && (
        <div className="prestamos-error" role="alert">
          <strong>No pudimos cargar tus reservas.</strong>
          <span>{error}</span>
        </div>
      )}

      {!cargando && !error && reservas.length === 0 && (
        <div className="prestamos-vacio">
          <p className="prestamos-vacio-icono" aria-hidden="true">
            🎲
          </p>
          <p className="prestamos-vacio-titulo">Todavía no reservaste juegos</p>
          <p>
            Elegí un juego de la ludoteca en el <Link to="/juegos">catálogo</Link>{" "}
            y reservalo para el próximo evento.
          </p>
        </div>
      )}

      {!cargando && !error && reservas.length > 0 && (
        <ul className="prestamos-lista">
          {reservas.map((reserva) => {
            const activa = reserva.estado === "activa";
            const partes = partesFecha(reserva.evento?.fecha);

            return (
              <li
                key={reserva.id}
                className={`prestamo-item ${activa ? "activo" : "devuelto"}`}
              >
                <div className="prestamo-cabecera">
                  <h2 className="prestamo-titulo">{reserva.juego.titulo}</h2>
                  <span
                    className={`prestamo-estado ${activa ? "activo" : "devuelto"}`}
                  >
                    {ETIQUETA_ESTADO[reserva.estado] ?? reserva.estado}
                  </span>
                </div>

                <dl className="prestamo-fechas">
                  <div>
                    <dt>Evento</dt>
                    <dd>
                      {reserva.evento?.titulo}
                      {partes ? ` · ${partes.larga}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Lugar</dt>
                    <dd>
                      {reserva.evento?.lugar} · {reserva.evento?.direccion}
                    </dd>
                  </div>
                  {activa && reserva.espera_hasta && (
                    <div>
                      <dt>Te lo guardamos hasta</dt>
                      <dd>{horaArgentina(reserva.espera_hasta)} h</dd>
                    </div>
                  )}
                </dl>

                {activa && (
                  <button
                    type="button"
                    className="boton"
                    style={{ width: "auto", marginTop: 12 }}
                    disabled={ocupado === reserva.id}
                    onClick={() => cancelar(reserva)}
                  >
                    Cancelar reserva
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default MisReservas;
