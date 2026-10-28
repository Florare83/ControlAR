import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Protege una ruta según el rol del usuario.
//   <RutaProtegida roles={["admin"]} />               -> como "ruta padre": muestra las rutas de adentro
//   <RutaProtegida roles={["admin"]}>...</RutaProtegida> -> envolviendo un elemento
// - Sin sesión: lo manda a /login (y recuerda a dónde quería ir).
// - Con sesión pero sin el rol: muestra "Sin permiso".
// Ojo: esto solo ordena la pantalla. La seguridad real la hace la API (401/403).
function RutaProtegida({ roles, children }) {
  const { usuario, rol, cargando } = useAuth();
  const ubicacion = useLocation();

  if (cargando) {
    return (
      <div className="pagina">
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Verificando sesión...
        </p>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }

  if (!roles.includes(rol)) {
    return (
      <div className="pagina">
        <h1>Sin permiso</h1>
        <p>Tu cuenta no tiene acceso a esta sección.</p>
        <Link to="/juegos">Volver al catálogo</Link>
      </div>
    );
  }

  return children ?? <Outlet />;
}

export default RutaProtegida;