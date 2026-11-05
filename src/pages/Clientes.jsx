import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  editarCliente,
  eliminarCliente,
  listarClientes,
  registrarCliente,
} from "../api/api.js";
import Modal from "../components/Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";

const POR_PAGINA = 20;

const FORMULARIO_VACIO = { dni: "", nombre: "", sexo: "", telefono: "" };

// Clientes del club registrados por su DNI, sin correo ni cuenta (solo administrador).
// Desde acá se llega al historial de préstamos de cada persona, que se cruza por DNI.
function Clientes() {
  const toast = useToast();

  const [texto, setTexto] = useState("");
  const [buscar, setBuscar] = useState(""); // texto ya "asentado" (con retardo al escribir)
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState("");

  // null = cerrado | { cliente: null } = registrar | { cliente: {...} } = editar
  const [ventana, setVentana] = useState(null);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Espera un momento después de la última tecla para no consultar en cada letra.
  useEffect(() => {
    const espera = setTimeout(() => setBuscar(texto.trim()), 350);
    return () => clearTimeout(espera);
  }, [texto]);

  const cargar = useCallback(
    async (vigente) => {
      setError("");
      setCargando(true);
      try {
        const datos = await listarClientes({ buscar, limite: POR_PAGINA });
        if (!vigente.activo) return;
        setItems(datos.items);
        setTotal(datos.total);
      } catch (e) {
        if (vigente.activo) setError(e.message);
      } finally {
        if (vigente.activo) setCargando(false);
      }
    },
    [buscar]
  );

  useEffect(() => {
    const vigente = { activo: true };
    cargar(vigente);
    return () => {
      vigente.activo = false;
    };
  }, [cargar]);

  async function verMas() {
    setCargandoMas(true);
    try {
      const datos = await listarClientes({
        buscar,
        limite: POR_PAGINA,
        desplazamiento: items.length,
      });
      setItems((actuales) => [...actuales, ...datos.items]);
      setTotal(datos.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoMas(false);
    }
  }

  function abrirRegistro() {
    setForm(FORMULARIO_VACIO);
    setErrorForm("");
    setVentana({ cliente: null });
  }

  function abrirEdicion(cliente) {
    setForm({
      dni: cliente.dni,
      nombre: cliente.nombre,
      sexo: cliente.sexo || "",
      telefono: cliente.telefono || "",
    });
    setErrorForm("");
    setVentana({ cliente });
  }

  function cambiar(campo, valor) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    setErrorForm("");
    setGuardando(true);

    const datos = {
      nombre: form.nombre.trim(),
      sexo: form.sexo || null,
      telefono: form.telefono.trim() || null,
    };

    try {
      if (ventana.cliente) {
        await editarCliente(ventana.cliente.id, datos);
        toast.exito("Cliente actualizado.");
      } else {
        await registrarCliente({ ...datos, dni: form.dni.trim() });
        toast.exito("Cliente registrado.");
      }
      setVentana(null);
      await cargar({ activo: true });
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(cliente) {
    if (
      !window.confirm(
        `¿Eliminar a ${cliente.nombre} (DNI ${cliente.dni})? Usalo solo si cargaste mal el DNI.`
      )
    ) {
      return;
    }

    try {
      await eliminarCliente(cliente.id);
      toast.exito("Cliente eliminado.");
      await cargar({ activo: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  const editando = Boolean(ventana?.cliente);

  return (
    <div>
      <h1>Clientes</h1>
      <p className="subtitulo">
        Personas del club registradas por su DNI, sin correo ni cuenta: no
        pueden iniciar sesión. Con el DNI se vinculan sus préstamos y podés ver
        el historial de cada una. Quien se lleva un juego queda registrado
        automáticamente.
      </p>

      <div className="historial-herramientas">
        <div className="campo historial-buscador">
          <label htmlFor="clientes-buscar">Buscar</label>
          <input
            id="clientes-buscar"
            type="search"
            value={texto}
            maxLength={100}
            placeholder="Buscar por nombre o DNI..."
            autoComplete="off"
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="boton"
          style={{ width: "auto" }}
          onClick={abrirRegistro}
        >
          Registrar cliente
        </button>
      </div>

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando clientes...
        </p>
      ) : error ? (
        <div role="alert">
          <span className="error">{error}</span>
          <button
            className="boton"
            style={{ width: "auto", marginTop: 12 }}
            onClick={() => cargar({ activo: true })}
          >
            Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="tarjeta">
          <p>
            {buscar
              ? `No hay clientes que coincidan con "${buscar}".`
              : "Todavía no hay clientes registrados."}
          </p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="tabla">
              <caption className="solo-lectores">Clientes registrados</caption>
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">DNI</th>
                  <th scope="col">Teléfono</th>
                  <th scope="col">Préstamos</th>
                  <th scope="col">Cuenta web</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.dni}</td>
                    <td>{c.telefono || "—"}</td>
                    <td>
                      {c.prestamos_total}
                      {c.prestamos_activos > 0 && (
                        <small className="historial-fecha-cierre">
                          {" "}
                          · {c.prestamos_activos} en préstamo
                        </small>
                      )}
                    </td>
                    <td>{c.con_cuenta ? "Con cuenta" : "Sin cuenta"}</td>
                    <td>
                      <Link
                        className="usuario-enlace-historial"
                        to={`/panel/historial?dni=${encodeURIComponent(c.dni)}`}
                        aria-label={`Ver el historial de préstamos de ${c.nombre}`}
                      >
                        Ver historial
                      </Link>
                      {" · "}
                      <button
                        type="button"
                        className="usuario-enlace-historial"
                        style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}
                        onClick={() => abrirEdicion(c)}
                        aria-label={`Editar a ${c.nombre}`}
                      >
                        Editar
                      </button>
                      {c.prestamos_total === 0 && (
                        <>
                          {" · "}
                          <button
                            type="button"
                            className="usuario-enlace-historial"
                            style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}
                            onClick={() => eliminar(c)}
                            aria-label={`Eliminar a ${c.nombre}`}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mensajes-pie">
            Mostrando {items.length} de {total}
          </p>

          {items.length < total && (
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

      {ventana && (
        <Modal
          titulo={editando ? `Editar a ${ventana.cliente.nombre}` : "Registrar cliente"}
          ocupado={guardando}
          onCerrar={() => setVentana(null)}
        >
          <form className="formulario" onSubmit={guardar} aria-busy={guardando}>
            <div className="campo">
              <label htmlFor="cliente-dni">DNI (solo números)</label>
              <input
                id="cliente-dni"
                value={form.dni}
                onChange={(e) =>
                  cambiar("dni", e.target.value.replace(/\D/g, "").slice(0, 9))
                }
                inputMode="numeric"
                pattern="[0-9]{6,9}"
                title="Entre 6 y 9 números, sin puntos"
                maxLength={9}
                autoComplete="off"
                disabled={editando}
                required
              />
              {editando && (
                <small>
                  El DNI no se cambia: es lo que une a la persona con sus
                  préstamos. Si lo cargaste mal, eliminá la ficha y registrala
                  de nuevo.
                </small>
              )}
            </div>

            <div className="campo">
              <label htmlFor="cliente-nombre">Nombre y apellido</label>
              <input
                id="cliente-nombre"
                value={form.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
                minLength={2}
                maxLength={100}
                autoComplete="off"
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="cliente-sexo">Sexo (opcional)</label>
              <select
                id="cliente-sexo"
                value={form.sexo}
                onChange={(e) => cambiar("sexo", e.target.value)}
              >
                <option value="">Sin indicar</option>
                <option value="Femenino">F</option>
                <option value="Masculino">M</option>
              </select>
            </div>

            <div className="campo">
              <label htmlFor="cliente-telefono">Teléfono (opcional)</label>
              <input
                id="cliente-telefono"
                type="tel"
                value={form.telefono}
                onChange={(e) => cambiar("telefono", e.target.value)}
                maxLength={30}
                autoComplete="off"
              />
            </div>

            {errorForm && (
              <span className="error" role="alert">
                {errorForm}
              </span>
            )}

            <button className="boton" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Registrar cliente"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Clientes;
