import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import PanelLayout from "./components/PanelLayout.jsx";
import CarritoSidebar from "./components/CarritoSidebar.jsx";

import Nosotros from "./pages/Nosotros.jsx";
import Club from "./pages/Club.jsx";
import Juegos from "./pages/Juegos.jsx";
import Favoritos from "./pages/Favoritos.jsx";
import CuentaLayout from "./components/CuentaLayout.jsx";
import EditarDni from "./pages/EditarDni.jsx";
import CambiarContrasena from "./pages/CambiarContrasena.jsx";
import EliminarCuenta from "./pages/EliminarCuenta.jsx";
import Contacto from "./pages/Contacto.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import Prestamos from "./pages/Prestamos.jsx";
import HistorialPrestamos from "./pages/HistorialPrestamos.jsx";
import MisPrestamos from "./pages/MisPrestamos.jsx";
import MisReservas from "./pages/MisReservas.jsx";
import Reservas from "./pages/Reservas.jsx";
import Eventos from "./pages/Eventos.jsx";
import MisCompras from "./pages/MisCompras.jsx";
import Ventas from "./pages/Ventas.jsx";
import Reportes from "./pages/Reportes.jsx";
import Mensajes from "./pages/Mensajes.jsx";
import MisMensajes from "./pages/MisMensajes.jsx";
import Checkout from "./pages/Checkout.jsx";
import CompraResultado from "./pages/CompraResultado.jsx";
import GestionarUsuarios from "./pages/GestionarUsuarios.jsx";

// /cuenta sin subsección: el cliente empieza por el DNI, el admin por la contraseña.
function CuentaInicio() {
  const { rol } = useAuth();
  return (
    <Navigate to={rol === "cliente" ? "dni" : "contrasena"} replace />
  );
}

function App() {
  const [modoOscuro, setModoOscuro] = useState(false);
  const { pathname } = useLocation();

  // Checkout y resultado de compra ocupan toda la pantalla.
  const pantallaCompleta =
    pathname === "/checkout" ||
    pathname === "/compra/resultado";

  function cambiarTema() {
    const nuevoValor = !modoOscuro;
    setModoOscuro(nuevoValor);
    document.body.classList.toggle("oscuro", nuevoValor);
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

          {/* Mi cuenta: menú lateral con DNI, contraseña y eliminar cuenta */}
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
        </Routes>
      </main>
    </>
  );
}

export default App;
