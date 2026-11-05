import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  agregarFavorito,
  listarFavoritos,
  listarJuegosNovedades,
  quitarFavorito,
} from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import TarjetaJuego from "./TarjetaJuego.jsx";

const CANTIDAD = 3;

// Los últimos juegos cargados al catálogo, para mostrar en la portada.
// Se piden al servidor cada vez que se abre la página, así que un juego nuevo
// aparece solo (y el más viejo de los tres sale). Si no hay juegos, no se muestra.
function JuegosNovedades() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();

  const [juegos, setJuegos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [favoritos, setFavoritos] = useState([]);
  const [cargandoFavoritos, setCargandoFavoritos] = useState(false);

  useEffect(() => {
    let vigente = true;

    listarJuegosNovedades(CANTIDAD)
      .then((lista) => {
        if (vigente) setJuegos(Array.isArray(lista) ? lista : []);
      })
      .catch(() => {
        if (vigente) setJuegos([]);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  // Para pintar el corazón de los que ya son favoritos de esta persona.
  useEffect(() => {
    let vigente = true;

    if (!usuario) {
      setFavoritos([]);
      return undefined;
    }

    setCargandoFavoritos(true);
    listarFavoritos()
      .then((ids) => {
        if (vigente) setFavoritos(Array.isArray(ids) ? ids : []);
      })
      .catch(() => {
        if (vigente) setFavoritos([]);
      })
      .finally(() => {
        if (vigente) setCargandoFavoritos(false);
      });

    return () => {
      vigente = false;
    };
  }, [usuario]);

  async function alternarFavorito(juego) {
    if (!usuario) {
      toast.info("Iniciá sesión para guardar tus juegos favoritos.");
      navegar("/login");
      return;
    }

    const yaEsFavorito = favoritos.includes(juego.id);

    try {
      if (yaEsFavorito) {
        await quitarFavorito(juego.id);
        setFavoritos((actuales) => actuales.filter((id) => id !== juego.id));
        toast.exito("Juego quitado de favoritos.");
      } else {
        await agregarFavorito(juego.id);
        setFavoritos((actuales) => [...actuales, juego.id]);
        toast.exito("Juego agregado a favoritos.");
      }
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (!cargando && juegos.length === 0) return null;

  return (
    <section className="pg-seccion" aria-labelledby="titulo-novedades">
      <h2 id="titulo-novedades" className="pg-titulo">
        Novedades
      </h2>
      <p className="populares-subtitulo">
        Los últimos juegos que sumamos al catálogo.
      </p>

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando juegos...
        </p>
      ) : (
        <>
          <ul className="grilla-juegos grilla-novedades">
            {juegos.map((juego) => (
              <li key={juego.id} className="popular-item">
                <p className="popular-insignia">
                  <span aria-hidden="true">✨</span> Nuevo
                </p>
                {/* Siempre como cliente: en la portada el administrador no edita juegos. */}
                <TarjetaJuego
                  juego={juego}
                  esAdmin={false}
                  esFavorito={favoritos.includes(juego.id)}
                  cargandoFavoritos={cargandoFavoritos}
                  onToggleFavorito={() => alternarFavorito(juego)}
                />
              </li>
            ))}
          </ul>

          <p className="populares-enlace">
            <Link to="/juegos">Ver todo el catálogo →</Link>
          </p>
        </>
      )}
    </section>
  );
}

export default JuegosNovedades;
