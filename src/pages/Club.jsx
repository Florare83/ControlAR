import { Link } from "react-router-dom";
import {
  aviso,
  avisoVigente,
  clasificarEventos,
  imagenGenerica,
  inicioDeHoy,
  partesFecha,
} from "../data/eventos.js";
import { useEventos } from "../hooks/useEventos.js";

// Lo que hay que saber antes de venir a una tarde de juegos.
const reglas = [
  {
    icono: "💲",
    titulo: "Tardes de juegos: aporte mínimo",
    texto:
      "Por persona y sin reserva previa. El monto figura en cada evento. Tu aporte nos ayuda a sostener el espacio, cuidar los juegos y mantener estas actividades.",
  },
  {
    icono: "💳",
    titulo: "Cómo se abona",
    texto:
      "Al ingresar y solo si hay lugar para jugar. Podés pagar por transferencia o en efectivo.",
  },
  {
    icono: "🎟️",
    titulo: "Ingresan sin cargo",
    texto: "Menores de 8 años, jubilados y matriculados del COPAIPA.",
  },
  {
    icono: "👨‍👧",
    titulo: "Jugamos y nos cuidamos",
    texto:
      "Los menores de edad deben estar acompañados por un adulto responsable durante toda la tarde. No pueden quedar solos, sin excepción.",
    alerta: true,
  },
  {
    icono: "🏆",
    titulo: "Torneos",
    texto:
      "Piden inscripción previa y tienen un valor de inscripción propio, distinto al aporte de las tardes de juegos. Se informa en cada torneo.",
  },
  {
    icono: "📚",
    titulo: "Préstamos",
    texto: "Los juegos se prestan sólo durante los eventos y en el lugar.",
  },
  {
    icono: "🎲",
    titulo: "Reservá tu juego",
    texto:
      "Si tenés cuenta, podés reservar un juego de la ludoteca desde el catálogo, hasta las 20:00 del día anterior. Lo retirás en el evento y te lo guardamos hasta 30 minutos después de que empiece.",
  },
];

