
import { useCallback, useEffect, useState } from "react";
import {
  actualizarUsuarioAdmin,
  listarUsuariosAdmin,
} from "../api/api";

export default function GestionarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(null);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const datos = await listarUsuariosAdmin(buscar);
      setUsuarios(Array.isArray(datos) ? datos : []);
    } catch (e) {
      setError(e.message || "No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  }, [buscar]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  async function modificarUsuario(usuario, cambios) {
    setError("");
    setMensaje("");
    setProcesando(usuario.id);

    try {
      await actualizarUsuarioAdmin(usuario.id, cambios);
      setMensaje("Usuario actualizado correctamente.");
      await cargarUsuarios();
    } catch (e) {
      setError(e.message || "No se pudo actualizar el usuario.");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <section className="gestionar-usuarios">
      <h1>Gestionar usuarios</h1>
      <p>
        Administrá las cuentas registradas, sus permisos y su estado.
      </p>

      <div className="gestionar-usuarios__busqueda">
        <label htmlFor="buscar-usuario">
          Buscar por nombre o correo electrónico
        </label>
        <input
          id="buscar-usuario"
          type="search"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Escribí un nombre o correo..."
        />
      </div>

      {error && (
        <p role="alert" className="gestionar-usuarios__error">
          {error}
        </p>
      )}

      {mensaje && (
        <p role="status" className="gestionar-usuarios__mensaje">
          {mensaje}
        </p>
      )}

      {cargando ? (
        <p>Cargando usuarios...</p>
      ) : usuarios.length === 0 ? (
        <p>No se encontraron usuarios.</p>
      ) : (
        <div className="gestionar-usuarios__tabla-contenedor">
          <table className="gestionar-usuarios__tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo electrónico</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.email}</td>

                  <td>
                    <select
                      aria-label={`Rol de ${usuario.nombre}`}
                      value={usuario.es_admin ? "admin" : "cliente"}
                      disabled={
                        procesando === usuario.id ||
                        !usuario.activo
                      }
                      onChange={(e) => {
                        const es_admin = e.target.value === "admin";

                        if (
                          window.confirm(
                            `¿Querés cambiar el rol de ${usuario.nombre} a ${
                              es_admin ? "administrador" : "cliente"
                            }?`
                          )
                        ) {
                          modificarUsuario(usuario, { es_admin });
                        } else {
                          e.target.value = usuario.es_admin
                            ? "admin"
                            : "cliente";
                        }
                      }}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>

                  <td>
                    <span
                      className={
                        usuario.activo
                          ? "usuario-estado usuario-estado--activo"
                          : "usuario-estado usuario-estado--inactivo"
                      }
                    >
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      disabled={procesando === usuario.id}
                      onClick={() => {
                        const nuevoEstado = !usuario.activo;
                        const accion = nuevoEstado
                          ? "activar"
                          : "desactivar";

                        if (
                          window.confirm(
                            `¿Querés ${accion} la cuenta de ${usuario.nombre}?`
                          )
                        ) {
                          modificarUsuario(usuario, {
                            activo: nuevoEstado,
                          });
                        }
                      }}
                    >
                      {procesando === usuario.id
                        ? "Guardando..."
                        : usuario.activo
                          ? "Desactivar"
                          : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
