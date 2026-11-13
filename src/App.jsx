import React, { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import PanelLayout from "./components/PanelLayout.jsx";
import CarritoSidebar from "./components/CarritoSidebar.jsx";
import Footer from "./components/Footer.jsx";
import BotonWhatsApp from "./components/BotonWhatsApp.jsx";
import { iniciarTablasResponsivas } from "./utils/tablasResponsivas.js";

import Nosotros from "./pages/Nosotros.jsx";
import CuentaLayout from "./components/CuentaLayout.jsx";

// Cada página se descarga recién cuando se entra a ella (el sitio abre más rápido).
const Club = lazy(() => import("./pages/Club.jsx"));
const Juegos = lazy(() => import("./pages/Juegos.jsx"));
const Favoritos = lazy(() => import("./pages/Favoritos.jsx"));
const EditarDni = lazy(() => import("./pages/EditarDni.jsx"));
const Novedades = lazy(() => import("./pages/Novedades.jsx"));
const Baja = lazy(() => import("./pages/Baja.jsx"));
const NovedadesAdmin = lazy(() => import("./pages/NovedadesAdmin.jsx"));
const CambiarContrasena = lazy(() => import("./pages/CambiarContrasena.jsx"));
const EliminarCuenta = lazy(() => import("./pages/EliminarCuenta.jsx"));
const Contacto = lazy(() => import("./pages/Contacto.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Registro = lazy(() => import("./pages/Registro.jsx"));
const Prestamos = lazy(() => import("./pages/Prestamos.jsx"));
const HistorialPrestamos = lazy(() => import("./pages/HistorialPrestamos.jsx"));
const MisPrestamos = lazy(() => import("./pages/MisPrestamos.jsx"));
const MisReservas = lazy(() => import("./pages/MisReservas.jsx"));
const Reservas = lazy(() => import("./pages/Reservas.jsx"));
const Eventos = lazy(() => import("./pages/Eventos.jsx"));
const MisCompras = lazy(() => import("./pages/MisCompras.jsx"));
const Ventas = lazy(() => import("./pages/Ventas.jsx"));
const Reportes = lazy(() => import("./pages/Reportes.jsx"));
const Clientes = lazy(() => import("./pages/Clientes.jsx"));
const Mensajes = lazy(() => import("./pages/Mensajes.jsx"));
const MisMensajes = lazy(() => import("./pages/MisMensajes.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const CompraResultado = lazy(() => import("./pages/CompraResultado.jsx"));
const GestionarUsuarios = lazy(() => import("./pages/GestionarUsuarios.jsx"));
const RecuperarContrasena = lazy(() => import("./pages/RecuperarContrasena.jsx"));
const RestablecerContrasena = lazy(() => import("./pages/RestablecerContrasena.jsx"));
const NoEncontrada = lazy(() => import("./pages/NoEncontrada.jsx"));

// /cuenta sin subsección: el cliente empieza por el DNI, el admin por la contraseña.
function CuentaInicio() {
  const { rol } = useAuth();
  return (
    <Navigate to={rol === "cliente" ? "dni" : "contrasena"} replace />
  );
}

// El tema elegido se recuerda en este navegador entre visitas.
const CLAVE_TEMA = "controlar-tema";

function leerTemaGuardado() {
  try {
    return window.localStorage.getItem(CLAVE_TEMA) === "oscuro";
  } catch {
    return false; // almacenamiento bloqueado: se usa el tema claro
  }
}

function App() {
  const [modoOscuro, setModoOscuro] = useState(leerTemaGuardado);
  const { pathname, hash } = useLocation();
  const { rol } = useAuth();  

  // Checkout y resultado de compra ocupan toda la pantalla.
  const pantallaCompleta =
    pathname === "/checkout" ||
    pathname === "/compra/resultado";

  // Al cambiar de página, vuelve arriba: React Router no lo hace solo, y si venías
  // scrolleado la página nueva abría a esa misma altura. Con un enlace a una sección
  // (#algo) no se toca, para respetar el salto.
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  // En celular las tablas del panel se ven como tarjetas: esto les pone el título a cada celda.
  useEffect(() => iniciarTablasResponsivas(), []);

  // Aplica el tema a la página y lo guarda cada vez que cambia.
  useEffect(() => {
    document.body.classList.toggle("oscuro", modoOscuro);

    try {
      window.localStorage.setItem(CLAVE_TEMA, modoOscuro ? "oscuro" : "claro");
    } catch {
      // Sin almacenamiento disponible: el tema solo dura esta visita.
    }
  }, [modoOscuro]);

  function cambiarTema() {
    setModoOscuro((actual) => !actual);
  }

  return (
    <>
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>

      {!pantallaCompleta && (
        <>
          <Navbar
            modoOscuro={modoOscuro}
            onCambiarTema={cambiarTema}
          />
          <CarritoSidebar />
        </>
      )}

      <main id="contenido" tabIndex={-1}>
        <Suspense fallback={<p className="cargando" role="status">Cargando...</p>}>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/nosotros" replace />}
          />

          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/club" element={<Club />} />
          <Route path="/juegos" element={<Juegos />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/baja" element={<Baja />} />
          <Route path="/recuperar" element={<RecuperarContrasena />} />
          <Route path="/restablecer" element={<RestablecerContrasena />} />

          <Route
            path="/checkout"
            element={
              <RutaProtegida roles={["cliente", "admin"]}>
                <Checkout />
              </RutaProtegida>
            }
          />

          <Route
            path="/compra/resultado"
            element={
              <RutaProtegida roles={["cliente", "admin"]}>
                <CompraResultado />
              </RutaProtegida>
            }
          />

          <Route
            path="/mis-mensajes"
            element={
              <RutaProtegida roles={["cliente", "admin"]}>
                <MisMensajes />
              </RutaProtegida>
            }
          />

          <Route
            path="/favoritos"
            element={
              <RutaProtegida roles={["cliente", "admin"]}>
                <Favoritos />
              </RutaProtegida>
            }
          />

          {/* Mi cuenta: menú lateral con DNI, novedades, contraseña y eliminar cuenta */}
          <Route
            path="/cuenta"
            element={<RutaProtegida roles={["cliente", "admin"]} />}
          >
            <Route element={<CuentaLayout />}>
              <Route index element={<CuentaInicio />} />
              <Route
                path="dni"
                element={
                  <RutaProtegida roles={["cliente"]}>
                    <EditarDni />
                  </RutaProtegida>
                }
              />
              <Route
                path="novedades"
                element={
                  <RutaProtegida roles={["cliente"]}>
                    <Novedades />
                  </RutaProtegida>
                }
              />
              <Route path="contrasena" element={<CambiarContrasena />} />
              <Route path="eliminar" element={<EliminarCuenta />} />
            </Route>
          </Route>

          {/* Rutas anteriores: se conservan por si hay enlaces guardados */}
          <Route
            path="/cambiar-contrasena"
            element={<Navigate to="/cuenta/contrasena" replace />}
          />
          <Route
            path="/eliminar-cuenta"
            element={<Navigate to="/cuenta/eliminar" replace />}
          />

          {/* Historial de préstamos del cliente */}
          <Route
            path="/mis-prestamos"
            element={
              <RutaProtegida roles={["cliente"]}>
                <MisPrestamos />
              </RutaProtegida>
            }
          />

          {/* Reservas de juegos del cliente */}
          <Route
            path="/mis-reservas"
            element={
              <RutaProtegida roles={["cliente"]}>
                <MisReservas />
              </RutaProtegida>
            }
          />

          {/* Historial de compras del cliente */}
          <Route
            path="/mis-compras"
            element={
              <RutaProtegida roles={["cliente", "admin"]}>
                <MisCompras />
              </RutaProtegida>
            }
          />

          {/* Panel de administración */}
          <Route
            path="/panel"
            element={
              <RutaProtegida roles={["admin"]} />
            }
          >
            <Route element={<PanelLayout />}>
              <Route
                index
                element={<Navigate to="prestamos" replace />}
              />

              <Route
                path="prestamos"
                element={<Prestamos />}
              />

              <Route
                path="reservas"
                element={<Reservas />}
              />

              <Route
                path="historial"
                element={<HistorialPrestamos />}
              />

              <Route
                path="clientes"
                element={<Clientes />}
              />

              <Route
                path="reportes"
                element={<Reportes />}
              />

              <Route
                path="eventos"
                element={<Eventos />}
              />

              <Route
                path="mensajes"
                element={<Mensajes />}
              />

              <Route
                path="novedades"
                element={<NovedadesAdmin />}
              />

              <Route
                path="ventas"
                element={<Ventas />}
              />

              <Route
                path="juegos"
                element={<Juegos enPanel />}
              />

              <Route
                path="agregar-juego"
                element={<Navigate to="/panel/juegos" replace />}
              />

              <Route
                path="usuarios"
                element={<GestionarUsuarios />}
              />
            </Route>
          </Route>

          <Route
            path="/prestamos"
            element={<Navigate to="/panel/prestamos" replace />}
          />

          <Route path="*" element={<NoEncontrada />} />
        </Routes>
        </Suspense>
      </main>

      {!pantallaCompleta && (
        <>
          <Footer />
          {rol !== "admin" && <BotonWhatsApp />}   {/* ← condición nueva */}
        </>
      )}
    </>
  );
}

export default App;
