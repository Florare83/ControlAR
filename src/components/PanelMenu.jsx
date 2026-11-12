import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

// Menú lateral compartido por el panel de administración y "Mi cuenta".
// En escritorio se ve como una columna fija; en celular se reemplaza por un
// botón hamburguesa que despliega las opciones.
//
// items: [{ to, texto, contador? }]
function PanelMenu({ titulo, subtitulo, items, ariaLabel }) {
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();
  const clase = ({ isActive }) => (isActive ? "activo" : "");

  // Se cierra al cambiar de sección.
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  // Se cierra con la tecla Escape.
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  const actual = items.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`)
  );
  const avisosPendientes = items.reduce(
    (suma, item) => suma + (item.contador || 0),
    0
  );

  return (
    <aside className="panel-menu">
      <div className="panel-menu-fijo">
        <button
          type="button"
          className="panel-hamburguesa"
          aria-expanded={abierto}
          aria-controls="panel-menu-cuerpo"
          onClick={() => setAbierto((v) => !v)}
        >
          <span className="panel-hamburguesa-icono" aria-hidden="true">
            {abierto ? "✕" : "☰"}
          </span>
          <span className="panel-hamburguesa-texto">
            {actual ? actual.texto : "Menú"}
          </span>
          {!abierto && avisosPendientes > 0 && (
            <span
              className="panel-contador"
              aria-label={`${avisosPendientes} sin leer`}
            >
              {avisosPendientes}
            </span>
          )}
        </button>

        <div
          id="panel-menu-cuerpo"
          className={`panel-menu-cuerpo${abierto ? " abierto" : ""}`}
        >
          <p className="panel-rol">
            <strong>{titulo}</strong>
            <span>{subtitulo}</span>
          </p>

          <nav aria-label={ariaLabel}>
            <ul>
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={clase}>
                    {item.texto}
                    {item.contador > 0 && (
                      <span
                        className="panel-contador"
                        aria-label={`${item.contador} sin leer`}
                      >
                        {item.contador}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </aside>
  );
}

export default PanelMenu;
