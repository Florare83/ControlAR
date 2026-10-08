import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "../img/logo.png"

// NavLink es como un <a>, pero React Router le agrega
// automáticamente la clase "active" cuando estamos parados
// en esa página. Por eso la usamos en vez de <Link> acá.

function Navbar({ modoOscuro, onCambiarTema }) {
  const { usuario, logout } = useAuth();
  const navegar = useNavigate();

  function cerrarSesion() {
    logout();
    navegar("/login");
  }

  return (
    <nav className="navbar">
      
      <img 
          src={logo} 
          alt="Logo de El Rincón de Hermes" 
        />
        <span className="marca">El Rincón de Hermes</span>

      <ul className="links">
        <li>
          <NavLink
            to="/nosotros"
            className={({ isActive }) => (isActive ? "activo" : "")}
          >
            NOSOTROS
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/club"
            className={({ isActive }) => (isActive ? "activo" : "")}
          >
            CLUB
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/juegos"
            className={({ isActive }) => (isActive ? "activo" : "")}
          >
            JUEGOS
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/contacto"
            className={({ isActive }) => (isActive ? "activo" : "")}
          >
            CONTACTO
          </NavLink>
        </li>
        <li>
          <button className="boton-tema" onClick={onCambiarTema}>
            {modoOscuro ? "☀ Modo claro" : "🌙 Modo oscuro"}
          </button>
        </li>
        <li>
          {usuario ? (
            <button className="btn-login" onClick={cerrarSesion}>
              Cerrar sesión ({usuario.nombre})
            </button>
          ) : (
            <NavLink to="/login" className="btn-login">
              Iniciar sesión
            </NavLink>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;