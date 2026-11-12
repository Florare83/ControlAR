import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import useChipActivo from "../hooks/useChipActivo.js";

// Estructura de "Mi cuenta": menú lateral + contenido.
// Reutiliza los estilos del panel de administración (.pagina.panel).
// El DNI solo se muestra a los clientes (es lo que les permite ver sus préstamos).
function CuentaLayout() {
  const { usuario, rol } = useAuth();
  useChipActivo(); // en celular, deja visible la sección activa del menú
  const clase = ({ isActive }) => (isActive ? "activo" : "");

  return (
    <div className="pagina panel">
      <aside className="panel-menu">
        <div className="panel-menu-fijo">
          <p className="panel-rol">
            <strong>Mi cuenta</strong>
            <span>{usuario.nombre}</span>
          </p>

          <nav aria-label="Navegación de Mi cuenta">
            <ul>
              {rol === "cliente" && (
                <li>
                  <NavLink to="/cuenta/dni" className={clase}>
                    🪪 Editar DNI
                  </NavLink>
                </li>
              )}

              {rol === "cliente" && (
                <li>
                  <NavLink to="/cuenta/novedades" className={clase}>
                    📬 Suscripción
                  </NavLink>
                </li>
              )}

              <li>
                <NavLink to="/cuenta/contrasena" className={clase}>
                  🔑 Cambiar contraseña
                </NavLink>
              </li>

              <li>
                <NavLink to="/cuenta/eliminar" className={clase}>
                  🗑️ Eliminar cuenta
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      <section className="panel-contenido">
        <Outlet />
      </section>
    </div>
  );
}

export default CuentaLayout;
