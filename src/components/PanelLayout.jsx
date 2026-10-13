import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Estructura común de los paneles: menú lateral + contenido.
// - Operador (voluntario): solo ve "Préstamos".
// - Administrador: panel completo (Resumen, Préstamos y Gestionar juegos).
// El contenido de cada sección se dibuja en <Outlet />.
function PanelLayout() {
  const { usuario, esAdmin } = useAuth();
  const clase = ({ isActive }) => (isActive ? "activo" : "");

  return (
    <div className="pagina panel">
      <aside className="panel-menu">
        <p className="panel-rol">
          <strong>{esAdmin ? "Administrador" : "Operador"}</strong>
          <span>{usuario.nombre}</span>
        </p>

        <nav aria-label="Navegación del panel">
          <ul>
            {esAdmin && (
              <li>
                <NavLink to="/panel/resumen" className={clase}>
                  Resumen
                </NavLink>
              </li>
            )}
            <li>
              <NavLink to="/panel/prestamos" className={clase}>
                Préstamos
              </NavLink>
            </li>
            {esAdmin && (
              <li>
                <NavLink to="/juegos" className={clase}>
                  Gestionar juegos
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </aside>

      <section className="panel-contenido">
        <Outlet />
      </section>
    </div>
  );
}

export default PanelLayout;