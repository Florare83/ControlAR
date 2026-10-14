import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCarrito } from "../context/CarritoContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import logo from "../img/logo.png";

function Navbar({ modoOscuro, onCambiarTema }) {
  const { usuario, puedeOperar, logout } = useAuth();
  const { cantidadTotal } = useCarrito();
  const toast = useToast();
  const navegar = useNavigate();

  const [menuCuentaAbierto, setMenuCuentaAbierto] = useState(false);

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
                Mi cuenta: {usuario.nombre}{" "}
                {menuCuentaAbierto ? "▲" : "▼"}
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
                  <NavLink
                    to="/cuenta"
                    className={clase}
                    onClick={cerrarMenuCuenta}
                    style={{ padding: 10 }}
                  >
                    👤 Mi cuenta
                  </NavLink>

                  <NavLink
                    to="/favoritos"
                    className={clase}
                    onClick={cerrarMenuCuenta}
                    style={{ padding: 10 }}
                  >
                    ❤️ Mis favoritos
                  </NavLink>

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
