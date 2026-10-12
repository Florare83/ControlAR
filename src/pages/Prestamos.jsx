import { useEffect, useState } from "react";
import { listarJuegos, listarPrestamos, crearPrestamo, actualizarDevolucion } from "../api/api.js";

const FORMULARIO_VACIO = { titulo_juego: "", dni: "", telefono: "", genero: "Femenino", devuelto: false };

function Prestamos() {
  const [juegos, setJuegos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    setError("");
    try {
      const [listaJuegos, listaPrestamos] = await Promise.all([listarJuegos(), listarPrestamos()]);
      setJuegos(listaJuegos);
      setPrestamos(listaPrestamos);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }

  useEffect(() => { cargar(); }, []);

  function cambiar(campo, valor) { setForm((anterior) => ({ ...anterior, [campo]: valor })); }

  async function enviar(e) {
    e.preventDefault(); setError(""); setMensaje(""); setGuardando(true);
    try {
      await crearPrestamo({ ...form, dni: form.dni.trim(), telefono: form.telefono.trim() });
      setForm(FORMULARIO_VACIO);
      setMensaje("Préstamo registrado correctamente");
      await cargar();
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  }

  async function marcarDevolucion(prestamo) {
    try {
      await actualizarDevolucion(prestamo.id, !prestamo.devuelto);
      setMensaje(!prestamo.devuelto ? "Devolución registrada" : "Préstamo marcado como no devuelto");
      await cargar();
    } catch (e) { setError(e.message); }
  }

  return (
    <main className="pagina">
      <h1>Gestión de préstamos</h1>
      <p className="subtitulo">Página exclusiva para administradores. Los registros se guardan en la base de datos.</p>
      {mensaje && <p className="mensaje-exito" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <section className="tarjeta" style={{ marginBottom: 28 }}>
        <h2>Registrar préstamo</h2>
        <form className="formulario" onSubmit={enviar}>
          <div className="campo">
            <label htmlFor="titulo_juego">Título del juego</label>
            <select id="titulo_juego" value={form.titulo_juego} onChange={(e) => cambiar("titulo_juego", e.target.value)} required>
              <option value="">Seleccioná un juego</option>
              {juegos.map((j) => <option key={j.id} value={j.titulo}>{j.titulo}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="dni">DNI</label>
            <input id="dni" value={form.dni} onChange={(e) => cambiar("dni", e.target.value)} inputMode="numeric" maxLength={20} required />
          </div>
          <div className="campo">
            <label htmlFor="telefono">Teléfono</label>
            <input id="telefono" type="tel" value={form.telefono} onChange={(e) => cambiar("telefono", e.target.value)} maxLength={30} required />
          </div>
          <div className="campo">
            <label htmlFor="genero">Género</label>
            <select id="genero" value={form.genero} onChange={(e) => cambiar("genero", e.target.value)} required>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
            </select>
          </div>
          <div className="campo">
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={form.devuelto} onChange={(e) => cambiar("devuelto", e.target.checked)} style={{ width: "auto" }} />
              Ya fue devuelto
            </label>
          </div>
          <button className="boton" type="submit" disabled={guardando || juegos.length === 0}>
            {guardando ? "Guardando..." : "Registrar préstamo"}
          </button>
          {juegos.length === 0 && !cargando && <p>No hay juegos disponibles en el catálogo para seleccionar.</p>}
        </form>
      </section>

      <h2>Préstamos registrados</h2>
      {cargando ? <p>Cargando préstamos...</p> : prestamos.length === 0 ? <p>Todavía no hay préstamos registrados.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--blanco)" }}>
            <thead><tr>{["Juego", "DNI", "Teléfono", "Género", "Devolución", "Acción"].map((t) => <th key={t} style={{ padding: 12, textAlign: "left", borderBottom: "1px solid var(--borde)" }}>{t}</th>)}</tr></thead>
            <tbody>{prestamos.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: 12, borderBottom: "1px solid var(--borde)" }}>{p.titulo_juego}</td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--borde)" }}>{p.dni}</td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--borde)" }}>{p.telefono}</td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--borde)" }}>{p.genero}</td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--borde)" }}>{p.devuelto ? "Sí" : "No"}</td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--borde)" }}>
                  <button className="boton" style={{ width: "auto" }} onClick={() => marcarDevolucion(p)}>{p.devuelto ? "Marcar no devuelto" : "Registrar devolución"}</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default Prestamos;
