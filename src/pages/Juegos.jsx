
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  listarJuegos,
  listarCategorias,
  crearJuego,
  actualizarJuego,
  eliminarJuego,
  listarFavoritos,
  agregarFavorito,
  quitarFavorito,
  obtenerEstadoReservas,
  listarMisReservas,
  reservarJuego,
  cancelarReserva,
} from "../api/api.js";

import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import TarjetaJuego from "../components/TarjetaJuego.jsx";
import FormularioJuego from "../components/FormularioJuego.jsx";
import Modal from "../components/Modal.jsx";
import { partesFecha } from "../data/eventos.js";

// Visitantes y clientes: 4 columnas x 3 filas. Administrador: lista de 1 columna.
const JUEGOS_POR_PAGINA_CLIENTES = 12;
const JUEGOS_POR_PAGINA_ADMIN = 10;

// Ordena una lista de juegos. Los que no están en tienda (sin precio)
// van siempre al final cuando se ordena por precio.
function ordenarJuegos(lista, orden) {
  if (!orden) return lista;

  const [campo, sentido] = orden.split("-");
  const dir = sentido === "desc" ? -1 : 1;
  const porTitulo = (a, b) =>
    a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" });

  return [...lista].sort((a, b) => {
    if (campo === "titulo") return dir * porTitulo(a, b);

    if (campo === "popularidad") {
      return (
        dir * (Number(a.me_gusta || 0) - Number(b.me_gusta || 0)) ||
        porTitulo(a, b)
      );
    }

    if (campo === "precio") {
      if (!a.en_venta && !b.en_venta) return porTitulo(a, b);
      if (!a.en_venta) return 1;
      if (!b.en_venta) return -1;
      return dir * (Number(a.precio) - Number(b.precio)) || porTitulo(a, b);
    }

    // edad
    return (
      dir * (Number(a.edad_minima) - Number(b.edad_minima)) || porTitulo(a, b)
    );
  });
}

