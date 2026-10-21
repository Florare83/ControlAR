import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { listarMensajes } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

// Estructura común de los paneles: menú lateral + contenido.
// Operador: solo ve Préstamos.
// Administrador: acceso a todas las secciones administrativas.
function PanelLayout() {
  const { usuario, esAdmin } = useAuth();
  const clase = ({ isActive }) => (isActive ? "activo" : "");

  // Cantidad de mensajes de contacto sin leer.
  const [noLeidos, setNoLeidos] = useState(0);

  const actualizarNoLeidos = useCallback(async () => {
    if (!esAdmin) return;

    try {
      const datos = await listarMensajes({ limite: 1 });
      setNoLeidos(datos.no_leidos);
    } catch {
      // Si falla la consulta, no se muestra el contador.
    }
  }, [esAdmin]);

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
            )}

            {esAdmin && (
              <li>
                <NavLink to="/panel/ventas" className={clase}>
                  Ventas
                </NavLink>
              </li>
            )}

            {esAdmin && (
              <li>
                <NavLink to="/panel/agregar-juego" className={clase}>
                  Agregar juegos
                </NavLink>
              </li>
            )}

            {esAdmin && (
              <li>
                <NavLink to="/panel/usuarios" className={clase}>
                  Gestionar usuarios
                </NavLink>
              </li>
            )}
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