function enlaceMapa(evento) {
  const consulta = `${evento.lugar}, ${evento.direccion}, Salta, Argentina`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    consulta
  )}`;
}

// "¡Hoy!", "¡Mañana!" o "¡Este domingo!" si el evento es esta semana.
function etiquetaCercania(partes, hoy) {
  if (!partes) return "";

  const dias = Math.round((partes.fecha - hoy) / 86400000);

  if (dias === 0) return "¡Hoy!";
  if (dias === 1) return "¡Mañana!";
  if (dias > 1 && dias <= 6) return `¡Este ${partes.diaSemana}!`;

  return "";
}

function TarjetaEvento({ evento, pasado = false, destacado = false }) {
  const hoy = inicioDeHoy();
  const partes = partesFecha(evento.fechaISO);
  const mes = partes ? partes.mes : evento.mesCorto || "";
  const dia = partes ? partes.dia : "—";
  const fechaTexto = partes ? partes.larga : evento.fechaTexto || "A confirmar";
  const cercania = !pasado ? etiquetaCercania(partes, hoy) : "";

  const imagen = (
    <img
      src={evento.imagen || imagenGenerica}
      alt={evento.imagenAlt || ""}
      loading="lazy"
    />
  );

  return (
    <article
      className={`club-evento${pasado ? " pasado" : ""}${
        destacado ? " destacado" : ""
      }`}
    >
      <div className="club-fecha" aria-hidden="true">
        <span className="club-fecha-mes">{mes}</span>
        <span className="club-fecha-dia">{dia}</span>
      </div>

      <div className="club-evento-cuerpo">
        <div className="club-etiquetas">
          {cercania && (
            <span className="club-tag club-tag-destacado">{cercania}</span>
          )}

          <span className="club-tag">{evento.tipo}</span>

          {evento.inscripcion && !pasado && (
            <span className="club-tag club-tag-aviso">Inscripción previa</span>
          )}

          {pasado && <span className="club-tag club-tag-gris">Finalizado</span>}
        </div>

        <h3>{evento.titulo}</h3>
        <p className="club-descripcion">{evento.descripcion}</p>

        <ul className="club-datos">
          <li>
            <span aria-hidden="true">📅</span>
            <span>
              <span className="solo-lectores">Fecha: </span>
              {fechaTexto}
            </span>
          </li>
          <li>
            <span aria-hidden="true">🕔</span>
            <span>
              <span className="solo-lectores">Horario: </span>
              {evento.hora}
            </span>
          </li>
          <li>
            <span aria-hidden="true">📍</span>
            <span>
              <span className="solo-lectores">Lugar: </span>
              {evento.lugar} · {evento.direccion}
            </span>
          </li>
          {!pasado && (evento.aporte || evento.tipo === "Torneo") && (
            <li>
              <span aria-hidden="true">💲</span>
              <span>
                {evento.aporte ||
                  "Inscripción con valor propio, distinto al de las tardes de juegos"}
              </span>
            </li>
          )}
        </ul>

        <div className="club-acciones">
          <a
            className="pg-boton pg-boton-azul"
            href={enlaceMapa(evento)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Cómo llegar
            <span className="solo-lectores"> (se abre en una pestaña nueva)</span>
          </a>

          {evento.inscripcion && !pasado && (
            <Link to="/contacto" className="pg-boton pg-boton-contorno">
              Consultar inscripción
            </Link>
          )}
        </div>
      </div>

      <div className="club-evento-media">
        {evento.imagen ? (
          <a
            href={evento.imagen}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver flyer en tamaño completo"
          >
            {imagen}
            <span className="solo-lectores">
              Ver flyer en tamaño completo (se abre en una pestaña nueva)
            </span>
          </a>
        ) : (
          imagen
        )}
      </div>
    </article>
  );
}

function Club() {
  const { eventos, cargando, error } = useEventos();
  const { proximos, anteriores } = clasificarEventos(eventos);
  const mostrarAviso = avisoVigente();

  // Los torneos tienen su propia sección (con otro valor de inscripción).
  const proximosEventos = proximos.filter((e) => e.tipo !== "Torneo");
  const proximosTorneos = proximos.filter((e) => e.tipo === "Torneo");

  return (
    <div className="pagina club">
      {/* Portada */}
      <header className="pg-hero">
        <p className="pg-hero-etiqueta">Agenda del club</p>
        <h1>Club</h1>
        <p className="pg-hero-texto">
          Próximas actividades y eventos organizados por El Rincón de Hermes.
        </p>

        <div className="pg-hero-acciones">
          <a href="#proximos" className="pg-boton pg-boton-claro">
            Ver próximos eventos
          </a>
          <a href="#torneos" className="pg-boton pg-boton-borde">
            Torneos
          </a>
        </div>
      </header>

      {/* Próximos eventos */}
      <section className="pg-seccion" id="proximos">
        <h2 className="pg-titulo">Próximos eventos</h2>

        {mostrarAviso && (
          <div className="club-aviso" role="note">
            <span aria-hidden="true">📢</span>
            <p>
              <strong>Importante: </strong>
              {aviso.texto}
            </p>
          </div>
        )}

        {cargando ? (
          <p className="cargando" role="status">
            <span className="spinner" aria-hidden="true" />
            Cargando eventos...
          </p>
        ) : error ? (
          <p className="error" role="alert">
            No pudimos cargar los eventos. {error}
          </p>
        ) : proximosEventos.length === 0 ? (
          <div className="club-vacio">
            <p>
              <strong>Por ahora no hay eventos programados.</strong>
            </p>
            <p>
              Estamos organizando el próximo. Escribinos si querés que te
              avisemos.
            </p>
            <Link to="/contacto" className="pg-boton pg-boton-azul">
              Contactanos
            </Link>
          </div>
        ) : (
          <div className="club-lista">
            {proximosEventos.map((evento, indice) => (
              <TarjetaEvento
                key={evento.id}
                evento={evento}
                destacado={indice === 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Torneos */}
      <section className="pg-seccion" id="torneos">
        <h2 className="pg-titulo">Torneos</h2>

        {proximosTorneos.length === 0 ? (
          <div className="club-torneos-vacio">
            <span className="club-torneos-icono" aria-hidden="true">
              🏆
            </span>

            <div>
              <p>
                <strong>Por ahora no hay torneos programados.</strong>
              </p>
              <p>
                Hacemos torneos de Catan y de Carcassonne, entre otros.
                Avisamos con tiempo sobre estos eventos.
              </p>
              <p className="club-torneos-nota">
                Los torneos tienen inscripción previa y un valor de
                inscripción propio, que se informa en cada uno.
              </p>
            </div>
          </div>
        ) : (
          <div className="club-lista">
            {proximosTorneos.map((evento) => (
              <TarjetaEvento key={evento.id} evento={evento} />
            ))}
          </div>
        )}
      </section>

      {/* Lo que hay que saber */}
      <section className="pg-seccion" id="antes-de-venir">
        <h2 className="pg-titulo">Antes de venir</h2>

        <ul className="club-info">
          {reglas.map((regla) => (
            <li
              key={regla.titulo}
              className={regla.alerta ? "club-info-alerta" : ""}
            >
              <span className="club-info-icono" aria-hidden="true">
                {regla.icono}
              </span>
              <div>
                <strong>{regla.titulo}</strong>
                <span>{regla.texto}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Eventos anteriores */}
      {anteriores.length > 0 && (
        <details className="club-anteriores">
          <summary>Eventos anteriores ({anteriores.length})</summary>

          <div className="club-lista">
            {anteriores.map((evento) => (
              <TarjetaEvento key={evento.id} evento={evento} pasado />
            ))}
          </div>
        </details>
      )}

      {/* Cierre */}
      <aside className="pg-cierre">
        <div>
          <h2>¿Tenés dudas sobre algún evento?</h2>
          <p>Escribinos y te contamos todo.</p>
        </div>

        <Link to="/contacto" className="pg-boton pg-boton-claro">
          Contactanos
        </Link>
      </aside>
    </div>
  );
}

export default Club;
