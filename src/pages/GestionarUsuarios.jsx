
import { useCallback, useEffect, useState } from "react";
import {
  actualizarUsuarioAdmin,
  crearUsuarioAdmin,
  listarUsuariosAdmin,
} from "../api/api";

const FORMULARIO_VACIO = {
  nombre: "",
  email: "",
  contrasena: "",
  repetir: "",
  es_admin: false,
};

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GestionarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [creando, setCreando] = useState(false);

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

  function cambiarCampo(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function abrirFormulario() {
    setForm(FORMULARIO_VACIO);
    setErrorForm("");
    setFormAbierto(true);
  }

  function cerrarFormulario() {
    setFormAbierto(false);
    setErrorForm("");
  }

  async function crearUsuario(evento) {
    evento.preventDefault();
    setErrorForm("");

    const nombre = form.nombre.trim();
    const email = form.email.trim();

    if (!nombre) {
      setErrorForm("Ingresá el nombre del usuario.");
      return;
    }

    if (!EMAIL_VALIDO.test(email)) {
      setErrorForm("Ingresá un correo electrónico válido.");
      return;
    }

    if (form.contrasena.length < 8) {
      setErrorForm("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (form.contrasena !== form.repetir) {
      setErrorForm("Las contraseñas no coinciden.");
      return;
    }

    setCreando(true);
    setError("");
    setMensaje("");

    try {
      await crearUsuarioAdmin({
        nombre,
        email,
        contrasena: form.contrasena,
        es_admin: form.es_admin,
      });

      setMensaje(`Usuario ${nombre} creado correctamente.`);
      setFormAbierto(false);
      setForm(FORMULARIO_VACIO);
      await cargarUsuarios();
    } catch (e) {
      setErrorForm(e.message || "No se pudo crear el usuario.");
    } finally {
      setCreando(false);
    }
  }

  return (
    <section className="gestionar-usuarios">
      <div
        className="tarjeta"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          padding: "24px",
        }}
      >
        <div className="usuarios-cabecera">
          <div>
            <h1>Gestionar usuarios</h1>

            <p>
              Administrá las cuentas registradas, sus permisos y su estado.
            </p>
          </div>

          {!formAbierto && (
            <button
              type="button"
              className="boton usuarios-nuevo-boton"
              onClick={abrirFormulario}
            >
              + Nuevo usuario
            </button>
          )}
        </div>

        {formAbierto && (
          <form
            className="usuario-nuevo"
            onSubmit={crearUsuario}
            noValidate
            aria-label="Nuevo usuario"
          >
            <h2>Nuevo usuario</h2>

            <div className="usuario-nuevo-grilla">
              <div className="campo">
                <label htmlFor="nuevo-nombre">Nombre</label>
                <input
                  id="nuevo-nombre"
                  type="text"
                  autoComplete="off"
                  value={form.nombre}
                  onChange={(e) => cambiarCampo("nombre", e.target.value)}
                  disabled={creando}
                  required
                />
              </div>

              <div className="campo">
                <label htmlFor="nuevo-email">Correo electrónico</label>
                <input
                  id="nuevo-email"
                  type="email"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => cambiarCampo("email", e.target.value)}
                  disabled={creando}
                  required
                />
              </div>

              <div className="campo">
                <label htmlFor="nuevo-contrasena">Contraseña</label>
                <input
                  id="nuevo-contrasena"
                  type="password"
                  autoComplete="new-password"
                  value={form.contrasena}
                  onChange={(e) =>
                    cambiarCampo("contrasena", e.target.value)
                  }
                  disabled={creando}
                  aria-describedby="nuevo-contrasena-ayuda"
                  required
                />
                <span id="nuevo-contrasena-ayuda" className="ayuda">
                  Mínimo 8 caracteres.
                </span>
              </div>

              <div className="campo">
                <label htmlFor="nuevo-repetir">Repetir contraseña</label>
                <input
                  id="nuevo-repetir"
                  type="password"
                  autoComplete="new-password"
                  value={form.repetir}
                  onChange={(e) => cambiarCampo("repetir", e.target.value)}
                  disabled={creando}
                  required
                />
              </div>

              <div className="campo">
                <label htmlFor="nuevo-rol">Rol</label>
                <select
                  id="nuevo-rol"
                  value={form.es_admin ? "admin" : "cliente"}
                  onChange={(e) =>
                    cambiarCampo("es_admin", e.target.value === "admin")
                  }
                  disabled={creando}
                >
                  <option value="cliente">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            {errorForm && (
              <p role="alert" className="error usuario-nuevo-error">
                {errorForm}
              </p>
            )}

            <div className="usuario-nuevo-acciones">
              <button type="submit" className="boton" disabled={creando}>
                {creando ? "Creando..." : "Crear usuario"}
              </button>
              <button
                type="button"
                className="boton boton-secundario"
                onClick={cerrarFormulario}
                disabled={creando}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div
          className="gestionar-usuarios__busqueda"
          style={{ width: "100%", marginBottom: "20px" }}
        >
          <label htmlFor="buscar-usuario">
            Buscar por nombre o correo electrónico
          </label>

          <input
            id="buscar-usuario"
            type="search"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Escribí un nombre o correo..."
            style={{
              display: "block",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              marginTop: "8px",
            }}
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
          <div
            className="gestionar-usuarios__tabla-contenedor"
            style={{
              width: "100%",
              overflowX: "auto",
            }}
          >
            <table
              className="gestionar-usuarios__tabla"
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
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
                          procesando === usuario.id || !usuario.activo
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
                            cargarUsuarios();
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
      </div>
    </section>
  );
}
