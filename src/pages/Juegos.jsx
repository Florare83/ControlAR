import { useState } from "react";
import { juegos, categorias } from "../data/juegos.js";
import TarjetaJuego from "../components/TarjetaJuego.jsx";

const JUEGOS_POR_PAGINA = 6;

function Juegos() {
  // Guardamos en variables de estado lo que el usuario va eligiendo:
  // qué escribió en el buscador, qué categoría eligió, y en qué
  // página del listado está parado.
  const [busqueda, setBusqueda] = useState("");
  const [categoriaElegida, setCategoriaElegida] = useState("Todas");
  const [pagina, setPagina] = useState(1);

  // Filtramos la lista completa según lo que el usuario eligió.
  // Esto se vuelve a calcular cada vez que cambia busqueda,
  // categoriaElegida o la lista de juegos.
  const juegosFiltrados = juegos.filter((juego) => {
    const coincideNombre = juego.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoriaElegida === "Todas" || juego.categoria === categoriaElegida;

    return coincideNombre && coincideCategoria;
  });

  // Paginación simple: cortamos el array filtrado en "trozos"
  // del tamaño que definimos arriba (JUEGOS_POR_PAGINA).
  const totalPaginas = Math.max(
    1,
    Math.ceil(juegosFiltrados.length / JUEGOS_POR_PAGINA)
  );
  const inicio = (pagina - 1) * JUEGOS_POR_PAGINA;
  const juegosDeEstaPagina = juegosFiltrados.slice(
    inicio,
    inicio + JUEGOS_POR_PAGINA
  );

  // Si el usuario cambia el buscador o el filtro, siempre
  // lo mandamos de vuelta a la página 1 para no dejarlo
  // "perdido" en una página que ya no tiene resultados.
  function manejarCambioBusqueda(valor) {
    setBusqueda(valor);
    setPagina(1);
  }

  function manejarCambioCategoria(valor) {
    setCategoriaElegida(valor);
    setPagina(1);
  }

  return (
    <div className="pagina">
      <h1>Catálogo de juegos</h1>
      <p className="subtitulo">
        Explorá los juegos que forman parte de nuestra ludoteca y/o de nuestra tienda.
      </p>

      <div className="filtros">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => manejarCambioBusqueda(e.target.value)}
        />

        <select
          value={categoriaElegida}
          onChange={(e) => manejarCambioCategoria(e.target.value)}
        >
          <option value="Todas">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {juegosDeEstaPagina.length === 0 ? (
        <p>No encontramos juegos con ese filtro.</p>
      ) : (
        <div className="grilla-juegos">
          {juegosDeEstaPagina.map((juego) => (
            <TarjetaJuego juego={juego} key={juego.id} />
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
        }}
      >
        <span style={{ color: "var(--texto-suave)", fontSize: 14 }}>
          Mostrando {juegosDeEstaPagina.length} de {juegosFiltrados.length}{" "}
          juegos
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="boton"
            style={{ width: "auto" }}
            disabled={pagina === 1}
            onClick={() => setPagina(pagina - 1)}
          >
            Anterior
          </button>
          <button
            className="boton"
            style={{ width: "auto" }}
            disabled={pagina === totalPaginas}
            onClick={() => setPagina(pagina + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

export default Juegos;