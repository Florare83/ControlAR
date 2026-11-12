
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { contarMisMensajesSinLeer } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCarrito } from "../context/CarritoContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import logo from "../img/logo.png";

function Navbar({ modoOscuro, onCambiarTema }) {
  const { usuario, rol, esAdmin, logout } = useAuth();
  const { cantidadTotal } = useCarrito();
  const toast = useToast();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const [menuCuentaAbierto, setMenuCuentaAbierto] = useState(false);
  // Menú hamburguesa del navbar (solo se usa en celular).
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
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

  // Al cambiar de página se cierran los menús.
  useEffect(() => {
    setMenuMovilAbierto(false);
    setMenuCuentaAbierto(false);
  }, [ubicacion.pathname]);

  // Escape cierra el menú hamburguesa.
  useEffect(() => {
    if (!menuMovilAbierto) return undefined;
    const alTeclear = (e) => {
      if (e.key === "Escape") setMenuMovilAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [menuMovilAbierto]);

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
    <nav className="navbar" aria-label="Principal">
      <Link
        to="/nosotros"
        className="marca-contenedor"
        aria-label="El Rincón de Hermes: ir a Nosotros"
      >
        <img src={logo} alt="" />
        <span className="marca">El Rincón de Hermes</span>
      </Link>

      <button
        type="button"
        className="navbar-hamburguesa"
        aria-expanded={menuMovilAbierto}
        aria-controls="navbar-links"
        aria-label={menuMovilAbierto ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setMenuMovilAbierto((abierto) => !abierto)}
      >
        <span aria-hidden="true">{menuMovilAbierto ? "✕" : "☰"}</span>
        {!menuMovilAbierto && mensajesSinLeer > 0 && (
          <span className="punto-aviso" aria-hidden="true" />
        )}
      </button>

      <ul
        id="navbar-links"
        className={`links${menuMovilAbierto ? " abierto" : ""}`}
      >
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
            <div className="menu-cuenta-contenedor">
              <button
                type="button"
                className="btn-login"
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
                <div id="menu-cuenta" className="menu-cuenta">
                  {rol === "cliente" && (
                    <>
                      <NavLink
                        to="/mis-prestamos"
                        className={clase}
                        onClick={cerrarMenuCuenta}
                        style={{ padding: 10 }}
                      >
                        🎲 Mis préstamos
                      </NavLink>

                      <NavLink
                        to="/mis-reservas"
                        className={clase}
                        onClick={cerrarMenuCuenta}
                        style={{ padding: 10 }}
                      >
                        📌 Mis reservas
                      </NavLink>

                      <NavLink
                        to="/mis-compras"
                        className={clase}
                        onClick={cerrarMenuCuenta}
                        style={{ padding: 10 }}
                      >
                        🛍️ Mis compras
                      </NavLink>

                      <NavLink
                        to="/mis-mensajes"
                        className={clase}
                        onClick={cerrarMenuCuenta}
                        style={{ padding: 10 }}
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
                        className={clase}
                        onClick={cerrarMenuCuenta}
                        style={{ padding: 10 }}
                      >
                        ❤️ Mis favoritos
                      </NavLink>
                    </>
                  )}

                  <NavLink
                    to="/cuenta"
                    className={clase}
                    onClick={cerrarMenuCuenta}
                    style={{ padding: 10 }}
                  >
                    ⚙️ Mi cuenta
                  </NavLink>

                  <button
                    type="button"
                    className="btn-login"
                    onClick={onCambiarTema}
                    aria-pressed={modoOscuro}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 10,
                    }}
                  >
                    {modoOscuro ? "☀️" : "🌙"} Tema
                  </button>

                  <button
                    type="button"
                    className="btn-login"
                    onClick={cerrarSesion}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 10,
                    }}
                  >
                    🚪 Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink to="/login" className="btn-login">
              Iniciar sesión
            </NavLink>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
