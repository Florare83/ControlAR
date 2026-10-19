import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import PanelLayout from "./components/PanelLayout.jsx";
import CarritoSidebar from "./components/CarritoSidebar.jsx";

import Nosotros from "./pages/Nosotros.jsx";
import Club from "./pages/Club.jsx";
import Juegos from "./pages/Juegos.jsx";
import Favoritos from "./pages/Favoritos.jsx";
import Cuenta from "./pages/Cuenta.jsx";
import CambiarContrasena from "./pages/CambiarContrasena.jsx";
import EliminarCuenta from "./pages/EliminarCuenta.jsx";
import Contacto from "./pages/Contacto.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import Prestamos from "./pages/Prestamos.jsx";
import PanelResumen from "./pages/PanelResumen.jsx";
import Mensajes from "./pages/Mensajes.jsx";
import AgregarJuego from "./pages/AgregarJuego.jsx";
import Checkout from "./pages/Checkout.jsx";
import CompraResultado from "./pages/CompraResultado.jsx";

function App() {
  const [modoOscuro, setModoOscuro] = useState(false);
  const { pathname } = useLocation();

  // El checkout y el resultado de la compra ocupan toda la pantalla (sin navbar).
  const pantallaCompleta =
    pathname === "/checkout" || pathname === "/compra/resultado";

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
          <Route path="/" element={<Navigate to="/nosotros" replace />} />

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
            path="/favoritos"
            element={
              <RutaProtegida roles={["cliente", "admin"]}>
                <Favoritos />
              </RutaProtegida>
            }
          />

          <Route
            path="/cuenta"
            element={
              <RutaProtegida roles={["cliente", "admin"]}>
                <Cuenta />
              </RutaProtegida>
            }
          />

          <Route
            path="/cambiar-contrasena"
            element={
              <RutaProtegida roles={["cliente", "admin"]}>
                <CambiarContrasena />
              </RutaProtegida>
            }
          />

          <Route
            path="/eliminar-cuenta"
            element={
              <RutaProtegida roles={["cliente", "admin"]}>
                <EliminarCuenta />
              </RutaProtegida>
            }
          />

          <Route
            path="/panel"
            element={<RutaProtegida roles={["operador", "admin"]} />}
          >
            <Route element={<PanelLayout />}>
              <Route
                index
                element={<Navigate to="prestamos" replace />}
              />

              <Route path="prestamos" element={<Prestamos />} />

              <Route element={<RutaProtegida roles={["admin"]} />}>
                <Route path="resumen" element={<PanelResumen />} />
                <Route path="mensajes" element={<Mensajes />} />
                <Route path="agregar-juego" element={<AgregarJuego />} />
              </Route>
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