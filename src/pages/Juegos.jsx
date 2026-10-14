
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

const JUEGOS_POR_PAGINA = 10;

function Juegos() {
  const { esAdmin, usuario } = useAuth();
  const toast = useToast();

  const [juegos, setJuegos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [favoritos, setFavoritos] = useState([]);
  const [cargandoFavoritos, setCargandoFavoritos] = useState(false);

  const [formulario, setFormulario] = useState(null);

  // Filtros del catálogo.
  const [busqueda, setBusqueda] = useState("");
  const [categoriaElegida, setCategoriaElegida] = useState("Todas");
  const [tiendaElegida, setTiendaElegida] = useState("Todas");
  const [prestamoElegido, setPrestamoElegido] = useState("Todos");
  const [editorialElegida, setEditorialElegida] = useState("Todas");
  const [duracionMax, setDuracionMax] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [edadMin, setEdadMin] = useState("");
  const [edadMax, setEdadMax] = useState("");

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

  useEffect(() => {
    cargarDatos();
  }, []);

  // Cargar favoritos del usuario.
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
        setFavoritos((actuales) => [...actuales, juego.id]);
        toast.exito("Juego agregado a favoritos.");
      }
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function guardarJuego(datos) {
    const esNuevo = formulario === "nuevo";

    if (esNuevo) {
      await crearJuego(datos);
    } else {
      await actualizarJuego(formulario.id, datos);
    }

    setFormulario(null);
    setPagina(1);
    await cargarDatos();

    toast.exito(esNuevo ? "Juego creado." : "Juego editado.");
  }

  async function borrarJuego(juego) {
    if (
      !window.confirm(
        `¿Eliminar "${juego.titulo}"? No se puede deshacer.`
      )
    ) {
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

  // Cualquier cambio en un filtro vuelve a la primera página.
  function cambiarFiltro(setter, valor) {
    setter(valor);
    setPagina(1);
  }

  // Opciones de editorial tomadas de los juegos existentes.
  const editoriales = [
    ...new Set(
      juegos
        .map((juego) => juego.editorial?.trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  // Aplicar todos los filtros seleccionados.
  const juegosFiltrados = juegos.filter((juego) => {
    const texto = busqueda.trim().toLowerCase();

    const coincideNombre = juego.titulo
      .toLowerCase()
      .includes(texto);

    const coincideCategoria =
      categoriaElegida === "Todas" ||
      juego.categoria?.nombre === categoriaElegida;

    const coincideTienda =
      tiendaElegida === "Todas" ||
      (tiendaElegida === "Si"
        ? Boolean(juego.en_venta)
        : !juego.en_venta);

    const coincidePrestamo =
      prestamoElegido === "Todos" ||
      (prestamoElegido === "Si"
        ? Boolean(juego.en_prestamo)
        : !juego.en_prestamo);

    const coincideEditorial =
      editorialElegida === "Todas" ||
      (editorialElegida === "Sin editorial"
        ? !juego.editorial?.trim()
        : juego.editorial?.trim() === editorialElegida);

    const coincideDuracion =
      duracionMax === "" ||
      Number(juego.duracion_minutos) <= Number(duracionMax);

    const coincidePrecioMin =
      precioMin === "" ||
      Number(juego.precio) >= Number(precioMin);

    const coincidePrecioMax =
      precioMax === "" ||
      Number(juego.precio) <= Number(precioMax);

    const coincideEdadMin =
      edadMin === "" ||
      Number(juego.edad_minima) >= Number(edadMin);

    const coincideEdadMax =
      edadMax === "" ||
      Number(juego.edad_minima) <= Number(edadMax);

    return (
      coincideNombre &&
      coincideCategoria &&
      coincideTienda &&
      coincidePrestamo &&
      coincideEditorial &&
      coincideDuracion &&
      coincidePrecioMin &&
      coincidePrecioMax &&
      coincideEdadMin &&
      coincideEdadMax
    );
  });

  const totalPaginas = Math.max(
    1,
    Math.ceil(juegosFiltrados.length / JUEGOS_POR_PAGINA)
  );

  // Si cambia la cantidad de resultados, evitamos quedar en una página vacía.
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * JUEGOS_POR_PAGINA;

  const juegosDeEstaPagina = juegosFiltrados.slice(
    inicio,
    inicio + JUEGOS_POR_PAGINA
  );

  function limpiarFiltros() {
    setBusqueda("");
    setCategoriaElegida("Todas");
    setTiendaElegida("Todas");
    setPrestamoElegido("Todos");
    setEditorialElegida("Todas");
    setDuracionMax("");
    setPrecioMin("");
    setPrecioMax("");
    setEdadMin("");
    setEdadMax("");
    setPagina(1);
  }

  return (
    <div className="pagina">
      <h1>Catálogo de juegos</h1>

      <p className="subtitle">
        Explorá los juegos que forman parte de nuestra ludoteca y/o de nuestra tienda.
      </p>

      {/* Filtros del catálogo */}
      <div className="filtros" role="search">
        <label className="solo-lectores" htmlFor="buscar-juego">
          Buscar juegos por nombre
        </label>
        <input
          id="buscar-juego"
          type="search"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) =>
            cambiarFiltro(setBusqueda, e.target.value)
          }
        />

        <label className="solo-lectores" htmlFor="filtro-categoria">
          Filtrar por categoría
        </label>
        <select
          id="filtro-categoria"
          value={categoriaElegida}
          onChange={(e) =>
            cambiarFiltro(setCategoriaElegida, e.target.value)
          }
        >
          <option value="Todas">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.nombre}>
              {cat.nombre}
            </option>
          ))}
        </select>

        <label className="solo-lectores" htmlFor="filtro-tienda">
          Disponibilidad en tienda
        </label>
        <select
          id="filtro-tienda"
          value={tiendaElegida}
          onChange={(e) =>
            cambiarFiltro(setTiendaElegida, e.target.value)
          }
        >
          <option value="Todas">Tienda: todos</option>
          <option value="Si">En tienda</option>
          <option value="No">No está en tienda</option>
        </select>

        <label className="solo-lectores" htmlFor="filtro-prestamo">
          Estado del préstamo
        </label>
        <select
          id="filtro-prestamo"
          value={prestamoElegido}
          onChange={(e) =>
            cambiarFiltro(setPrestamoElegido, e.target.value)
          }
        >
          <option value="Todos">Préstamo: todos</option>
          <option value="Si">Actualmente en préstamo</option>
          <option value="No">Disponible para préstamo</option>
        </select>

        <label className="solo-lectores" htmlFor="filtro-editorial">
          Filtrar por editorial
        </label>
        <select
          id="filtro-editorial"
          value={editorialElegida}
          onChange={(e) =>
            cambiarFiltro(setEditorialElegida, e.target.value)
          }
        >
          <option value="Todas">Todas las editoriales</option>
          {editoriales.map((editorial) => (
            <option key={editorial} value={editorial}>
              {editorial}
            </option>
          ))}
          {juegos.some((juego) => !juego.editorial?.trim()) && (
            <option value="Sin editorial">Sin editorial</option>
          )}
        </select>

        <label className="solo-lectores" htmlFor="filtro-duracion">
          Duración máxima en minutos
        </label>
        <input
          id="filtro-duracion"
          type="number"
          min="1"
          placeholder="Duración máx. (min)"
          value={duracionMax}
          onChange={(e) =>
            cambiarFiltro(setDuracionMax, e.target.value)
          }
        />

        <label className="solo-lectores" htmlFor="filtro-precio-min">
          Precio mínimo
        </label>
        <input
          id="filtro-precio-min"
          type="number"
          min="0"
          placeholder="Precio desde"
          value={precioMin}
          onChange={(e) =>
            cambiarFiltro(setPrecioMin, e.target.value)
          }
        />

        <label className="solo-lectores" htmlFor="filtro-precio-max">
          Precio máximo
        </label>
        <input
          id="filtro-precio-max"
          type="number"
          min="0"
          placeholder="Precio hasta"
          value={precioMax}
          onChange={(e) =>
            cambiarFiltro(setPrecioMax, e.target.value)
          }
        />

        <label className="solo-lectores" htmlFor="filtro-edad-min">
          Edad mínima desde
        </label>
        <input
          id="filtro-edad-min"
          type="number"
          min="0"
          placeholder="Edad desde"
          value={edadMin}
          onChange={(e) =>
            cambiarFiltro(setEdadMin, e.target.value)
          }
        />

        <label className="solo-lectores" htmlFor="filtro-edad-max">
          Edad mínima hasta
        </label>
        <input
          id="filtro-edad-max"
          type="number"
          min="0"
          placeholder="Edad hasta"
          value={edadMax}
          onChange={(e) =>
            cambiarFiltro(setEdadMax, e.target.value)
          }
        />

        <button
          type="button"
          className="boton"
          style={{ width: "auto" }}
          onClick={limpiarFiltros}
        >
          Limpiar filtros
        </button>
      </div>

      {/* Solo los administradores pueden crear o editar juegos. */}
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
        <p>No encontramos juegos con esos filtros.</p>
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

      {/* Paginación */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 24,
        }}
      >
        <span
          style={{ color: "var(--texto-suave)", fontSize: 14 }}
          aria-live="polite"
        >
          Mostrando {juegosDeEstaPagina.length} de {juegosFiltrados.length} juegos
          {" · "}Página {paginaActual} de {totalPaginas}
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="boton"
            style={{ width: "auto" }}
            disabled={paginaActual === 1}
            aria-label="Página anterior"
            onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
          >
            Anterior
          </button>

          <button
            className="boton"
            style={{ width: "auto" }}
            disabled={paginaActual === totalPaginas}
            aria-label="Página siguiente"
            onClick={() =>
              setPagina((actual) => Math.min(totalPaginas, actual + 1))
            }
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

export default Juegos;
