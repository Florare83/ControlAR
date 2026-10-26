
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { contarMisMensajesSinLeer } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCarrito } from "../context/CarritoContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import logo from "../img/logo.png";

function Navbar({ modoOscuro, onCambiarTema }) {
  const { usuario, rol, puedeOperar, logout } = useAuth();
  const { cantidadTotal } = useCarrito();
  const toast = useToast();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const [menuCuentaAbierto, setMenuCuentaAbierto] = useState(false);
  // Respuestas del equipo que el cliente todavía no leyó.
  const [mensajesSinLeer, setMensajesSinLeer] = useState(0);

  useEffect(() => {
    if (rol !== "cliente") {
      setMensajesSinLeer(0);
      return undefined;
    }

    let vigente = true;
    const consultar = () =>
      contarMisMensajesSinLeer()
        .then((datos) => {
          if (vigente) setMensajesSinLeer(datos.sin_leer);
        })
        .catch(() => {
          // Si falla la consulta, simplemente no se muestra el aviso.
        });

    consultar();
    window.addEventListener("mis-mensajes-actualizados", consultar);
    const intervalo = window.setInterval(consultar, 60000);

    return () => {
      vigente = false;
      window.removeEventListener("mis-mensajes-actualizados", consultar);
      window.clearInterval(intervalo);
    };
  }, [rol, usuario?.id, ubicacion.pathname]);

  const clase = ({ isActive }) => (isActive ? "activo" : "");

  function cerrarSesion() {
    setMenuCuentaAbierto(false);
    logout();
    toast.info("Cerraste sesión.");
    navegar("/login");
  }

  function cerrarMenuCuenta() {
    setMenuCuentaAbierto(false);
  }

  return (
    <nav className="navbar" aria-label="Principal">
      <Link to="/" className="marca-contenedor">
        <img src={logo} alt="" />
        <span className="marca">El Rincón de Hermes</span>
      </Link>

      <ul className="links">
        <li>
          <NavLink to="/nosotros" className={clase}>
            NOSOTROS
          </NavLink>
        </li>

        <li>
          <NavLink to="/club" className={clase}>
            CLUB
          </NavLink>
        </li>

        <li>
          <NavLink to="/juegos" className={clase}>
            JUEGOS
          </NavLink>
        </li>

        {puedeOperar && (
          <li>
            <NavLink to="/panel" className={clase}>
              PANEL
            </NavLink>
          </li>
        )}

        <li>
          <NavLink to="/contacto" className={clase}>
            CONTACTO
          </NavLink>
        </li>

        {cantidadTotal > 0 && (
          <li>
            <span className="carrito-indicador" role="status">
              <span aria-hidden="true">🛒 {cantidadTotal}</span>
              <span className="solo-lectores">
                Carrito: {cantidadTotal}{" "}
                {cantidadTotal === 1 ? "producto" : "productos"}
              </span>
            </span>
          </li>
        )}

        <li>
          <button
            type="button"
            className="boton-tema"
            onClick={onCambiarTema}
          >
            {modoOscuro ? "☀ Modo claro" : "🌙 Modo oscuro"}
          </button>
        </li>

        <li className="acciones-sesion">
          {usuario ? (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="btn-login"
                aria-expanded={menuCuentaAbierto}
                aria-controls="menu-cuenta"
                onClick={() =>
                  setMenuCuentaAbierto((abierto) => !abierto)
                }
              >
                {usuario.nombre} {menuCuentaAbierto ? "▲" : "▼"}
                {mensajesSinLeer > 0 && (
                  <span className="punto-aviso" role="status">
                    <span className="solo-lectores">
                      {mensajesSinLeer} {mensajesSinLeer === 1 ? "respuesta nueva" : "respuestas nuevas"}
                    </span>
                  </span>
                )}
              </button>

              {menuCuentaAbierto && (
                <div
                  id="menu-cuenta"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    zIndex: 1000,
                    minWidth: 220,
                    marginTop: 8,
                    padding: 8,
                    background: "var(--fondo, #fff)",
                    color: "var(--texto, #222)",
                    border: "1px solid var(--borde, #ccc)",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  {rol === "cliente" && (
                    <>
                      <NavLink
                        to="/mis-prestamos"
                        className={clase}
                        onClick={cerrarMenuCuenta}
                        style={{ padding: 10 }}
                      >
                        🎲 Mis préstamos
                      </NavLink>

                      <NavLink
                        to="/mis-reservas"
                        className={clase}
                        onClick={cerrarMenuCuenta}
                        style={{ padding: 10 }}
                      >
                        📌 Mis reservas
                      </NavLink>

                      <NavLink
                        to="/mis-compras"
                        className={clase}
                        onClick={cerrarMenuCuenta}
                        style={{ padding: 10 }}
                      >
                        🛍️ Mis compras
                      </NavLink>

                      <NavLink
                        to="/mis-mensajes"
                        className={clase}
                        onClick={cerrarMenuCuenta}
                        style={{ padding: 10 }}
                      >
                        ✉️ Mis mensajes
                        {mensajesSinLeer > 0 && (
                          <span className="badge-menu" aria-hidden="true">
                            {mensajesSinLeer}
                          </span>
                        )}
                      </NavLink>

                      <NavLink
                        to="/favoritos"
                        className={clase}
                        onClick={cerrarMenuCuenta}
                        style={{ padding: 10 }}
                      >
                        ❤️ Mis favoritos
                      </NavLink>
                    </>
                  )}

                  <NavLink
                    to="/cambiar-contrasena"
                    className={clase}
                    onClick={cerrarMenuCuenta}
                    style={{ padding: 10 }}
                  >
                    🔑 Cambiar contraseña
                  </NavLink>

                  <NavLink
                    to="/eliminar-cuenta"
                    className={clase}
                    onClick={cerrarMenuCuenta}
                    style={{ padding: 10 }}
                  >
                    🗑️ Eliminar cuenta
                  </NavLink>

                  <button
                    type="button"
                    className="btn-login"
                    onClick={cerrarSesion}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 10,
                    }}
                  >
                    🚪 Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink to="/login" className="btn-login">
                Iniciar sesión
              </NavLink>

              <NavLink to="/registro" className="btn-registro">
                Registrarse
              </NavLink>
            </>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
