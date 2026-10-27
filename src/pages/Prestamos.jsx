import { useCallback, useEffect, useState } from "react";
import {
  listarJuegos,
  listarHistorialPrestamos,
  registrarPrestamo,
  buscarPersonaPorDni,
  cambiarJuegoPrestamo,
  devolverPrestamo,
  editarPrestamo,
  reabrirPrestamo,
} from "../api/api.js";
import { useToast } from "../context/ToastContext.jsx";
import Modal from "../components/Modal.jsx";
import FiltroFechas from "../components/FiltroFechas.jsx";
import FiltroSelect from "../components/FiltroSelect.jsx";
import ThOrdenable, { siguienteOrden } from "../components/ThOrdenable.jsx";
import {
  ENCABEZADO_CSV_PRESTAMOS,
  descargarCsv,
  diasSinDevolver,
  fechaHoraArgentina,
  filaCsvPrestamo,
  textoDiasSinDevolver,
} from "../utils/prestamos.js";

// Cuántos préstamos se piden por vez (el resto se trae con "Ver más").
const POR_PAGINA = 20;

// Una devolución se puede deshacer hasta 48 horas después (lo valida la API).
const VENTANA_DESHACER_MS = 48 * 60 * 60 * 1000;

function sePuedeDeshacer(prestamo) {
  if (prestamo.estado !== "cerrado" || !prestamo.fecha_cierre) return false;
  return Date.now() - new Date(prestamo.fecha_cierre).getTime() <= VENTANA_DESHACER_MS;
}

const FILTROS_ESTADO = [
  { valor: "activo", texto: "Activos" },
  { valor: "atrasado", texto: "Sin devolver" },
  { valor: "cerrado", texto: "Cerrados" },
  { valor: "todos", texto: "Todos" },
];

const FORMULARIO_PERSONA = { dni: "", nombre: "", sexo: "Femenino", telefono: "" };

const FORMULARIO_VACIO = { juego_id: "", dni: "", nombre: "", sexo: "Femenino", telefono: "" };

// En pantalla el sexo se muestra abreviado (F / M); la API sigue guardando "Femenino" / "Masculino".
function abreviarSexo(sexo) {
  if (sexo === "Femenino") return "F";
  if (sexo === "Masculino") return "M";
  return sexo || "—";
}

function tituloDe(prestamo) {
  return prestamo.titulo_juego || prestamo.juego?.titulo || "Juego no disponible";
}

// Parámetros que se le mandan a la API según los filtros elegidos en pantalla.
function consultaDe({ buscar, filtroEstado, desde, hasta, orden }) {
  return {
    buscar,
    estado: filtroEstado === "atrasado" ? "activo" : filtroEstado === "todos" ? "" : filtroEstado,
    atrasados: filtroEstado === "atrasado", // activos retirados antes de hoy
    desde,
    hasta,
    ordenar: orden.campo,
    direccion: orden.direccion,
  };
}

