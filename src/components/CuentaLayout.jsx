import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import PanelMenu from "./PanelMenu.jsx";

// Estructura de "Mi cuenta": menú lateral (hamburguesa en celular) + contenido.
// Reutiliza los estilos del panel de administración (.pagina.panel).
// El DNI solo se muestra a los clientes (es lo que les permite ver sus préstamos).
function CuentaLayout() {
  const { usuario, rol } = useAuth();

  const items = [
    ...(rol === "cliente"
      ? [
          { to: "/cuenta/dni", texto: "🪪 Editar DNI" },
          { to: "/cuenta/novedades", texto: "📬 Suscripción" },
        ]
      : []),
    { to: "/cuenta/contrasena", texto: "🔑 Cambiar contraseña" },
    { to: "/cuenta/eliminar", texto: "🗑️ Eliminar cuenta" },
  ];

  return (
    <div className="pagina panel">
      <PanelMenu
        titulo="Mi cuenta"
        subtitulo={usuario.nombre}
        items={items}
        ariaLabel="Navegación de Mi cuenta"
      />

      <section className="panel-contenido">
        <Outlet />
      </section>
    </div>
  );
}

export default CuentaLayout;
