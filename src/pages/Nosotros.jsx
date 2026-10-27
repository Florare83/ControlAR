import { Link } from "react-router-dom";
import grupo from "../img/grupo.jpeg";
import { partesFecha, proximoEvento } from "../data/eventos.js";
import { useEventos } from "../hooks/useEventos.js";
import JuegosPopulares from "../components/JuegosPopulares.jsx";

const ANIO_FUNDACION = 2017;

// Esta página cuenta quiénes somos. Todo lo práctico (precios, reglas, reservas,
// préstamos, menores) vive en la página Club, para no repetirlo en dos lugares.
function Nosotros() {
  const { eventos } = useEventos();
  const proximo = proximoEvento(eventos);
  const partesProximo = proximo ? partesFecha(proximo.fechaISO) : null;

  // Se calcula solo, así el texto no queda desactualizado el año que viene.
  const anios = new Date().getFullYear() - ANIO_FUNDACION;

  return (
    <div className="pagina nos">
      {/* Portada: quiénes somos + la foto del grupo */}
      <header className="pg-hero">
        <div className="nos-portada-texto">
          <h1>Quiénes somos</h1>
          <p className="pg-hero-texto">
            El Rincón de Hermes es un club de juegos de mesa modernos de Salta,
            pensado para reunir a la comunidad a pasar un rato socializando,
            compartiendo y disfrutando, cualquiera sea tu nivel de experiencia.
          </p>

          {proximo && partesProximo && (
            <Link to="/club" className="pg-proximo">
              <span className="pg-proximo-etiqueta">Próximo evento</span>
              <span className="pg-proximo-texto">
                {proximo.titulo} · {partesProximo.larga} · {proximo.hora}{" "}
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          )}

          <div className="pg-hero-acciones">
            {!proximo && (
              <Link to="/club" className="pg-boton pg-boton-claro">
                Ver el club
              </Link>
            )}
            <Link
              to="/juegos"
              className={`pg-boton ${proximo ? "pg-boton-claro" : "pg-boton-borde"}`}
            >
              Explorar juegos
            </Link>
          </div>
        </div>

        <figure className="nos-portada-foto">
          <img src={grupo} alt="Equipo del Rincón de Hermes" />
          <figcaption>El equipo del Rincón de Hermes</figcaption>
        </figure>
      </header>

      {/* Historia */}
      <section className="pg-seccion nos-historia">
        <h2 className="pg-titulo">Nuestra historia</h2>

        <div className="nos-historia-cuerpo">
          <p className="nos-historia-destacado">
            Empezamos en {ANIO_FUNDACION} y este año, en octubre, ¡cumplimos{" "}
            {anios} años!
          </p>
          <p>
            Nuestra misión es acercar el juego de mesa como una forma de
            compartir tiempo real con otras personas, en un espacio cómodo y con
            una ludoteca que sigue creciendo.
          </p>
        </div>
      </section>

      {/* Los 2 juegos más populares de la tienda (se actualizan solos) */}
      <JuegosPopulares />

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
