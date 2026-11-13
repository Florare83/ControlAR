import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import PanelMenu from "./PanelMenu.jsx";
import { listarMensajes } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

// Estructura común de los paneles: menú lateral (hamburguesa en celular) + contenido.
// Solo accede el administrador (la ruta /panel está protegida en App.jsx).
function PanelLayout() {
  const { usuario } = useAuth();
  // Saludo con el primer nombre (el nombre completo ya figura en el menú de la cuenta).
  const primerNombre = (usuario?.nombre || "").trim().split(/\s+/)[0];

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

  const items = [
    { to: "/panel/prestamos", texto: "Préstamos" },
    { to: "/panel/historial", texto: "Historial" },
    { to: "/panel/clientes", texto: "Clientes" },
    { to: "/panel/reportes", texto: "Reportes" },
    { to: "/panel/reservas", texto: "Reservas" },
    { to: "/panel/eventos", texto: "Eventos" },
    { to: "/panel/mensajes", texto: "Mensajes", contador: noLeidos },
    { to: "/panel/novedades", texto: "Novedades" },
    { to: "/panel/ventas", texto: "Ventas" },
    { to: "/panel/juegos", texto: "Juegos" },
    { to: "/panel/usuarios", texto: "Usuarios" },
  ];

  return (
    <div className="pagina panel">
      <PanelMenu
        titulo={primerNombre ? `Hola, ${primerNombre}` : "Hola"}
        subtitulo="Administrador"
        items={items}
        ariaLabel="Navegación del panel"
      />

      <section className="panel-contenido">
        <Outlet />
      </section>
    </div>
  );
}

export default PanelLayout;
