
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

const JUEGOS_POR_PAGINA = 12;

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

  // Búsqueda y filtros.
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

  // Ordenamiento.
  const [orden, setOrden] = useState("titulo-asc");

  // Paginación.
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
      if (!usuario || esAdmin) {
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
  }, [usuario, esAdmin]);

  async function alternarFavorito(juego) {
    if (!usuario) {
      toast.error("Iniciá sesión para guardar tus juegos favoritos.");
      return;
    }

    if (esAdmin) return;

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
          actuales.includes(juego.id)
            ? actuales
            : [...actuales, juego.id]
        );

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

  // Volver a la primera página al cambiar un filtro u orden.
  function cambiarFiltro(setter, valor) {
    setter(valor);
    setPagina(1);
  }

  const editoriales = [
    ...new Set(
      juegos
        .map((juego) => juego.editorial?.trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const tieneJuegosSinEditorial = juegos.some(
    (juego) => !juego.editorial?.trim()
  );

  // Aplicar filtros.
  const juegosFiltrados = juegos.filter((juego) => {
    const texto = busqueda.trim().toLowerCase();

    const coincideNombre = (juego.titulo || "")
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

    const edad = Number(juego.edad_minima ?? 0);

    const coincideEdadMin =
      edadMin === "" || edad >= Number(edadMin);

    const coincideEdadMax =
      edadMax === "" || edad <= Number(edadMax);

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

  // Ordenar los resultados filtrados.
  const juegosOrdenados = [...juegosFiltrados].sort((a, b) => {
    switch (orden) {
      case "titulo-asc":
        return (a.titulo || "").localeCompare(
          b.titulo || "",
          "es",
          { sensitivity: "base" }
        );

      case "titulo-desc":
        return (b.titulo || "").localeCompare(
          a.titulo || "",
          "es",
          { sensitivity: "base" }
        );

      case "precio-asc":
        return Number(a.precio ?? 0) - Number(b.precio ?? 0);

      case "precio-desc":
        return Number(b.precio ?? 0) - Number(a.precio ?? 0);

      case "edad-asc":
        return (
          Number(a.edad_minima ?? 0) -
          Number(b.edad_minima ?? 0)
        );

      case "edad-desc":
        return (
          Number(b.edad_minima ?? 0) -
          Number(a.edad_minima ?? 0)
        );

      default:
        return 0;
    }
  });

  // Paginación.
  const totalPaginas = Math.max(
    1,
    Math.ceil(juegosOrdenados.length / JUEGOS_POR_PAGINA)
  );

  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * JUEGOS_POR_PAGINA;

  const juegosDeEstaPagina = juegosOrdenados.slice(
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
    setOrden("titulo-asc");
    setPagina(1);
  }

  const cantidadFiltrosActivos = [
    categoriaElegida !== "Todas",
    tiendaElegida !== "Todas",
    prestamoElegido !== "Todos",
    editorialElegida !== "Todas",
    duracionMax !== "",
    precioMin !== "",
    precioMax !== "",
    edadMin !== "",
    edadMax !== "",
  ].filter(Boolean).length;

  return (
    <div className="pagina pagina-catalogo">
      <h1>Catálogo de juegos</h1>

      <p className="subtitle">
        Explorá los juegos que forman parte de nuestra ludoteca y/o de nuestra tienda.
      </p>

      {/* Búsqueda destacada */}
      <section className="catalogo-busqueda" role="search">
        <label htmlFor="buscar-juego">
          Buscar un juego
        </label>

        <input
          id="buscar-juego"
          type="search"
          placeholder="Escribí el nombre del juego..."
          value={busqueda}
          onChange={(e) =>
            cambiarFiltro(setBusqueda, e.target.value)
          }
        />
      </section>

      {/* Filtros principales */}
      <section className="catalogo-filtros">
        <div className="catalogo-filtros-encabezado">
          <div>
            <h2>Filtros</h2>
            <p>
              Refiná los resultados según lo que buscás.
            </p>
          </div>

          {cantidadFiltrosActivos > 0 && (
            <span className="filtros-contador">
              {cantidadFiltrosActivos} activos
            </span>
          )}
        </div>

        <div className="catalogo-filtros-principales">
          <div className="filtro-campo">
            <label htmlFor="filtro-categoria">
              Categoría
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
          </div>

          <div className="filtro-campo">
            <label htmlFor="filtro-tienda">
              Disponibilidad en tienda
            </label>

            <select
              id="filtro-tienda"
              value={tiendaElegida}
              onChange={(e) =>
                cambiarFiltro(setTiendaElegida, e.target.value)
              }
            >
              <option value="Todas">Todas</option>
              <option value="Si">En tienda</option>
              <option value="No">No está en tienda</option>
            </select>
          </div>

          <div className="filtro-campo">
            <label htmlFor="filtro-prestamo">
              Préstamos
            </label>

            <select
              id="filtro-prestamo"
              value={prestamoElegido}
              onChange={(e) =>
                cambiarFiltro(setPrestamoElegido, e.target.value)
              }
            >
              <option value="Todos">Todos</option>
              <option value="Si">En préstamo</option>
              <option value="No">Disponible para préstamo</option>
            </select>
          </div>
        </div>

        {/* Filtros secundarios plegables */}
        <details className="catalogo-filtros-avanzados">
          <summary>
            <span>Más filtros</span>

            <span className="filtros-avanzados-ayuda">
              Editorial, duración, precio y edad
            </span>
          </summary>

          <div className="catalogo-filtros-secundarios">
            <div className="filtro-campo">
              <label htmlFor="filtro-editorial">
                Editorial
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

                {tieneJuegosSinEditorial && (
                  <option value="Sin editorial">
                    Sin editorial
                  </option>
                )}
              </select>
            </div>

            <div className="filtro-campo">
              <label htmlFor="filtro-duracion">
                Duración máxima (min)
              </label>

              <input
                id="filtro-duracion"
                type="number"
                min="1"
                placeholder="Ej.: 60"
                value={duracionMax}
                onChange={(e) =>
                  cambiarFiltro(setDuracionMax, e.target.value)
                }
              />
            </div>

            <div className="filtro-campo">
              <label htmlFor="filtro-precio-min">
                Precio mínimo
              </label>

              <input
                id="filtro-precio-min"
                type="number"
                min="0"
                placeholder="Sin mínimo"
                value={precioMin}
                onChange={(e) =>
                  cambiarFiltro(setPrecioMin, e.target.value)
                }
              />
            </div>

            <div className="filtro-campo">
              <label htmlFor="filtro-precio-max">
                Precio máximo
              </label>

              <input
                id="filtro-precio-max"
                type="number"
                min="0"
                placeholder="Sin máximo"
                value={precioMax}
                onChange={(e) =>
                  cambiarFiltro(setPrecioMax, e.target.value)
                }
              />
            </div>

            <div className="filtro-campo">
              <label htmlFor="filtro-edad-min">
                Edad desde
              </label>

              <input
                id="filtro-edad-min"
                type="number"
                min="0"
                placeholder="Edad mínima"
                value={edadMin}
                onChange={(e) =>
                  cambiarFiltro(setEdadMin, e.target.value)
                }
              />
            </div>

            <div className="filtro-campo">
              <label htmlFor="filtro-edad-max">
                Edad hasta
              </label>

              <input
                id="filtro-edad-max"
                type="number"
                min="0"
                placeholder="Edad máxima"
                value={edadMax}
                onChange={(e) =>
                  cambiarFiltro(setEdadMax, e.target.value)
                }
              />
            </div>
          </div>
        </details>

        <div className="catalogo-filtros-pie">
          <span>
            {juegosFiltrados.length}{" "}
            {juegosFiltrados.length === 1
              ? "juego encontrado"
              : "juegos encontrados"}
          </span>

          <button
            type="button"
            className="boton-limpiar-filtros"
            onClick={limpiarFiltros}
            disabled={
              !busqueda &&
              cantidadFiltrosActivos === 0 &&
              orden === "titulo-asc"
            }
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* Herramientas del catálogo */}
      <div className="catalogo-resultados-encabezado">
        <div className="catalogo-resultados-titulo">
          <h2>Juegos disponibles</h2>
          <span>
            {juegosOrdenados.length}{" "}
            {juegosOrdenados.length === 1 ? "resultado" : "resultados"}
          </span>
        </div>

        <div className="catalogo-orden">
          <label htmlFor="filtro-orden">
            Ordenar por
          </label>

          <select
            id="filtro-orden"
            value={orden}
            onChange={(e) =>
              cambiarFiltro(setOrden, e.target.value)
            }
          >
            <option value="titulo-asc">Título: A–Z</option>
            <option value="titulo-desc">Título: Z–A</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="edad-asc">Edad: menor a mayor</option>
            <option value="edad-desc">Edad: mayor a menor</option>
          </select>
        </div>
      </div>

      {/* Administración de juegos */}
      {esAdmin &&
        (formulario === null ? (
          <button
            type="button"
            className="boton boton-agregar-juego"
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

      {/* Estados de carga y resultados */}
      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando juegos... la primera vez puede tardar hasta un minuto.
        </p>
      ) : errorCarga ? (
        <div role="alert">
          <span className="error">{errorCarga}</span>

          <button
            type="button"
            className="boton boton-reintentar"
            onClick={() => {
              setCargando(true);
              cargarDatos();
            }}
          >
            Reintentar
          </button>
        </div>
      ) : juegosDeEstaPagina.length === 0 ? (
        <div className="catalogo-sin-resultados">
          <h3>No encontramos juegos</h3>
          <p>
            Probá cambiar los filtros o buscar con otro nombre.
          </p>

          <button
            type="button"
            className="boton"
            onClick={limpiarFiltros}
          >
            Ver todos los juegos
          </button>
        </div>
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
      {!cargando &&
        !errorCarga &&
        juegosOrdenados.length > 0 && (
          <div className="catalogo-paginacion">
            <span
              className="catalogo-paginacion-info"
              aria-live="polite"
            >
              Mostrando {juegosDeEstaPagina.length} de{" "}
              {juegosOrdenados.length} juegos · Página{" "}
              {paginaActual} de {totalPaginas}
            </span>

            <div className="catalogo-paginacion-botones">
              <button
                type="button"
                className="boton"
                disabled={paginaActual === 1}
                aria-label="Página anterior"
                onClick={() =>
                  setPagina((actual) => Math.max(1, actual - 1))
                }
              >
                Anterior
              </button>

              <button
                type="button"
                className="boton"
                disabled={paginaActual === totalPaginas}
                aria-label="Página siguiente"
                onClick={() =>
                  setPagina((actual) =>
                    Math.min(totalPaginas, actual + 1)
                  )
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

export default Juegos;
