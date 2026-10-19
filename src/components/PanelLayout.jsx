import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { listarMensajes } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

// Estructura común de los paneles: menú lateral + contenido.
// - Operador (voluntario): solo ve "Préstamos".
// - Administrador: panel completo (Resumen, Préstamos, Mensajes y Agregar juegos).
// El contenido de cada sección se dibuja en <Outlet />.
function PanelLayout() {
  const { usuario, esAdmin } = useAuth();
  const clase = ({ isActive }) => (isActive ? "activo" : "");

  // Cantidad de mensajes de contacto sin leer (solo la ve el administrador).
  const [noLeidos, setNoLeidos] = useState(0);

  const actualizarNoLeidos = useCallback(async () => {
    if (!esAdmin) return;
    try {
      const datos = await listarMensajes({ limite: 1 });
      setNoLeidos(datos.no_leidos);
    } catch {
      // Si falla, simplemente no se muestra el contador.
    }
  }, [esAdmin]);

  useEffect(() => {
    actualizarNoLeidos();

    // La bandeja de mensajes avisa cuando se lee o elimina algo.
    window.addEventListener("mensajes-actualizados", actualizarNoLeidos);
    return () =>
      window.removeEventListener("mensajes-actualizados", actualizarNoLeidos);
  }, [actualizarNoLeidos]);

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
                <NavLink to="/panel/agregar-juego" className={clase}>
                  Agregar juegos
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