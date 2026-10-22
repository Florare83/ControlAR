import { useState } from "react";
import { Link } from "react-router-dom";
import grupo from "../img/grupo.jpeg";
import { partesFecha, proximoEvento } from "../data/eventos.js";

// Datos destacados (franja debajo de la portada).
const estadisticas = [
  { valor: "2017", texto: "El año en que empezamos" },
  { valor: "9 años", texto: "de juntadas y comunidad" },
  { valor: "1 por mes", texto: "Juntada mensual, sábado o domingo" },
  { valor: "$2.000", texto: "Aporte mínimo en las tardes de juegos" },
];

// Qué se puede esperar del club.
const ventajas = [
  {
    icono: "🎲",
    titulo: "Para todos los niveles",
    texto:
      "Venís a jugar, aprender y descubrir juegos modernos, cualquiera sea tu experiencia.",
  },
  {
    icono: "🤝",
    titulo: "Tiempo compartido",
    texto:
      "Un espacio cómodo para charlar, reírte y conocer gente alrededor de una mesa.",
  },
  {
    icono: "📚",
    titulo: "Ludoteca en crecimiento",
    texto:
      "Sumamos juegos nuevos y podés pedir préstamos durante los eventos.",
  },
  {
    icono: "💛",
    titulo: "Tu aporte sostiene el club",
    texto:
      "Ayuda a mantener el espacio y cuidar los juegos. Menores de 8 años, jubilados y matriculados del COPAIPA ingresan sin cargo.",
  },
];

// Pasos para sumarse.
const pasos = [
  {
    titulo: "Elegí un evento",
    texto: "Mirá las próximas actividades en la sección Club.",
  },
  {
    titulo: "Revisá lo que necesitás",
    texto:
      "Las tardes de juegos no necesitan reserva, pero sí un aporte mínimo que se abona al ingresar. Para los torneos pedimos inscripción previa, con un valor propio.",
  },
  {
    titulo: "Venite a jugar",
    texto: "Acercate el día del evento y sumate a una mesa.",
  },
];

// Preguntas frecuentes. Cada una tiene su pregunta y su respuesta.
const preguntas = [
  {
    pregunta: "¿Cuándo se juntan a jugar juegos de mesa?",
    respuesta:
      "Organizamos una juntada mensual que siempre cae un sábado o domingo.",
  },
  {
    pregunta: "¿Para asistir a los eventos debo pagar algo?",
    respuesta:
      "En las tardes de juegos el ingreso tiene un aporte mínimo de $2.000 por persona. Ese aporte nos ayuda a sostener el espacio, cuidar los juegos y mantener estas actividades. Se abona al ingresar, solo si hay lugar para jugar, por transferencia o en efectivo.",
  },
  {
    pregunta: "¿Hacen torneos?",
    respuesta:
      "Sí, hacemos torneos de Catan y de Carcassonne, entre otros, y avisamos con tiempo sobre estos eventos. Tienen inscripción previa y un valor de inscripción propio, distinto al aporte de las tardes de juegos, que se informa en cada torneo.",
  },
  {
    pregunta: "¿Quiénes ingresan sin cargo?",
    respuesta:
      "Ingresan sin cargo los menores de 8 años, los jubilados y los matriculados del COPAIPA.",
  },
  {
    pregunta: "¿Pueden venir menores de edad?",
    respuesta:
      "Sí, pero deben estar acompañados por un adulto responsable durante toda la tarde. No pueden quedar solos, sin excepción.",
  },
  {
    pregunta: "¿Puedo pedir préstamos de juegos?",
    respuesta:
      "Sí, pero cabe aclarar que el préstamo sólo se realiza en los eventos y en el lugar destinado a los mismos, no fuera de ellos.",
  },
  {
    pregunta: "¿Cómo reservo una mesa para un evento?",
    respuesta:
      "En el caso de las tardes de juegos no hay reserva, sólo basta con asistir directamente. En cambio, en el caso de los torneos se solicita inscripción previa.",
  },
];

