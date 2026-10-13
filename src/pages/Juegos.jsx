import { useEffect, useState } from "react";

import {
  listarJuegos,
  listarCategorias,
  crearJuego,
  actualizarJuego,
  eliminarJuego,
  listarFavoritos,
  agregarFavorito,
  quitarFavorito,
} from "../api/api.js";


import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import TarjetaJuego from "../components/TarjetaJuego.jsx";
import FormularioJuego from "../components/FormularioJuego.jsx";

const JUEGOS_POR_PAGINA = 6;

function Juegos() {
  // Cualquiera (con o sin cuenta) ve el catálogo. El alta, edición y baja de juegos
  // (el "CRUD") solo se muestran si el usuario logueado es administrador.
  const { esAdmin, usuario } = useAuth();
  const toast = useToast();

  // Datos que vienen de la API (base de datos en Render).
  const [juegos, setJuegos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [favoritos, setFavoritos] = useState([]);
  const [cargandoFavoritos, setCargandoFavoritos] = useState(false);

  // Formulario: null = cerrado, "nuevo" = crear, o el juego que se está editando.
  const [formulario, setFormulario] = useState(null);

  // Lo que el usuario va eligiendo: buscador, categoría y página del listado.
  const [busqueda, setBusqueda] = useState("");
  const [categoriaElegida, setCategoriaElegida] = useState("Todas");
  const [pagina, setPagina] = useState(1);

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


// Cargar los favoritos del usuario que inició sesión.
useEffect(() => {
  let activo = true;

  async function cargarFavoritosUsuario() {
    if (!usuario) {
      setFavoritos([]);
      setCargandoFavoritos(false);
      return;
    }

    setCargandoFavoritos(true);

    try {
      const ids = await listarFavoritos();

      if (activo) {
        setFavoritos(ids);
      }
    } catch (error) {
      if (activo) {
        setFavoritos([]);
        toast.error(
          "No se pudieron cargar los favoritos: " + error.message
        );
      }
    } finally {
      if (activo) {
        setCargandoFavoritos(false);
      }
    }
  }

  cargarFavoritosUsuario();

  return () => {
    activo = false;
  };
}, [usuario]);



// Agregar o quitar un juego de favoritos.
async function alternarFavorito(juego) {
  if (!usuario) {
    toast.error("Iniciá sesión para guardar tus juegos favoritos.");
    return;
  }

  const yaEsFavorito = favoritos.includes(juego.id);

  try {
    if (yaEsFavorito) {
      await quitarFavorito(juego.id);
      setFavoritos((actuales) =>
        actuales.filter((id) => id !== juego.id)
      );
      toast.exito("Juego quitado de favoritos.");
    } else {
      await agregarFavorito(juego.id);
      setFavoritos((actuales) =>
        [...actuales, juego.id]
      );
      toast.exito("Juego agregado a favoritos.");
    }
  } catch (error) {
    toast.error(error.message);
  }
}


  // CREATE y UPDATE: si hay un juego en edición usamos PUT, si no POST.
  // Si la API falla, el error vuelve al formulario (que lo muestra); acá solo avisamos si salió bien.
  async function guardarJuego(datos) {
    const esNuevo = formulario === "nuevo";
    if (esNuevo) {
      await crearJuego(datos);
    } else {
      await actualizarJuego(formulario.id, datos);
    }
    setFormulario(null);
    setPagina(1);
    setBusqueda("");
    setCategoriaElegida("Todas");
    await cargarDatos(); // actualizamos la lista después de guardar
    toast.exito(esNuevo ? "Juego creado." : "Juego editado.");
  }

  // DELETE
  async function borrarJuego(juego) {
    if (!window.confirm(`¿Eliminar "${juego.titulo}"? No se puede deshacer.`)) {
      return;
    }
    try {
      await eliminarJuego(juego.id);
      await cargarDatos();
      toast.exito("Juego eliminado.");
    } catch (e) {
      toast.error(e.message);
    }
  }

  // Filtramos la lista completa según lo que el usuario eligió.
  const juegosFiltrados = juegos.filter((juego) => {
    const coincideNombre = juego.titulo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria =
      categoriaElegida === "Todas" || juego.categoria.nombre === categoriaElegida;
    return coincideNombre && coincideCategoria;
  });

  // Paginación simple: cortamos el array filtrado en "trozos"
  // del tamaño que definimos arriba (JUEGOS_POR_PAGINA).
  const totalPaginas = Math.max(1, Math.ceil(juegosFiltrados.length / JUEGOS_POR_PAGINA));
  const inicio = (pagina - 1) * JUEGOS_POR_PAGINA;
  const juegosDeEstaPagina = juegosFiltrados.slice(inicio, inicio + JUEGOS_POR_PAGINA);

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

      <div className="filtros" role="search">
        <label className="solo-lectores" htmlFor="buscar-juego">
          Buscar juegos por nombre
        </label>
        <input
          id="buscar-juego"
          type="search"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => manejarCambioBusqueda(e.target.value)}
        />

        <label className="solo-lectores" htmlFor="filtro-categoria">
          Filtrar por categoría
        </label>
        <select
          id="filtro-categoria"
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

      {/* Solo administradores: botón "Agregar juego" y formulario de alta/edición. */}
      {esAdmin &&
        (formulario === null ? (
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
        ))}

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando juegos... la primera vez puede tardar hasta un minuto.
        </p>
      ) : errorCarga ? (
        <div role="alert">
          <span className="error">{errorCarga}</span>
          <button
            className="boton"
            style={{ width: "auto", marginTop: 12 }}
            onClick={() => {
              setCargando(true);
              cargarDatos();
            }}
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
          esAdmin={esAdmin}
          esFavorito={favoritos.includes(juego.id)}
          cargandoFavoritos={cargandoFavoritos}
          onToggleFavorito={() => alternarFavorito(juego)}
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
        <span style={{ color: "var(--texto-suave)", fontSize: 14 }} aria-live="polite">
          Mostrando {juegosDeEstaPagina.length} de {juegosFiltrados.length} juegos
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="boton"
            style={{ width: "auto" }}
            disabled={pagina === 1}
            aria-label="Página anterior"
            onClick={() => setPagina(pagina - 1)}
          >
            Anterior
          </button>
          <button
            className="boton"
            style={{ width: "auto" }}
            disabled={pagina === totalPaginas}
            aria-label="Página siguiente"
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