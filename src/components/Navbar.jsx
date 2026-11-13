
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { contarMisMensajesSinLeer } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCarrito } from "../context/CarritoContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import logo from "../img/logo.png";

// Íconos de la barra de pestañas (trazo simple que toma el color del texto).
const ICONOS = {
  club: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  juegos: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  contacto: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  cuenta: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.66V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.66" />
    </>
  ),
  ingresar: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </>
  ),
};

function IconoTab({ nombre }) {
  return (
    <svg
      className="icono-tab"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONOS[nombre]}
    </svg>
  );
}

function Navbar({ modoOscuro, onCambiarTema }) {
  const { usuario, rol, esAdmin, logout } = useAuth();
  const { cantidadTotal, abrir: abrirCarrito } = useCarrito();
  const toast = useToast();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const [menuCuentaAbierto, setMenuCuentaAbierto] = useState(false);
  // Respuestas del equipo que el cliente todavía no leyó.
  const [mensajesSinLeer, setMensajesSinLeer] = useState(0);

  useEffect(() => {
    if (rol !== "cliente") {
      setMensajesSinLeer(0);
      return undefined;
    }

    let vigente = true;
    const consultar = () =>
      contarMisMensajesSinLeer()
        .then((datos) => {
          if (vigente) setMensajesSinLeer(datos.sin_leer);
        })
        .catch(() => {
          // Si falla la consulta, simplemente no se muestra el aviso.
        });

    consultar();
    window.addEventListener("mis-mensajes-actualizados", consultar);
    const intervalo = window.setInterval(consultar, 60000);

    return () => {
      vigente = false;
      window.removeEventListener("mis-mensajes-actualizados", consultar);
      window.clearInterval(intervalo);
    };
  }, [rol, usuario?.id, ubicacion.pathname]);

  const clase = ({ isActive }) => (isActive ? "activo" : "");
  const claseItem = ({ isActive }) =>
    `menu-cuenta-item${isActive ? " activo" : ""}`;

  // Al cambiar de página se cierra el menú de la cuenta.
  useEffect(() => {
    setMenuCuentaAbierto(false);
  }, [ubicacion.pathname]);

  // Escape cierra el menú de la cuenta.
  useEffect(() => {
    if (!menuCuentaAbierto) return undefined;
    const alTeclear = (e) => {
      if (e.key === "Escape") setMenuCuentaAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [menuCuentaAbierto]);

  function cerrarSesion() {
    setMenuCuentaAbierto(false);
    logout();
    toast.info("Cerraste sesión.");
    navegar("/login");
  }

  function cerrarMenuCuenta() {
    setMenuCuentaAbierto(false);
  }

  return (
    <>
    <nav className="navbar" aria-label="Principal">
      <Link
        to="/nosotros"
        className="marca-contenedor"
        aria-label="El Rincón de Hermes: ir a Nosotros"
      >
        <img src={logo} alt="" />
        <span className="marca">El Rincón de Hermes</span>
      </Link>

      {/* Solo en celular (mobile.css): tema y carrito arriba a la derecha */}
      <div className="acciones-movil">
        <button
          type="button"
          className="icono-barra"
          onClick={onCambiarTema}
          aria-pressed={modoOscuro}
          aria-label={modoOscuro ? "Usar tema claro" : "Usar tema oscuro"}
        >
          <span aria-hidden="true" style={{ fontSize: 22 }}>
            {modoOscuro ? "☀️" : "🌙"}
          </span>
        </button>

        <button
          type="button"
          className="icono-barra"
          onClick={abrirCarrito}
          aria-label={
            cantidadTotal > 0
              ? `Abrir carrito: ${cantidadTotal} ${
                  cantidadTotal === 1 ? "producto" : "productos"
                }`
              : "Abrir carrito"
          }
        >
          <span aria-hidden="true" style={{ fontSize: 22 }}>
            🛒
          </span>
          {cantidadTotal > 0 && (
            <span className="contador-barra" aria-hidden="true">
              {cantidadTotal}
            </span>
          )}
        </button>
      </div>

      <ul className="links">
        <li>
          <NavLink to="/club" className={clase}>
            CLUB
          </NavLink>
        </li>

        {/* El administrador gestiona los juegos desde el panel */}
        {!esAdmin && (
          <li>
            <NavLink to="/juegos" className={clase}>
              JUEGOS
            </NavLink>
          </li>
        )}

        {esAdmin && (
          <li>
            <NavLink to="/panel" className={clase}>
              PANEL
            </NavLink>
          </li>
        )}

        <li>
          <NavLink to="/contacto" className={clase}>
            CONTACTO
          </NavLink>
        </li>

        {cantidadTotal > 0 && (
          <li>
            <span className="carrito-indicador" role="status">
              <span aria-hidden="true">🛒 {cantidadTotal}</span>
              <span className="solo-lectores">
                Carrito: {cantidadTotal}{" "}
                {cantidadTotal === 1 ? "producto" : "productos"}
              </span>
            </span>
          </li>
        )}

        <li className="acciones-sesion">
          {usuario ? (
            <div className="cuenta-contenedor">
              <button
                type="button"
                className="btn-login btn-cuenta"
                aria-expanded={menuCuentaAbierto}
                aria-controls="menu-cuenta"
                onClick={() =>
                  setMenuCuentaAbierto((abierto) => !abierto)
                }
              >
                <span aria-hidden="true">👤</span> Hola {usuario.nombre}{" "}
                {menuCuentaAbierto ? "▲" : "▼"}
                {mensajesSinLeer > 0 && (
                  <span className="punto-aviso" role="status">
                    <span className="solo-lectores">
                      {mensajesSinLeer} {mensajesSinLeer === 1 ? "respuesta nueva" : "respuestas nuevas"}
                    </span>
                  </span>
                )}
              </button>

              {menuCuentaAbierto && (
                <div
                  className="menu-cuenta-fondo"
                  onClick={cerrarMenuCuenta}
                  aria-hidden="true"
                />
              )}

              {menuCuentaAbierto && (
                <div id="menu-cuenta" className="menu-cuenta">
                  <p className="menu-cuenta-saludo">Hola, {usuario.nombre}</p>

                  {rol === "cliente" && (
                    <>
                      <NavLink
                        to="/mis-prestamos"
                        className={claseItem}
                        onClick={cerrarMenuCuenta}
                      >
                        🎲 Mis préstamos
                      </NavLink>

                      <NavLink
                        to="/mis-reservas"
                        className={claseItem}
                        onClick={cerrarMenuCuenta}
                      >
                        📌 Mis reservas
                      </NavLink>

                      <NavLink
                        to="/mis-compras"
                        className={claseItem}
                        onClick={cerrarMenuCuenta}
                      >
                        🛍️ Mis compras
                      </NavLink>

                      <NavLink
                        to="/mis-mensajes"
                        className={claseItem}
                        onClick={cerrarMenuCuenta}
                      >
                        ✉️ Mis mensajes
                        {mensajesSinLeer > 0 && (
                          <span className="badge-menu" aria-hidden="true">
                            {mensajesSinLeer}
                          </span>
                        )}
                      </NavLink>

                      <NavLink
                        to="/favoritos"
                        className={claseItem}
                        onClick={cerrarMenuCuenta}
                      >
                        ❤️ Mis favoritos
                      </NavLink>
                    </>
                  )}

                  <NavLink
                    to="/cuenta"
                    className={claseItem}
                    onClick={cerrarMenuCuenta}
                  >
                    ⚙️ Mi cuenta
                  </NavLink>

                  <button
                    type="button"
                    className="btn-login menu-cuenta-item"
                    onClick={onCambiarTema}
                    aria-pressed={modoOscuro}
                  >
                    {modoOscuro ? "☀️" : "🌙"} Tema
                  </button>

                  <button
                    type="button"
                    className="btn-login menu-cuenta-item"
                    onClick={cerrarSesion}
                  >
                    🚪 Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink to="/login" className="btn-login btn-login-enlace">
              Iniciar sesión
            </NavLink>
          )}
        </li>
      </ul>
    </nav>

    {/* Solo en celular (mobile.css): barra de pestañas fija abajo */}
    <nav className="barra-inferior" aria-label="Navegación rápida">
      <NavLink to="/club" className={clase}>
        <IconoTab nombre="club" />
        Club
      </NavLink>

      {esAdmin ? (
        <NavLink to="/panel" className={clase}>
          <IconoTab nombre="panel" />
          Panel
        </NavLink>
      ) : (
        <NavLink to="/juegos" className={clase}>
          <IconoTab nombre="juegos" />
          Juegos
        </NavLink>
      )}

      <NavLink to="/contacto" className={clase}>
        <IconoTab nombre="contacto" />
        Contacto
      </NavLink>

      {usuario ? (
        <button
          type="button"
          className={menuCuentaAbierto ? "activo" : ""}
          aria-expanded={menuCuentaAbierto}
          aria-controls="menu-cuenta"
          onClick={() => setMenuCuentaAbierto((abierto) => !abierto)}
        >
          <span className="icono-con-aviso">
            <IconoTab nombre="cuenta" />
            {mensajesSinLeer > 0 && (
              <span className="punto-aviso-barra" aria-hidden="true" />
            )}
          </span>
          Cuenta
          {mensajesSinLeer > 0 && (
            <span className="solo-lectores">
              {mensajesSinLeer}{" "}
              {mensajesSinLeer === 1 ? "respuesta nueva" : "respuestas nuevas"}
            </span>
          )}
        </button>
      ) : (
        <NavLink to="/login" className={clase}>
          <IconoTab nombre="ingresar" />
          Ingresar
        </NavLink>
      )}
    </nav>
    </>
  );
}

export default Navbar;