function Nosotros() {
  // Guardamos qué pregunta está abierta. Si es null, están todas cerradas.
  const [abierta, setAbierta] = useState(null);

  const proximo = proximoEvento();
  const partesProximo = proximo ? partesFecha(proximo.fechaISO) : null;

  function alternar(indice) {
    // Si tocan la que ya está abierta, la cerramos (null).
    // Si tocan otra, esa pasa a ser la abierta.
    setAbierta(abierta === indice ? null : indice);
  }

  return (
    <div className="pagina nos">
      {/* Portada */}
      <header className="pg-hero">
        <p className="pg-hero-etiqueta">
          Club de juegos de mesa modernos · Salta
        </p>
        <h1>Quiénes somos</h1>
        <p className="pg-hero-texto">
          El Rincón de Hermes es un club pensado para reunir a la comunidad a
          pasar un rato socializando, compartiendo y disfrutando, cualquiera
          sea tu nivel de experiencia.
        </p>

        {proximo && partesProximo && (
          <Link to="/club" className="pg-proximo">
            <span className="pg-proximo-etiqueta">Próximo evento</span>
            <span className="pg-proximo-texto">
              {proximo.titulo} · {partesProximo.larga} · {proximo.hora}
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        )}

        <div className="pg-hero-acciones">
          <Link to="/club" className="pg-boton pg-boton-claro">
            Ver próximos eventos
          </Link>
          <Link to="/juegos" className="pg-boton pg-boton-borde">
            Explorar juegos
          </Link>
        </div>
      </header>

      {/* Datos destacados */}
      <ul className="nos-datos" aria-label="El club en números">
        {estadisticas.map((dato) => (
          <li key={dato.valor}>
            <strong>{dato.valor}</strong>
            <span>{dato.texto}</span>
          </li>
        ))}
      </ul>

      {/* Historia */}
      <section className="pg-seccion nos-historia">
        <div className="nos-historia-texto">
          <h2 className="pg-titulo">Nuestra historia</h2>
          <p>
            Nuestra misión es acercar el juego de mesa como una forma de
            compartir tiempo real con otras personas, en un espacio cómodo y
            con una ludoteca que sigue creciendo.
          </p>
          <p>
            Iniciamos en el año 2017 y este año, en octubre, ¡cumplimos 9
            años!
          </p>
        </div>

        <figure className="nos-historia-imagen">
          <img src={grupo} alt="Equipo del Rincón de Hermes" loading="lazy" />
          <figcaption>El equipo del Rincón de Hermes</figcaption>
        </figure>
      </section>

      {/* Qué podés esperar */}
      <section className="pg-seccion">
        <h2 className="pg-titulo">Qué podés esperar</h2>

        <ul className="nos-ventajas">
          {ventajas.map((v) => (
            <li key={v.titulo} className="nos-ventaja">
              <span className="nos-ventaja-icono" aria-hidden="true">
                {v.icono}
              </span>
              <h3>{v.titulo}</h3>
              <p>{v.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Cómo sumarte */}
      <section className="pg-seccion">
        <h2 className="pg-titulo">Cómo sumarte</h2>

        <ol className="nos-pasos">
          {pasos.map((paso, indice) => (
            <li key={paso.titulo} className="nos-paso">
              <span className="nos-paso-numero" aria-hidden="true">
                {indice + 1}
              </span>
              <div>
                <h3>{paso.titulo}</h3>
                <p>{paso.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Preguntas frecuentes */}
      <section className="pg-seccion">
        <h2 className="pg-titulo">Preguntas frecuentes</h2>

        <div className="nos-faq">
          {preguntas.map((item, indice) => {
            const estaAbierta = abierta === indice;
            const idBoton = `faq-boton-${indice}`;
            const idPanel = `faq-panel-${indice}`;

            return (
              <div className="acordeon-item" key={item.pregunta}>
                <h3 className="nos-faq-pregunta">
                  <button
                    type="button"
                    id={idBoton}
                    className="acordeon-pregunta"
                    aria-expanded={estaAbierta}
                    aria-controls={idPanel}
                    onClick={() => alternar(indice)}
                  >
                    {item.pregunta}
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
                  <p className="acordeon-respuesta">{item.respuesta}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cierre */}
      <aside className="pg-cierre">
        <div>
          <h2>¿Te quedó alguna duda?</h2>
          <p>Escribinos y te respondemos.</p>
        </div>

        <Link to="/contacto" className="pg-boton pg-boton-claro">
          Contactanos
        </Link>
      </aside>
    </div>
  );
}

export default Nosotros;
