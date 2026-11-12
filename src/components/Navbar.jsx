
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { contarMisMensajesSinLeer } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCarrito } from "../context/CarritoContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import logo from "../img/logo.png";

// Íconos de línea para la barra del celular. Heredan el color del texto (currentColor).
function Icono({ children }) {
  return (
    <svg
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
      {children}
    </svg>
  );
}

const iconos = {
  inicio: (
    <Icono>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </Icono>
  ),
  club: (
    <Icono>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icono>
  ),
  juegos: (
    <Icono>
      <rect x="3" y="3" width="18" height="18" rx="4.5" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
    </Icono>
  ),
  panel: (
    <Icono>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </Icono>
  ),
  contacto: (
    <Icono>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m3.5 7.5 8.5 6 8.5-6" />
    </Icono>
  ),
  cuenta: (
    <Icono>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.6-3.9 3.7-6.5 7.5-6.5s6.9 2.6 7.5 6.5" />
    </Icono>
  ),
  carrito: (
    <Icono>
      <path d="M3 4h2.2l2.2 10.6a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2" />
      <circle cx="9.5" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </Icono>
  ),
  luna: (
    <Icono>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
    </Icono>
  ),
  sol: (
    <Icono>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icono>
  ),
};

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

  // El menú de la cuenta se cierra solo al cambiar de pantalla y con Escape.
  useEffect(() => {
    setMenuCuentaAbierto(false);
  }, [ubicacion.pathname]);

  useEffect(() => {
    if (!menuCuentaAbierto) return undefined;
    function alTeclear(e) {
      if (e.key === "Escape") setMenuCuentaAbierto(false);
    }
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [menuCuentaAbierto]);

  const clase = ({ isActive }) => (isActive ? "activo" : "");

  function cerrarSesion() {
    setMenuCuentaAbierto(false);
    logout();
    toast.info("Cerraste sesión.");
    navegar("/login");
  }

  function cerrarMenuCuenta() {
    setMenuCuentaAbierto(false);
  }

  function alternarMenuCuenta() {
    setMenuCuentaAbierto((abierto) => !abierto);
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

        {/* Solo en celular: tema y carrito siempre a mano arriba a la derecha. */}
        <div className="acciones-movil">
          <button
            type="button"
            className="icono-barra"
            onClick={onCambiarTema}
            aria-pressed={modoOscuro}
            aria-label={modoOscuro ? "Usar tema claro" : "Usar tema oscuro"}
          >
            {modoOscuro ? iconos.sol : iconos.luna}
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
            {iconos.carrito}
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
                  onClick={alternarMenuCuenta}
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
                  <>
                    {/* Fondo: tocar afuera cierra el menú (en celular, además, oscurece). */}
                    <div
                      className="menu-cuenta-fondo"
                      onClick={cerrarMenuCuenta}
                      aria-hidden="true"
                    />

                    <div
                      id="menu-cuenta"
                      className="menu-cuenta"
                      role="group"
                      aria-label="Menú de la cuenta"
                    >
                      <p className="menu-cuenta-saludo">
                        <span aria-hidden="true">👤</span> {usuario.nombre}
                      </p>

                      {rol === "cliente" && (
                        <>
                          <NavLink
                            to="/mis-prestamos"
                            className={(e) => `menu-cuenta-item ${clase(e)}`}
                            onClick={cerrarMenuCuenta}
                          >
                            🎲 Mis préstamos
                          </NavLink>

                          <NavLink
                            to="/mis-reservas"
                            className={(e) => `menu-cuenta-item ${clase(e)}`}
                            onClick={cerrarMenuCuenta}
                          >
                            📌 Mis reservas
                          </NavLink>

                          <NavLink
                            to="/mis-compras"
                            className={(e) => `menu-cuenta-item ${clase(e)}`}
                            onClick={cerrarMenuCuenta}
                          >
                            🛍️ Mis compras
                          </NavLink>

                          <NavLink
                            to="/mis-mensajes"
                            className={(e) => `menu-cuenta-item ${clase(e)}`}
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
                            className={(e) => `menu-cuenta-item ${clase(e)}`}
                            onClick={cerrarMenuCuenta}
                          >
                            ❤️ Mis favoritos
                          </NavLink>
                        </>
                      )}

                      <NavLink
                        to="/cuenta"
                        className={(e) => `menu-cuenta-item ${clase(e)}`}
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
                  </>
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

      {/* Solo en celular: barra de pestañas abajo, al alcance del pulgar. */}
      <nav className="barra-inferior" aria-label="Secciones">
        <NavLink to="/nosotros" className={clase}>
          {iconos.inicio}
          <span>Inicio</span>
        </NavLink>

        <NavLink to="/club" className={clase}>
          {iconos.club}
          <span>Club</span>
        </NavLink>

        {esAdmin ? (
          <NavLink to="/panel" className={clase}>
            {iconos.panel}
            <span>Panel</span>
          </NavLink>
        ) : (
          <NavLink to="/juegos" className={clase}>
            {iconos.juegos}
            <span>Juegos</span>
          </NavLink>
        )}

        <NavLink to="/contacto" className={clase}>
          {iconos.contacto}
          <span>Contacto</span>
        </NavLink>

        {usuario ? (
          <button
            type="button"
            className={menuCuentaAbierto ? "activo" : ""}
            aria-expanded={menuCuentaAbierto}
            aria-controls="menu-cuenta"
            onClick={alternarMenuCuenta}
          >
            <span className="icono-con-aviso">
              {iconos.cuenta}
              {mensajesSinLeer > 0 && (
                <span className="punto-aviso-barra" aria-hidden="true" />
              )}
            </span>
            <span>Cuenta</span>
          </button>
        ) : (
          <NavLink to="/login" className={clase}>
            {iconos.cuenta}
            <span>Ingresar</span>
          </NavLink>
        )}
      </nav>
    </>
  );
}

export default Navbar;