// Gestión de préstamos (administrador). Se muestra dentro del PanelLayout.
// Reglas (las valida la API): una persona tiene un solo préstamo activo a la vez,
// y un juego solo puede estar en un préstamo activo.
function Prestamos() {
  const toast = useToast();
  const [juegos, setJuegos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [total, setTotal] = useState(0);
  // Cantidades por estado para la búsqueda y fechas actuales: { activos, atrasados, cerrados, total }.
  const [resumen, setResumen] = useState(null);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [mensajeBusqueda, setMensajeBusqueda] = useState("");
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("activo"); // activo | atrasado | cerrado | todos
  const [texto, setTexto] = useState(""); // lo que se está escribiendo en el buscador
  const [buscar, setBuscar] = useState(""); // el texto ya "asentado" (con retardo al escribir)
  const [desde, setDesde] = useState(""); // fecha de retiro, AAAA-MM-DD
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState({ campo: "fecha", direccion: "desc" });
  const [nuevoJuego, setNuevoJuego] = useState({}); // { [id del préstamo]: id del juego elegido }
  const [ocupado, setOcupado] = useState(null); // id del préstamo que se está procesando

  // Edición de los datos de la persona de un préstamo.
  const [editando, setEditando] = useState(null); // préstamo que se está editando
  const [formEdicion, setFormEdicion] = useState(FORMULARIO_PERSONA);
  const [errorEdicion, setErrorEdicion] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const rangoInvalido = Boolean(desde && hasta && desde > hasta);

  // Espera un momento después de la última tecla para no consultar en cada letra.
  useEffect(() => {
    const espera = setTimeout(() => setBuscar(texto.trim()), 350);
    return () => clearTimeout(espera);
  }, [texto]);

  const cargarJuegos = useCallback(async () => {
    try {
      setJuegos(await listarJuegos());
    } catch (e) {
      setErrorCarga(e.message);
    }
  }, []);

  // Trae los préstamos que coinciden con los filtros. Con "cantidad" se vuelve a pedir
  // todo lo que ya estaba en pantalla (por ejemplo después de devolver un juego).
  const cargarPrestamos = useCallback(
    async (vigente, cantidad = POR_PAGINA) => {
      setErrorCarga("");
      try {
        const datos = await listarHistorialPrestamos({
          ...consultaDe({ buscar, filtroEstado, desde, hasta, orden }),
          limite: Math.min(100, cantidad),
        });
        if (vigente && !vigente.activo) return;
        setPrestamos(datos.items);
        setTotal(datos.total);
        setResumen(datos.resumen ?? null);
      } catch (e) {
        if (!vigente || vigente.activo) setErrorCarga(e.message);
      } finally {
        if (!vigente || vigente.activo) setCargando(false);
      }
    },
    [buscar, filtroEstado, desde, hasta, orden]
  );

  useEffect(() => {
    cargarJuegos();
  }, [cargarJuegos]);

  useEffect(() => {
    if (rangoInvalido) {
      setCargando(false);
      return undefined;
    }
    const vigente = { activo: true };
    setCargando(true);
    cargarPrestamos(vigente);
    return () => {
      vigente.activo = false;
    };
  }, [cargarPrestamos, rangoInvalido]);

  // Después de una acción: refresca los juegos libres y los préstamos que se estaban viendo.
  async function recargar() {
    await Promise.all([
      cargarJuegos(),
      cargarPrestamos(null, Math.max(prestamos.length, POR_PAGINA)),
    ]);
  }

  async function verMas() {
    setCargandoMas(true);
    try {
      const datos = await listarHistorialPrestamos({
        ...consultaDe({ buscar, filtroEstado, desde, hasta, orden }),
        limite: POR_PAGINA,
        desplazamiento: prestamos.length,
      });
      setPrestamos((actuales) => [...actuales, ...datos.items]);
      setTotal(datos.total);
      setResumen(datos.resumen ?? null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCargandoMas(false);
    }
  }

  // Descarga TODO lo que coincide con los filtros (no solo la página en pantalla).
  async function exportar() {
    setExportando(true);
    try {
      const todos = [];
      let desplazamiento = 0;
      let totalRemoto = Infinity;

      while (desplazamiento < totalRemoto) {
        const datos = await listarHistorialPrestamos({
          ...consultaDe({ buscar, filtroEstado, desde, hasta, orden }),
          limite: 100,
          desplazamiento,
        });
        if (datos.items.length === 0) break;
        todos.push(...datos.items);
        totalRemoto = datos.total;
        desplazamiento += datos.items.length;
      }

      descargarCsv("prestamos", [
        ENCABEZADO_CSV_PRESTAMOS,
        ...todos.map((p) =>
          filaCsvPrestamo({
            retirado: p.fecha_inicio,
            juego: tituloDe(p),
            nombre: p.nombre,
            dni: p.dni,
            telefono: p.telefono,
            estado: p.estado,
            cierre: p.fecha_cierre,
            atraso: diasSinDevolver(p),
          })
        ),
      ]);
    } catch (e) {
      toast.error(e.message || "No se pudo descargar el CSV.");
    } finally {
      setExportando(false);
    }
  }

  // Solo se puede prestar (o cambiar por) un juego de la ludoteca que no esté ya en préstamo.
  const juegosLibres = juegos.filter((j) => j.se_presta && !j.en_prestamo);
  const hayJuegosDeLudoteca = juegos.some((j) => j.se_presta);

  const cantidadPorEstado = {
    activo: resumen?.activos,
    atrasado: resumen?.atrasados,
    cerrado: resumen?.cerrados,
    todos: resumen?.total,
  };

  const etiquetaEstado =
    filtroEstado === "activo"
      ? "activos"
      : filtroEstado === "atrasado"
        ? "sin devolver"
        : filtroEstado === "cerrado"
          ? "cerrados"
          : "registrados";

  function cambiar(campo, valor) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function buscarPersona() {
    const dni = form.dni.trim();
    setMensajeBusqueda("");
    if (!/^[0-9]{6,9}$/.test(dni)) return;
    setBuscandoPersona(true);
    try {
      const persona = await buscarPersonaPorDni(dni);
      if (persona.encontrado) {
        setForm((anterior) => ({
          ...anterior,
          nombre: persona.nombre || anterior.nombre,
          sexo: persona.sexo || anterior.sexo,
          telefono: persona.telefono || anterior.telefono,
        }));
        setMensajeBusqueda("Encontramos datos previos para este DNI; podés corregirlos si hace falta.");
      } else {
        setMensajeBusqueda("No hay datos previos para este DNI. Completá nombre y apellido y los demás datos.");
      }
    } catch (err) {
      setMensajeBusqueda(`No se pudieron buscar los datos: ${err.message}`);
    } finally {
      setBuscandoPersona(false);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    setErrorForm("");
    setGuardando(true);
    try {
      await registrarPrestamo({
        juego_id: Number(form.juego_id),
        nombre: form.nombre.trim(),
        dni: form.dni.trim(),
        sexo: form.sexo,
        telefono: form.telefono.trim(),
      });
      setForm(FORMULARIO_VACIO);
      setMensajeBusqueda("");
      setFormAbierto(false);
      toast.exito("Préstamo registrado.");
      await recargar();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  function abrirEdicion(prestamo) {
    setErrorEdicion("");
    setFormEdicion({
      dni: prestamo.dni ?? "",
      nombre: prestamo.nombre ?? "",
      sexo: prestamo.sexo ?? "Femenino",
      telefono: prestamo.telefono ?? "",
    });
    setEditando(prestamo);
  }

  function cambiarEdicion(campo, valor) {
    setFormEdicion((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setErrorEdicion("");
    setGuardandoEdicion(true);
    try {
      await editarPrestamo(editando.id, {
        dni: formEdicion.dni.trim(),
        nombre: formEdicion.nombre.trim(),
        sexo: formEdicion.sexo,
        telefono: formEdicion.telefono.trim(),
      });
      setEditando(null);
      toast.exito("Préstamo actualizado.");
      await recargar();
    } catch (err) {
      setErrorEdicion(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function cambiarJuego(prestamo) {
    const elegido = nuevoJuego[prestamo.id];
    if (!elegido) return;
    setOcupado(prestamo.id);
    try {
      const actualizado = await cambiarJuegoPrestamo(prestamo.id, Number(elegido));
      setNuevoJuego((anterior) => ({ ...anterior, [prestamo.id]: "" }));
      toast.exito(`Juego cambiado a "${actualizado.juego.titulo}".`);
      await recargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  }

  async function deshacerDevolucion(prestamo) {
    setOcupado(prestamo.id);
    try {
      await reabrirPrestamo(prestamo.id);
      toast.exito(`Devolución deshecha: "${tituloDe(prestamo)}" vuelve a estar prestado a ${prestamo.nombre}.`);
      await recargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  }

  async function devolver(prestamo) {
    if (
      !window.confirm(
        `¿Registrar la devolución de "${tituloDe(prestamo)}" de ${prestamo.nombre} (DNI ${prestamo.dni})?`
      )
    ) {
      return;
    }
    setOcupado(prestamo.id);
    try {
      await devolverPrestamo(prestamo.id);
      toast.exito("Devolución registrada. El juego quedó disponible.", {
        duracion: 10000,
        accion: {
          texto: "Deshacer",
          onClick: () => deshacerDevolucion(prestamo),
        },
      });
      await recargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      <h1>Gestión de préstamos</h1>
      <p className="subtitulo">Registrá quién se lleva un juego, cambialo o registrá su devolución.</p>

      <button
        type="button"
        className="boton"
        style={{ width: "auto", marginBottom: 28 }}
        onClick={() => {
          setErrorForm("");
          setFormAbierto(true);
        }}
      >
        Registrar préstamo
      </button>

      {formAbierto && (
        <Modal
          titulo="Registrar préstamo"
          ocupado={guardando}
          onCerrar={() => setFormAbierto(false)}
        >
        <form className="formulario" onSubmit={enviar} aria-busy={guardando}>
          <div className="campo">
            <label htmlFor="juego_id">Juego disponible</label>
            <select
              id="juego_id"
              value={form.juego_id}
              onChange={(e) => cambiar("juego_id", e.target.value)}
              required
            >
              <option value="">Seleccioná un juego</option>
              {juegosLibres.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.titulo}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="dni">DNI (solo números)</label>
            <input
              id="dni"
              value={form.dni}
              onChange={(e) => cambiar("dni", e.target.value.replace(/\D/g, "").slice(0, 9))}
              onBlur={buscarPersona}
              inputMode="numeric"
              pattern="[0-9]{6,9}"
              title="Entre 6 y 9 números, sin puntos"
              maxLength={9}
              autoComplete="off"
              required
            />
            {buscandoPersona && <small>Buscando datos por DNI...</small>}
            {mensajeBusqueda && <small role="status">{mensajeBusqueda}</small>}
          </div>
          <div className="campo">
            <label htmlFor="nombre">Nombre y apellido</label>
            <input
              id="nombre"
              value={form.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              minLength={2}
              maxLength={100}
              autoComplete="name"
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="sexo">Sexo</label>
            <select id="sexo" value={form.sexo} onChange={(e) => cambiar("sexo", e.target.value)} required>
              <option value="Femenino">F</option>
              <option value="Masculino">M</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
              type="tel"
              value={form.telefono}
              onChange={(e) => cambiar("telefono", e.target.value)}
              maxLength={30}
              autoComplete="off"
              required
            />
          </div>

          {errorForm && (
            <span className="error" role="alert">
              {errorForm}
            </span>
          )}

          <button className="boton" type="submit" disabled={guardando || juegosLibres.length === 0}>
            {guardando ? "Guardando..." : "Registrar préstamo"}
          </button>
          {!cargando && juegosLibres.length === 0 && (
            <p>
              {hayJuegosDeLudoteca
                ? "No hay juegos disponibles: todos están en préstamo."
                : "Todavía no hay juegos marcados como \"Disponible para préstamo\". Tildá esa opción al editar cada juego de la ludoteca."}
            </p>
          )}
        </form>
        </Modal>
      )}

      {editando && (
        <Modal
          titulo={`Editar préstamo de ${editando.nombre}`}
          ocupado={guardandoEdicion}
          onCerrar={() => setEditando(null)}
        >
          <form className="formulario" onSubmit={guardarEdicion} aria-busy={guardandoEdicion}>
            <p className="subtitulo" style={{ marginTop: 0 }}>
              Juego: <strong>{tituloDe(editando)}</strong>. Para cambiarlo usá "Cambiar juego" en la
              lista.
            </p>
            <div className="campo">
              <label htmlFor="editar-dni">DNI (solo números)</label>
              <input
                id="editar-dni"
                value={formEdicion.dni}
                onChange={(e) => cambiarEdicion("dni", e.target.value.replace(/\D/g, "").slice(0, 9))}
                inputMode="numeric"
                pattern="[0-9]{6,9}"
                title="Entre 6 y 9 números, sin puntos"
                maxLength={9}
                autoComplete="off"
                required
              />
              <small>Si corregís el DNI, el cambio vale solo para este préstamo.</small>
            </div>
            <div className="campo">
              <label htmlFor="editar-nombre">Nombre y apellido</label>
              <input
                id="editar-nombre"
                value={formEdicion.nombre}
                onChange={(e) => cambiarEdicion("nombre", e.target.value)}
                minLength={2}
                maxLength={100}
                autoComplete="off"
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="editar-sexo">Sexo</label>
              <select
                id="editar-sexo"
                value={formEdicion.sexo}
                onChange={(e) => cambiarEdicion("sexo", e.target.value)}
                required
              >
                <option value="Femenino">F</option>
                <option value="Masculino">M</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor="editar-telefono">Teléfono</label>
              <input
                id="editar-telefono"
                type="tel"
                value={formEdicion.telefono}
                onChange={(e) => cambiarEdicion("telefono", e.target.value)}
                maxLength={30}
                autoComplete="off"
                required
              />
            </div>

            {errorEdicion && (
              <span className="error" role="alert">
                {errorEdicion}
              </span>
            )}

            <div className="modal-acciones">
              <button className="boton" type="submit" disabled={guardandoEdicion}>
                {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                className="boton boton-secundario"
                type="button"
                disabled={guardandoEdicion}
                onClick={() => setEditando(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="prestamos-cabecera">
        <h2>Préstamos</h2>
        <button
          type="button"
          className="boton boton-secundario"
          style={{ width: "auto" }}
          disabled={exportando || total === 0}
          onClick={exportar}
        >
          {exportando ? "Preparando..." : "Descargar CSV"}
        </button>
      </div>

      <div className="prestamos-filtros">
        <FiltroSelect
          id="prestamos-estado"
          etiqueta="Estado"
          valor={filtroEstado}
          onCambio={setFiltroEstado}
          opciones={FILTROS_ESTADO.map((f) => ({
            valor: f.valor,
            texto:
              cantidadPorEstado[f.valor] !== undefined
                ? `${f.texto} (${cantidadPorEstado[f.valor]})`
                : f.texto,
          }))}
        />

        <div className="prestamos-busqueda">
          <label htmlFor="prestamos-buscar" className="solo-lectores">
            Buscar préstamos por DNI, juego o nombre
          </label>
          <input
            id="prestamos-buscar"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por DNI, juego o nombre..."
          />
        </div>

        <FiltroFechas
          desde={desde}
          hasta={hasta}
          onDesde={setDesde}
          onHasta={setHasta}
        />
      </div>

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando préstamos...
        </p>
      ) : rangoInvalido ? (
        <p>La fecha «Desde» no puede ser posterior a «Hasta».</p>
      ) : errorCarga ? (
        <div role="alert">
          <span className="error">{errorCarga}</span>
          <button
            className="boton"
            style={{ width: "auto", marginTop: 12 }}
            onClick={() => {
              setCargando(true);
              cargarJuegos();
              cargarPrestamos({ activo: true });
            }}
          >
            Reintentar
          </button>
        </div>
      ) : prestamos.length === 0 ? (
        <p>
          {`No hay préstamos ${etiquetaEstado}${
            buscar ? ` que coincidan con "${buscar}"` : ""
          }${desde || hasta ? " en ese rango de fechas" : ""}.`}
        </p>
      ) : (
        <>
        <div style={{ overflowX: "auto" }}>
          <table className="tabla">
            <caption className="solo-lectores">Lista de préstamos</caption>
            <thead>
              <tr>
                <ThOrdenable
                  etiqueta="Retirado"
                  campo="fecha"
                  orden={orden}
                  onOrdenar={(c) => setOrden((o) => siguienteOrden(o, c))}
                />
                <ThOrdenable
                  etiqueta="Juego"
                  campo="juego"
                  orden={orden}
                  onOrdenar={(c) => setOrden((o) => siguienteOrden(o, c))}
                />
                <ThOrdenable
                  etiqueta="Nombre y apellido"
                  campo="cliente"
                  orden={orden}
                  onOrdenar={(c) => setOrden((o) => siguienteOrden(o, c))}
                />
                {["DNI", "Teléfono", "Sexo"].map((t) => (
                  <th key={t} scope="col">
                    {t}
                  </th>
                ))}
                <ThOrdenable
                  etiqueta="Estado"
                  campo="estado"
                  orden={orden}
                  onOrdenar={(c) => setOrden((o) => siguienteOrden(o, c))}
                />
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {prestamos.map((p) => (
                <tr key={p.id} className={diasSinDevolver(p) > 0 ? "fila-atrasada" : undefined}>
                  <td>{fechaHoraArgentina(p.fecha_inicio)}</td>
                  <td>{tituloDe(p)}</td>
                  <td>{p.nombre}</td>
                  <td>{p.dni}</td>
                  <td>{p.telefono}</td>
                  <td>{abreviarSexo(p.sexo)}</td>
                  <td>
                    {p.estado === "activo"
                      ? "Activo"
                      : `Cerrado (${new Date(p.fecha_cierre).toLocaleDateString("es-AR")})`}
                    {diasSinDevolver(p) > 0 && (
                      <span className="badge-atraso" title="Se retiró antes de hoy y sigue sin devolverse">
                        Sin devolver · {textoDiasSinDevolver(diasSinDevolver(p))}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="acciones-prestamo">
                      {p.estado === "activo" && (
                        <div className="acciones-prestamo-cambiar">
                          <select
                            aria-label={`Nuevo juego para ${p.nombre}`}
                            value={nuevoJuego[p.id] ?? ""}
                            onChange={(e) => setNuevoJuego((a) => ({ ...a, [p.id]: e.target.value }))}
                          >
                            <option value="">Elegir otro juego...</option>
                            {juegosLibres.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.titulo}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="boton boton-chico"
                            disabled={!nuevoJuego[p.id] || ocupado === p.id}
                            onClick={() => cambiarJuego(p)}
                          >
                            Cambiar juego
                          </button>
                        </div>
                      )}

                      <div className="acciones-prestamo-botones">
                        {p.estado === "activo" && (
                          <button
                            type="button"
                            className="boton boton-chico"
                            disabled={ocupado === p.id}
                            onClick={() => devolver(p)}
                          >
                            Devolver
                          </button>
                        )}
                        {p.estado !== "activo" && sePuedeDeshacer(p) && (
                          <button
                            type="button"
                            className="boton boton-secundario boton-chico"
                            disabled={ocupado === p.id}
                            title="Solo disponible hasta 48 horas después de la devolución"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `¿Deshacer la devolución de "${tituloDe(p)}"? Vuelve a figurar prestado a ${p.nombre}.`
                                )
                              ) {
                                deshacerDevolucion(p);
                              }
                            }}
                          >
                            Deshacer devolución
                          </button>
                        )}
                        <button
                          type="button"
                          className="boton boton-secundario boton-chico"
                          disabled={ocupado === p.id}
                          onClick={() => abrirEdicion(p)}
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mensajes-pie">
          Mostrando {prestamos.length} de {total}
        </p>

        {prestamos.length < total && (
          <button
            type="button"
            className="boton mensajes-mas"
            disabled={cargandoMas}
            onClick={verMas}
          >
            {cargandoMas ? "Cargando..." : "Ver más"}
          </button>
        )}
        </>
      )}
    </div>
  );
}

export default Prestamos;