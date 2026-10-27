
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../components/Modal.jsx";
import FiltroSelect from "../components/FiltroSelect.jsx";
import { useToast } from "../context/ToastContext.jsx";
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
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [buscar, setBuscar] = useState(""); // la búsqueda se envía con una pequeña demora
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroDni, setFiltroDni] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [creando, setCreando] = useState(false);

  const cargarUsuarios = useCallback(async () => {
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
    const t = setTimeout(() => setBuscar(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  async function modificarUsuario(usuario, cambios) {
    setProcesando(usuario.id);

    try {
      await actualizarUsuarioAdmin(usuario.id, cambios);
      toast.exito("Usuario actualizado.");
      await cargarUsuarios();
    } catch (e) {
      toast.error(e.message || "No se pudo actualizar el usuario.");
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

    try {
      await crearUsuarioAdmin({
        nombre,
        email,
        contrasena: form.contrasena,
        es_admin: form.es_admin,
      });

      toast.exito(`Usuario ${nombre} creado.`);
      setFormAbierto(false);
      setForm(FORMULARIO_VACIO);
      await cargarUsuarios();
    } catch (e) {
      setErrorForm(e.message || "No se pudo crear el usuario.");
    } finally {
      setCreando(false);
    }
  }

  const visibles = usuarios.filter((u) => {
    const coincideDni =
      filtroDni === "todos" ||
      (filtroDni === "verificado" && u.dni && u.dni_verificado) ||
      (filtroDni === "sin_verificar" && u.dni && !u.dni_verificado) ||
      (filtroDni === "sin_dni" && !u.dni);

    return (
      (filtroRol === "todos" || (filtroRol === "admin") === u.es_admin) &&
      (filtroEstado === "todos" || (filtroEstado === "activo") === u.activo) &&
      coincideDni
    );
  });

  const hayFiltros =
    busqueda.trim() !== "" ||
    filtroRol !== "todos" ||
    filtroEstado !== "todos" ||
    filtroDni !== "todos";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroRol("todos");
    setFiltroEstado("todos");
    setFiltroDni("todos");
  };

  return (
    <section className="gestionar-usuarios">
      <div className="usuarios-cabecera">
        <div>
          <h1>Usuarios</h1>
          <p className="subtitulo">
            Administrá las cuentas registradas, sus permisos y la verificación del DNI.
          </p>
        </div>

        <button
          type="button"
          className="boton usuarios-nuevo-boton"
          onClick={abrirFormulario}
        >
          + Nuevo usuario
        </button>
      </div>

        {formAbierto && (
          <Modal
            titulo="Nuevo usuario"
            ocupado={creando}
            onCerrar={cerrarFormulario}
          >
          <form
            onSubmit={crearUsuario}
            noValidate
            aria-label="Nuevo usuario"
          >
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

            <div className="modal-acciones">
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
          </Modal>
        )}

      <div className="barra-filtros">
        <div className="filtro-busqueda">
          <label htmlFor="buscar-usuario">Buscar</label>
          <input
            id="buscar-usuario"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o correo electrónico..."
          />
        </div>

        <FiltroSelect
          id="usuarios-rol"
          etiqueta="Rol"
          valor={filtroRol}
          onCambio={setFiltroRol}
          opciones={[
            { valor: "todos", texto: "Todos" },
            { valor: "cliente", texto: "Clientes" },
            { valor: "admin", texto: "Administradores" },
          ]}
        />

        <FiltroSelect
          id="usuarios-estado"
          etiqueta="Estado"
          valor={filtroEstado}
          onCambio={setFiltroEstado}
          opciones={[
            { valor: "todos", texto: "Todos" },
            { valor: "activo", texto: "Activos" },
            { valor: "inactivo", texto: "Inactivos" },
          ]}
        />

        <FiltroSelect
          id="usuarios-dni"
          etiqueta="DNI"
          valor={filtroDni}
          onCambio={setFiltroDni}
          opciones={[
            { valor: "todos", texto: "Todos" },
            { valor: "verificado", texto: "Verificado" },
            { valor: "sin_verificar", texto: "Sin verificar" },
            { valor: "sin_dni", texto: "Sin DNI cargado" },
          ]}
        />

        {hayFiltros && (
          <button
            type="button"
            className="boton boton-secundario boton-chico"
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando usuarios...
        </p>
      ) : visibles.length === 0 ? (
        <p>
          {hayFiltros
            ? "No hay usuarios que coincidan con los filtros."
            : "Todavía no hay usuarios registrados."}
        </p>
      ) : (
        <>
          <p className="usuarios-resumen" role="status">
            {visibles.length === usuarios.length
              ? `${usuarios.length} ${usuarios.length === 1 ? "usuario" : "usuarios"}`
              : `${visibles.length} de ${usuarios.length} usuarios`}
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className="tabla usuarios-tabla">
              <caption className="solo-lectores">Lista de usuarios</caption>
              <thead>
                <tr>
                  {["Usuario", "DNI", "Rol", "Estado", "Acciones"].map((t) => (
                    <th key={t} scope="col">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibles.map((usuario) => (
                  <tr key={usuario.id} className={usuario.activo ? undefined : "fila-inactiva"}>
                    <td>
                      <strong>{usuario.nombre}</strong>
                      <br />
                      <small>{usuario.email}</small>
                    </td>

                    <td>
                      {usuario.dni ? (
                        <>
                          {usuario.dni}
                          <br />
                          <span
                            className={`etiqueta ${
                              usuario.dni_verificado ? "disponible" : "neutra"
                            }`}
                          >
                            {usuario.dni_verificado ? "Verificado" : "Sin verificar"}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>
                      <select
                        className="usuarios-rol"
                        aria-label={`Rol de ${usuario.nombre}`}
                        value={usuario.es_admin ? "admin" : "cliente"}
                        disabled={procesando === usuario.id || !usuario.activo}
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
                      <span className={`etiqueta ${usuario.activo ? "disponible" : "no-disponible"}`}>
                        {usuario.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td>
                      <div className="acciones-fila">
                        <button
                          type="button"
                          className={`boton boton-chico ${
                            usuario.activo ? "boton-peligro" : ""
                          }`}
                          disabled={procesando === usuario.id}
                          onClick={() => {
                            const nuevoEstado = !usuario.activo;
                            const accion = nuevoEstado ? "activar" : "desactivar";

                            if (
                              window.confirm(
                                `¿Querés ${accion} la cuenta de ${usuario.nombre}?`
                              )
                            ) {
                              modificarUsuario(usuario, { activo: nuevoEstado });
                            }
                          }}
                        >
                          {procesando === usuario.id
                            ? "Guardando..."
                            : usuario.activo
                              ? "Desactivar"
                              : "Activar"}
                        </button>

                        {usuario.dni && (
                          <button
                            type="button"
                            className="boton boton-secundario boton-chico"
                            disabled={procesando === usuario.id}
                            onClick={() => {
                              const verificar = !usuario.dni_verificado;
                              const pregunta = verificar
                                ? `Mirá el DNI físico de ${usuario.nombre}. ¿El número es ${usuario.dni}?`
                                : `¿Querés quitar la verificación del DNI de ${usuario.nombre}?`;

                              if (window.confirm(pregunta)) {
                                modificarUsuario(usuario, { dni_verificado: verificar });
                              }
                            }}
                          >
                            {usuario.dni_verificado ? "Quitar verificación" : "Verificar DNI"}
                          </button>
                        )}

                        <Link
                          className="usuario-enlace-historial"
                          to={
                            usuario.dni_verificado
                              ? `/panel/historial?dni=${encodeURIComponent(usuario.dni)}`
                              : `/panel/historial?email=${encodeURIComponent(usuario.email)}`
                          }
                          aria-label={`Ver préstamos de ${usuario.nombre}`}
                        >
                          Ver préstamos
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