// enPanel: se muestra dentro del panel de administración (sección "Juegos").
function Juegos({ enPanel = false }) {
  const { esAdmin, usuario } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();

  const [juegos, setJuegos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [favoritos, setFavoritos] = useState([]);
  const [cargandoFavoritos, setCargandoFavoritos] = useState(false);

  const [formulario, setFormulario] = useState(null);
  const [guardandoJuego, setGuardandoJuego] = useState(false);

  // Reservas para el próximo evento.
  const [estadoReservas, setEstadoReservas] = useState(null);
  const [misReservas, setMisReservas] = useState([]);
  const [reservando, setReservando] = useState(false);

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
  const [orden, setOrden] = useState("titulo-asc");
  const [verAvanzados, setVerAvanzados] = useState(false);

  const porPagina = esAdmin
    ? JUEGOS_POR_PAGINA_ADMIN
    : JUEGOS_POR_PAGINA_CLIENTES;

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

  // Estado de las reservas: público (evento y juegos reservados) + las mías si hay sesión.
  async function cargarReservas() {
    try {
      setEstadoReservas(await obtenerEstadoReservas());
    } catch {
      setEstadoReservas(null);
    }

    if (!usuario) {
      setMisReservas([]);
      return;
    }

    try {
      const lista = await listarMisReservas();
      setMisReservas(Array.isArray(lista) ? lista : []);
    } catch {
      setMisReservas([]);
    }
  }

  useEffect(() => {
    cargarReservas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const eventoReservas = estadoReservas?.evento ?? null;

  // Mi reserva activa para el evento que se puede reservar ahora.
  const miReservaActiva = eventoReservas
    ? misReservas.find(
        (r) => r.estado === "activa" && r.evento?.id === eventoReservas.id
      ) ?? null
    : null;

  function datosReservaDe(juego) {
    if (!eventoReservas) return null;

    return {
      evento: eventoReservas,
      abiertas: Boolean(estadoReservas?.reservas_abiertas),
      reservada: estadoReservas.juegos_reservados.includes(juego.id),
      miReserva:
        miReservaActiva && miReservaActiva.juego.id === juego.id
          ? miReservaActiva
          : null,
      tieneOtra:
        Boolean(miReservaActiva) && miReservaActiva.juego.id !== juego.id,
      ocupado: reservando,
    };
  }

  async function reservar(juego) {
    if (!usuario) {
      toast.info("Iniciá sesión para reservar un juego.");
      navegar("/login");
      return;
    }

    setReservando(true);

    try {
      await reservarJuego(juego.id);
      toast.exito(
        `Reservaste "${juego.titulo}". Retiralo en el evento: te lo guardamos hasta 30 minutos después del inicio.`
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      await cargarReservas();
      setReservando(false);
    }
  }

  async function cancelarMiReserva(reserva) {
    if (!window.confirm(`¿Cancelar la reserva de "${reserva.juego.titulo}"?`)) {
      return;
    }

    setReservando(true);

    try {
      await cancelarReserva(reserva.id);
      toast.exito("Reserva cancelada.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      await cargarReservas();
      setReservando(false);
    }
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

    setGuardandoJuego(false);
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
  const juegosCoincidentes = juegos.filter((juego) => {
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
        : Boolean(juego.se_presta) && !juego.en_prestamo);

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

  const juegosFiltrados = ordenarJuegos(juegosCoincidentes, orden);

  // Cantidad de filtros avanzados activos (se muestra en el botón).
  const avanzadosActivos = [
    tiendaElegida !== "Todas",
    prestamoElegido !== "Todos",
    editorialElegida !== "Todas",
    duracionMax !== "",
    precioMin !== "",
    precioMax !== "",
    edadMin !== "",
    edadMax !== "",
  ].filter(Boolean).length;

  const totalPaginas = Math.max(
    1,
    Math.ceil(juegosFiltrados.length / porPagina)
  );

  // Si cambia la cantidad de resultados, evitamos quedar en una página vacía.
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;

  const juegosDeEstaPagina = juegosFiltrados.slice(
    inicio,
    inicio + porPagina
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
    <div className={enPanel ? undefined : "pagina"}>
      <h1>{enPanel ? "Juegos" : "Catálogo de juegos"}</h1>

      <p className="subtitle">
        {enPanel
          ? "Administrá el catálogo: agregá juegos nuevos, editalos o eliminalos."
          : "Explorá los juegos que forman parte de nuestra ludoteca y/o de nuestra tienda."}
      </p>

      {/* Reservas para el próximo evento */}
      {!esAdmin && eventoReservas && (
        <div className="club-aviso" role="note">
          <span aria-hidden="true">🎲</span>
          <p>
            <strong>Reservá tu juego para el próximo evento: </strong>
            {eventoReservas.titulo}
            {partesFecha(eventoReservas.fecha)
              ? `, ${partesFecha(eventoReservas.fecha).larga}`
              : ""}
            {eventoReservas.hora_texto ? ` · ${eventoReservas.hora_texto}` : ""}.{" "}
            {estadoReservas.reservas_abiertas
              ? `Podés reservar un juego hasta ${new Date(
                  estadoReservas.cierre_reservas
                ).toLocaleString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Argentina/Salta",
                })} h. Lo retirás en el evento y te lo guardamos hasta 30 minutos después de que empiece.`
              : "Las reservas ya cerraron: podés pedir el juego directamente en el evento, si está disponible."}
          </p>
        </div>
      )}

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

        <button
          type="button"
          className="boton boton-avanzados"
          aria-expanded={verAvanzados}
          aria-controls="filtros-avanzados"
          onClick={() => setVerAvanzados((v) => !v)}
        >
          Filtros avanzados{avanzadosActivos > 0 ? ` (${avanzadosActivos})` : ""}{" "}
          <span aria-hidden="true">{verAvanzados ? "▴" : "▾"}</span>
        </button>

        <button
          type="button"
          className="boton"
          style={{ width: "auto" }}
          onClick={limpiarFiltros}
        >
          Limpiar filtros
        </button>

        {/* Orden: en la misma línea, un poco separado de los filtros */}
        <div className="orden-inline">
          <label htmlFor="ordenar-juegos">Ordenar por</label>
          <select
            id="ordenar-juegos"
            value={orden}
            onChange={(e) => cambiarFiltro(setOrden, e.target.value)}
          >
            <option value="titulo-asc">Título (A → Z)</option>
            <option value="titulo-desc">Título (Z → A)</option>
            <option value="precio-asc">Precio (menor a mayor)</option>
            <option value="precio-desc">Precio (mayor a menor)</option>
            <option value="edad-asc">Edad (menor a mayor)</option>
            <option value="edad-desc">Edad (mayor a menor)</option>
            <option value="popularidad-desc">Popularidad (más me gusta)</option>
          </select>
        </div>

        {verAvanzados && (
          <div id="filtros-avanzados" className="filtros-avanzados">
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

          </div>
        )}
      </div>

      {/* Solo los administradores pueden crear o editar juegos (en una ventana modal). */}
      {esAdmin && (
        <button
          type="button"
          className="boton"
          style={{ width: "auto", marginBottom: 22 }}
          onClick={() => setFormulario("nuevo")}
        >
          Agregar juego
        </button>
      )}

      {esAdmin && formulario !== null && (
        <Modal
          titulo={
            formulario === "nuevo"
              ? "Agregar juego"
              : `Editar "${formulario.titulo}"`
          }
          ocupado={guardandoJuego}
          onCerrar={() => setFormulario(null)}
        >
          <FormularioJuego
            key={formulario === "nuevo" ? "nuevo" : formulario.id}
            juego={formulario === "nuevo" ? null : formulario}
            categorias={categorias}
            onGuardar={guardarJuego}
            onCancelar={() => setFormulario(null)}
            onOcupado={setGuardandoJuego}
            enModal
          />
        </Modal>
      )}

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
        <div className={`grilla-juegos ${esAdmin ? "grilla-admin" : ""}`}>
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
              reservas={datosReservaDe(juego)}
              onReservar={reservar}
              onCancelarReserva={cancelarMiReserva}
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
