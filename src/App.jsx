
import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";


import Navbar from "./components/Navbar.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import PanelLayout from "./components/PanelLayout.jsx";

import Nosotros from "./pages/Nosotros.jsx";
import Club from "./pages/Club.jsx";
import Juegos from "./pages/Juegos.jsx";
import CambiarContrasena from "./pages/CambiarContrasena.jsx";
import EliminarCuenta from "./pages/EliminarCuenta.jsx";
import Contacto from "./pages/Contacto.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import Prestamos from "./pages/Prestamos.jsx";
import PanelResumen from "./pages/PanelResumen.jsx";
import MensajesContacto from "./pages/MensajesContacto.jsx";

function App() {
  const [modoOscuro, setModoOscuro] = useState(false);

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

      <Navbar
        modoOscuro={modoOscuro}
        onCambiarTema={cambiarTema}
      />

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
            element={
              <RutaProtegida roles={["operador", "admin"]} />
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

          <Route element={<RutaProtegida roles={["admin"]} />}>
            <Route
              path="resumen"
              element={<PanelResumen />}
            />

            <Route
              path="mensajes"
              element={<MensajesContacto />}
            />
          </Route>

          <Route
            path="/prestamos"
            element={
              <Navigate to="/panel/prestamos" replace />
            }
          />
        </Routes>
      </main>
    </>
  );
}

export default App;
