import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  agregarFavorito,
  listarFavoritos,
  listarJuegosPopulares,
  quitarFavorito,
} from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import TarjetaJuego from "./TarjetaJuego.jsx";

const CANTIDAD = 2;

// Los juegos de la tienda con más "me gusta", para mostrar en la portada.
// Si no se pueden cargar o todavía no hay juegos en tienda, la sección no se muestra.
function JuegosPopulares() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();

  const [juegos, setJuegos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [favoritos, setFavoritos] = useState([]);
  const [cargandoFavoritos, setCargandoFavoritos] = useState(false);

  useEffect(() => {
    let vigente = true;

    listarJuegosPopulares(CANTIDAD)
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

  function ajustarMeGusta(juegoId, cambio) {
    setJuegos((actuales) =>
      actuales.map((j) =>
        j.id === juegoId
          ? { ...j, me_gusta: Math.max(0, Number(j.me_gusta || 0) + cambio) }
          : j
      )
    );
  }

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
        ajustarMeGusta(juego.id, -1);
        toast.exito("Juego quitado de favoritos.");
      } else {
        await agregarFavorito(juego.id);
        setFavoritos((actuales) => [...actuales, juego.id]);
        ajustarMeGusta(juego.id, 1);
        toast.exito("Juego agregado a favoritos.");
      }
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (!cargando && juegos.length === 0) return null;

  return (
    <section className="pg-seccion" aria-labelledby="titulo-populares">
      <h2 id="titulo-populares" className="pg-titulo">
        Los más populares
      </h2>
      <p className="populares-subtitulo">
        Los juegos de la tienda que más les gustan a la comunidad.
      </p>

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando juegos...
        </p>
      ) : (
        <>
          <ul className="grilla-juegos grilla-populares">
            {juegos.map((juego, indice) => {
              const meGusta = Number(juego.me_gusta || 0);
              return (
                <li key={juego.id} className="popular-item">
                  <p className="popular-insignia">
                    <span aria-hidden="true">🔥</span> N.º {indice + 1}
                    {meGusta > 0 && (
                      <span>
                        {" · "}
                        {meGusta} me gusta
                      </span>
                    )}
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
              );
            })}
          </ul>

          <p className="populares-enlace">
            <Link to="/juegos">Ver todo el catálogo →</Link>
          </p>
        </>
      )}
    </section>
  );
}

export default JuegosPopulares;
