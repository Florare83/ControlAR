import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { listarMensajes } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

// Estructura común de los paneles: menú lateral + contenido.
// Solo accede el administrador (la ruta /panel está protegida en App.jsx).
function PanelLayout() {
  const { usuario } = useAuth();
  const clase = ({ isActive }) => (isActive ? "activo" : "");

  // Cantidad de mensajes de contacto sin leer.
  const [noLeidos, setNoLeidos] = useState(0);

  const actualizarNoLeidos = useCallback(async () => {
    try {
      const datos = await listarMensajes({ limite: 1 });
      setNoLeidos(datos.no_leidos);
    } catch {
      // Si falla la consulta, no se muestra el contador.
    }
  }, []);

  useEffect(() => {
    actualizarNoLeidos();

    window.addEventListener("mensajes-actualizados", actualizarNoLeidos);

    return () =>
      window.removeEventListener(
        "mensajes-actualizados",
        actualizarNoLeidos
      );
  }, [actualizarNoLeidos]);

  return (
    <div className="pagina panel">
      <aside className="panel-menu">
        <div className="panel-menu-fijo">
        <p className="panel-rol">
          <strong>Administrador</strong>
          <span>{usuario.nombre}</span>
        </p>

        <nav aria-label="Navegación del panel">
          <ul>
            <li>
              <NavLink to="/panel/prestamos" className={clase}>
                Préstamos
              </NavLink>
            </li>

            <li>
              <NavLink to="/panel/historial" className={clase}>
                Historial
              </NavLink>
            </li>

            <li>
              <NavLink to="/panel/reportes" className={clase}>
                Reportes
              </NavLink>
            </li>

            <li>
              <NavLink to="/panel/reservas" className={clase}>
                Reservas
              </NavLink>
            </li>

            <li>
              <NavLink to="/panel/eventos" className={clase}>
                Eventos
              </NavLink>
            </li>

            <li>
              <NavLink to="/panel/mensajes" className={clase}>
                Mensajes
                {noLeidos > 0 && (
                  <span
                    className="panel-contador"
                    aria-label={`${noLeidos} sin leer`}
                  >
                    {noLeidos}
                  </span>
                )}
              </NavLink>
            </li>

            <li>
              <NavLink to="/panel/ventas" className={clase}>
                Ventas
              </NavLink>
            </li>

            <li>
              <NavLink to="/panel/juegos" className={clase}>
                Juegos
              </NavLink>
            </li>

            <li>
              <NavLink to="/panel/usuarios" className={clase}>
                Usuarios
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

export default PanelLayout;