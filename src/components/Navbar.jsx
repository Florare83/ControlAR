import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCarrito } from "../context/CarritoContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import logo from "../img/logo.png";

// NavLink es como un <a>, pero React Router le agrega
// automáticamente la clase "active" cuando estamos parados
// en esa página. Por eso la usamos en vez de <Link> acá.

function Navbar({ modoOscuro, onCambiarTema }) {
  const { usuario, puedeOperar, logout } = useAuth();
  const { cantidadTotal } = useCarrito();
  const toast = useToast();
  const navegar = useNavigate();
  const clase = ({ isActive }) => (isActive ? "activo" : "");

  function cerrarSesion() {
    logout();
    toast.info("Cerraste sesión.");
    navegar("/login");
  }

  return (
    <nav className="navbar" aria-label="Principal">
      {/* Logo y nombre juntos en un solo bloque: así quedan pegados a la izquierda. */}
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
                Carrito: {cantidadTotal} {cantidadTotal === 1 ? "producto" : "productos"}
              </span>
            </span>
          </li>
        )}
        <li>
          <button className="boton-tema" onClick={onCambiarTema}>
            {modoOscuro ? "☀ Modo claro" : "🌙 Modo oscuro"}
          </button>
        </li>
        <li className="acciones-sesion">
          {usuario ? (
            <button className="btn-login" onClick={cerrarSesion}>
              Cerrar sesión ({usuario.nombre})
            </button>
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