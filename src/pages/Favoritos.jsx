
import { useEffect, useState } from "react";
import {
  listarJuegos,
  listarFavoritos,
  quitarFavorito,
} from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import TarjetaJuego from "../components/TarjetaJuego.jsx";

function Favoritos() {
  const { usuario, esAdmin } = useAuth();
  const toast = useToast();

  const [juegosFavoritos, setJuegosFavoritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargarFavoritos() {
    setCargando(true);
    setError("");

    try {
      const [idsFavoritos, todosLosJuegos] = await Promise.all([
        listarFavoritos(),
        listarJuegos(),
      ]);

      const ids = new Set(idsFavoritos);
      const lista = todosLosJuegos.filter((juego) =>
        ids.has(juego.id)
      );

      setJuegosFavoritos(lista);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (!usuario) {
      setJuegosFavoritos([]);
      setCargando(false);
      return;
    }

    cargarFavoritos();
  }, [usuario]);

  async function quitarDeFavoritos(juego) {
    try {
      await quitarFavorito(juego.id);

      setJuegosFavoritos((actuales) =>
        actuales.filter((item) => item.id !== juego.id)
      );

      toast.exito("Juego quitado de favoritos.");
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="pagina">
      <h1>Mis favoritos ❤️</h1>

      <p className="subtitulo">
        Acá encontrás los juegos que guardaste para volver a verlos.
      </p>

      {cargando ? (
        <p className="cargando" role="status">
          Cargando tus favoritos...
        </p>
      ) : error ? (
        <div role="alert">
          <p className="error">{error}</p>

          <button
            type="button"
            className="boton"
            onClick={cargarFavoritos}
          >
            Reintentar
          </button>
        </div>
      ) : juegosFavoritos.length === 0 ? (
        <div>
          <p>Todavía no tenés juegos favoritos.</p>
          <p>
            Entrá al catálogo y presioná ♡ Me gusta en los juegos
            que quieras guardar.
          </p>
        </div>
      ) : (
        <>
          <p>
            Tenés {juegosFavoritos.length}{" "}
            {juegosFavoritos.length === 1
              ? "juego favorito"
              : "juegos favoritos"}.
          </p>

          <div className="grilla-juegos">
            {juegosFavoritos.map((juego) => (
              <TarjetaJuego
                key={juego.id}
                juego={juego}
                esAdmin={false}
                esFavorito={true}
                cargandoFavoritos={false}
                onToggleFavorito={() => quitarDeFavoritos(juego)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Favoritos;
