import { useEffect, useState } from "react";
import {
  listarJuegos,
  listarCategorias,
  crearJuego,
  actualizarJuego,
  eliminarJuego,
} from "../api/api.js";
import TarjetaJuego from "../components/TarjetaJuego.jsx";
import FormularioJuego from "../components/FormularioJuego.jsx";

const JUEGOS_POR_PAGINA = 6;

function Juegos() {
  // Datos que vienen de la API (base de datos en Render).
  const [juegos, setJuegos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  // Formulario: null = cerrado, "nuevo" = crear, o el juego que se está editando.
  const [formulario, setFormulario] = useState(null);

  async function cargarDatos() {
    setErrorCarga("");
    try {
      const [listaJuegos, listaCategorias] = await Promise.all([
        listarJuegos(),
        listarCategorias(),
      ]);
      setJuegos(listaJuegos);
      setCategorias(listaCategorias);
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setCargando(false);
    }
  }

  // Se ejecuta una sola vez, cuando la página aparece en pantalla.
  useEffect(() => {
    cargarDatos();
  }, []);

  // CREATE y UPDATE: si hay un juego en edición usamos PUT, si no POST.
  async function guardarJuego(datos) {
    if (formulario === "nuevo") {
      await crearJuego(datos);
    } else {
      await actualizarJuego(formulario.id, datos);
    }
    setFormulario(null);
    await cargarDatos(); // volvemos a pedir la lista para ver el cambio
  }

  // DELETE
  async function borrarJuego(juego) {
    if (!window.confirm(`¿Eliminar "${juego.titulo}"? No se puede deshacer.`)) {
      return;
    }
    try {
      await eliminarJuego(juego.id);
      await cargarDatos();
    } catch (e) {
      alert(e.message);
    }
  }

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
    const coincideNombre = juego.titulo
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoriaElegida === "Todas" || juego.categoria.nombre === categoriaElegida;

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
            <option key={cat.id} value={cat.nombre}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      {formulario === null ? (
        <button
          className="boton"
          style={{ width: "auto", marginBottom: 22 }}
          onClick={() => setFormulario("nuevo")}
        >
          Agregar juego
        </button>
      ) : (
        <FormularioJuego
          key={formulario === "nuevo" ? "nuevo" : formulario.id}
          juego={formulario === "nuevo" ? null : formulario}
          categorias={categorias}
          onGuardar={guardarJuego}
          onCancelar={() => setFormulario(null)}
        />
      )}

      {cargando ? (
        <p>Cargando juegos... la primera vez puede tardar hasta un minuto.</p>
      ) : errorCarga ? (
        <div>
          <span className="error">{errorCarga}</span>
          <button
            className="boton"
            style={{ width: "auto", marginTop: 12 }}
            onClick={cargarDatos}
          >
            Reintentar
          </button>
        </div>
      ) : juegosDeEstaPagina.length === 0 ? (
        <p>No encontramos juegos con ese filtro.</p>
      ) : (
        <div className="grilla-juegos">
          {juegosDeEstaPagina.map((juego) => (
            <TarjetaJuego
              juego={juego}
              key={juego.id}
              onEditar={setFormulario}
              onEliminar={borrarJuego}
            />
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