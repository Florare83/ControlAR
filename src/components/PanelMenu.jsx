import { NavLink } from "react-router-dom";
import useChipActivo from "../hooks/useChipActivo.js";

// Menú lateral compartido por el panel de administración y "Mi cuenta".
// En escritorio es una columna fija; en celular (mobile.css) pasa a ser una fila
// de botones que se desliza hacia los costados, pegada a la barra superior.
//
// items: [{ to, texto, contador? }]
function PanelMenu({ titulo, subtitulo, items, ariaLabel }) {
  const clase = ({ isActive }) => (isActive ? "activo" : "");

  // En celular deja visible el botón de la sección actual.
  useChipActivo();

  return (
    <aside className="panel-menu">
      <div className="panel-menu-fijo">
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
    </aside>
  );
}

export default PanelMenu;
