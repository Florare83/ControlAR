import { useState } from "react";
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

// Imagen opcional del encabezado: se toma de src/img/club.(jpg, jpeg, png, webp o avif).
// Si el archivo no existe, el encabezado se muestra sin imagen.
const imagenesClub = import.meta.glob(
  "../img/club.{jpg,jpeg,png,webp,avif}",
  { eager: true, import: "default" }
);
const imagenClub = Object.values(imagenesClub)[0];

// Todo lo que hay que saber antes de venir. Es el ÚNICO lugar del sitio donde se
// explican precios, reservas, préstamos y reglas con menores (Nosotros no los repite).
// Se muestran como acordeón.
const guia = [
  {
    icono: "💲",
    pregunta: "¿Cuánto cuesta venir?",
    contenido: (
      <>
        <p>
          Las tardes de juegos tienen un aporte mínimo por persona. El monto
          figura en cada evento.
        </p>
        <p>
          Se abona al ingresar, solo si hay lugar para jugar, por transferencia
          o en efectivo. Ese aporte nos ayuda a sostener el espacio, cuidar los
          juegos y mantener estas actividades.
        </p>
        <p>
          Ingresan sin cargo los menores de 8 años, los jubilados y los
          matriculados del COPAIPA.
        </p>
      </>
    ),
  },
  {
    icono: "🎟️",
    pregunta: "¿Hay que reservar lugar?",
    contenido: (
      <p>
        Para las tardes de juegos, no: alcanza con venir. Los torneos son la
        excepción, porque piden inscripción previa.
      </p>
    ),
  },
  {
    icono: "📚",
    pregunta: "¿Puedo pedir juegos prestados?",
    contenido: (
      <>
        <p>
          Sí, pero solo durante los eventos y en el lugar, no fuera de ellos.
        </p>
        <p>
          Si tenés cuenta, también podés reservar un juego de la ludoteca desde
          el <Link to="/juegos">catálogo</Link>, hasta las 20:00 del día
          anterior. Lo retirás en el evento y te lo guardamos hasta 30 minutos
          después de que empiece.
        </p>
      </>
    ),
  },
  {
    icono: "👨‍👧",
    pregunta: "¿Pueden venir menores de edad?",
    alerta: true,
    contenido: (
      <p>
        Sí, pero deben estar acompañados por un adulto responsable durante toda
        la tarde. No pueden quedar solos, sin excepción.
      </p>
    ),
  },
  {
    icono: "🎉",
    pregunta: "¿Pueden contratarlos para un evento o festejo?",
    contenido: (
      <>
        <p>
          Sí. Además de nuestras juntadas, podés contratarnos para que tu propio
          encuentro tenga una tarde de juegos de mesa: cumpleaños, festejos
          entre amigos o en familia, after office, reuniones de equipo y mucho
          más.
        </p>
        <p>
          <Link to="/contacto">Escribinos</Link> contándonos qué querés
          celebrar, la fecha, el lugar y cuántas personas serían, y coordinamos
          los detalles juntos.
        </p>
      </>
    ),
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
                  "Inscripción con valor propio"}
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
  // Qué pregunta de "Antes de venir" está abierta (null = todas cerradas).
  const [abierta, setAbierta] = useState(null);
  const { eventos, cargando, error } = useEventos();
  const { proximos, anteriores } = clasificarEventos(eventos);
  const mostrarAviso = avisoVigente();

  // Los torneos tienen su propia sección (con otro valor de inscripción).
  const proximosEventos = proximos.filter((e) => e.tipo !== "Torneo");
  const proximosTorneos = proximos.filter((e) => e.tipo === "Torneo");

  return (
    <div className="pagina club">
      {/* Portada */}
      <header className={`pg-hero${imagenClub ? " pg-hero-con-imagen" : ""}`}>
        <div className="pg-hero-contenido">
          <h1>Club</h1>
          <p className="pg-hero-texto">
            Una juntada por mes, siempre un sábado o domingo. Acá encontrás la
            agenda y lo que tenés que saber antes de venir.
          </p>

          <div className="pg-hero-acciones">
            <a href="#proximos" className="pg-boton pg-boton-claro">
              Ver próximos eventos
            </a>
            <a href="#torneos" className="pg-boton pg-boton-borde">
              Torneos
            </a>
            <a href="#antes-de-venir" className="pg-boton pg-boton-borde">
              Antes de venir
            </a>
          </div>
        </div>

        {imagenClub && (
          <figure className="pg-hero-imagen">
            <img
              src={imagenClub}
              alt="El Rincón de Hermes: tarde de juegos en el club"
            />
          </figure>
        )}
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
              Estamos organizando el próximo.{" "}
              <Link to="/contacto">Escribinos</Link> si querés que te avisemos.
            </p>
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
          <div className="club-vacio">
            <p>
              <strong>Por ahora no hay torneos programados.</strong>
            </p>
            <p>
              Hacemos torneos de Catan y de Carcassonne, entre otros, y avisamos
              con tiempo. Tienen inscripción previa y un valor propio, que se
              informa en cada torneo.
            </p>
          </div>
        ) : (
          <div className="club-lista">
            {proximosTorneos.map((evento) => (
              <TarjetaEvento key={evento.id} evento={evento} />
            ))}
          </div>
        )}
      </section>

      {/* Todo lo que hay que saber */}
      <section className="pg-seccion" id="antes-de-venir">
        <h2 className="pg-titulo">Antes de venir</h2>

        <div className="nos-faq club-acordeon">
          {guia.map((item, indice) => {
            const estaAbierta = abierta === indice;
            const idBoton = `guia-boton-${indice}`;
            const idPanel = `guia-panel-${indice}`;

            return (
              <div
                className={`acordeon-item${item.alerta ? " club-acordeon-alerta" : ""}`}
                key={item.pregunta}
              >
                <h3 className="nos-faq-pregunta">
                  <button
                    type="button"
                    id={idBoton}
                    className="acordeon-pregunta"
                    aria-expanded={estaAbierta}
                    aria-controls={idPanel}
                    onClick={() => setAbierta(estaAbierta ? null : indice)}
                  >
                    <span className="club-acordeon-titulo">
                      <span aria-hidden="true">{item.icono}</span>
                      {item.pregunta}
                    </span>
                    <span className="nos-faq-icono" aria-hidden="true">
                      {estaAbierta ? "−" : "+"}
                    </span>
                  </button>
                </h3>

                <div
                  id={idPanel}
                  role="region"
                  aria-labelledby={idBoton}
                  hidden={!estaAbierta}
                >
                  <div className="acordeon-respuesta">{item.contenido}</div>
                </div>
              </div>
            );
          })}
        </div>
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
