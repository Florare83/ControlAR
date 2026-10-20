import { useEffect, useState } from "react";
import {
  listarJuegos,
  listarPrestamos,
  registrarPrestamo,
  buscarPersonaPorDni,
  cambiarJuegoPrestamo,
  devolverPrestamo,
} from "../api/api.js";
import { useToast } from "../context/ToastContext.jsx";

const FORMULARIO_VACIO = { juego_id: "", dni: "", nombre: "", email: "", sexo: "Femenino", telefono: "" };

// Gestión de préstamos (operador y administrador). Se muestra dentro del PanelLayout.
// Reglas (las valida la API): una persona tiene un solo préstamo activo a la vez,
// y un juego solo puede estar en un préstamo activo.
function Prestamos() {
  const toast = useToast();
  const [juegos, setJuegos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [mensajeBusqueda, setMensajeBusqueda] = useState("");
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [verCerrados, setVerCerrados] = useState(false);
  const [nuevoJuego, setNuevoJuego] = useState({}); // { [id del préstamo]: id del juego elegido }
  const [ocupado, setOcupado] = useState(null); // id del préstamo que se está procesando

  async function cargar() {
    setErrorCarga("");
    try {
      const [listaJuegos, listaPrestamos] = await Promise.all([listarJuegos(), listarPrestamos()]);
      setJuegos(listaJuegos);
      setPrestamos(listaPrestamos);
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  // Solo se puede prestar (o cambiar por) un juego que no esté ya en préstamo.
  const juegosLibres = juegos.filter((j) => !j.en_prestamo);
  const prestamosVisibles = prestamos.filter((p) => verCerrados || p.estado === "activo");

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
          email: persona.email || anterior.email,
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
        email: form.email.trim() || null,
        sexo: form.sexo,
        telefono: form.telefono.trim(),
      });
      setForm(FORMULARIO_VACIO);
      setMensajeBusqueda("");
      toast.exito("Préstamo registrado.");
      await cargar();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
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
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  }

  async function devolver(prestamo) {
    if (!window.confirm(`¿Registrar la devolución de "${prestamo.juego.titulo}"?`)) return;
    setOcupado(prestamo.id);
    try {
      await devolverPrestamo(prestamo.id);
      toast.exito("Devolución registrada. El juego quedó disponible.");
      await cargar();
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

      <section className="tarjeta tarjeta-columna" style={{ marginBottom: 28 }} aria-labelledby="titulo-registrar">
        <h2 id="titulo-registrar">Registrar préstamo</h2>
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
            <label htmlFor="email">E-mail (opcional)</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => cambiar("email", e.target.value)}
              maxLength={255}
              autoComplete="email"
            />
          </div>
          <div className="campo">
            <label htmlFor="sexo">Sexo</label>
            <select id="sexo" value={form.sexo} onChange={(e) => cambiar("sexo", e.target.value)} required>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
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
            <p>No hay juegos disponibles: todos están en préstamo.</p>
          )}
        </form>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h2>Préstamos {verCerrados ? "registrados" : "activos"}</h2>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" checked={verCerrados} onChange={(e) => setVerCerrados(e.target.checked)} />
          Mostrar también los cerrados
        </label>
      </div>

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando préstamos...
        </p>
      ) : errorCarga ? (
        <div role="alert">
          <span className="error">{errorCarga}</span>
          <button className="boton" style={{ width: "auto", marginTop: 12 }} onClick={cargar}>
            Reintentar
          </button>
        </div>
      ) : prestamosVisibles.length === 0 ? (
        <p>No hay préstamos {verCerrados ? "registrados" : "activos"}.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="tabla">
            <caption className="solo-lectores">Lista de préstamos</caption>
            <thead>
              <tr>
                {["Juego", "Nombre y apellido", "DNI", "E-mail", "Teléfono", "Sexo", "Estado", "Acciones"].map((t) => (
                  <th key={t} scope="col">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prestamosVisibles.map((p) => (
                <tr key={p.id}>
                  <td>{p.juego.titulo}</td>
                  <td>{p.nombre}</td>
                  <td>{p.dni}</td>
                  <td>{p.email || "—"}</td>
                  <td>{p.telefono}</td>
                  <td>{p.sexo}</td>
                  <td>
                    {p.estado === "activo"
                      ? "Activo"
                      : `Cerrado (${new Date(p.fecha_cierre).toLocaleDateString("es-AR")})`}
                  </td>
                  <td>
                    {p.estado === "activo" ? (
                      <div className="acciones-fila">
                        <select
                          aria-label={`Nuevo juego para ${p.nombre}`}
                          value={nuevoJuego[p.id] ?? ""}
                          onChange={(e) => setNuevoJuego((a) => ({ ...a, [p.id]: e.target.value }))}
                        >
                          <option value="">Cambiar por...</option>
                          {juegosLibres.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.titulo}
                            </option>
                          ))}
                        </select>
                        <button
                          className="boton"
                          style={{ width: "auto" }}
                          disabled={!nuevoJuego[p.id] || ocupado === p.id}
                          onClick={() => cambiarJuego(p)}
                        >
                          Cambiar
                        </button>
                        <button
                          className="boton"
                          style={{ width: "auto" }}
                          disabled={ocupado === p.id}
                          onClick={() => devolver(p)}
                        >
                          Devolver
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Prestamos;