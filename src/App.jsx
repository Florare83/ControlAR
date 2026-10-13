import React from "react";
import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import PanelLayout from "./components/PanelLayout.jsx";
import Nosotros from "./pages/Nosotros.jsx";
import Club from "./pages/Club.jsx";
import Juegos from "./pages/Juegos.jsx";
import Contacto from "./pages/Contacto.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import Prestamos from "./pages/Prestamos.jsx";
import PanelResumen from "./pages/PanelResumen.jsx";

function App() {
  // El modo oscuro vive acá (en App) porque el botón para
  // cambiarlo está en la Navbar, pero el efecto (agregar la
  // clase "oscuro" al body) afecta a toda la página.
  const [modoOscuro, setModoOscuro] = useState(false);

  function cambiarTema() {
    const nuevoValor = !modoOscuro;
    setModoOscuro(nuevoValor);
    document.body.classList.toggle("oscuro", nuevoValor);
  }

  return (
    <>
      {/* Enlace para teclado y lectores de pantalla: salta la barra de navegación. */}
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>

      <Navbar modoOscuro={modoOscuro} onCambiarTema={cambiarTema} />

      {/* Acá es donde React Router decide qué página mostrar
          según la URL, sin recargar el navegador. */}
      <main id="contenido" tabIndex={-1}>
        <Routes>
          {/* Públicas: cualquiera puede verlas, con o sin cuenta */}
          <Route path="/" element={<Navigate to="/nosotros" />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/club" element={<Club />} />
          <Route path="/juegos" element={<Juegos />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />

          {/* Panel: solo Operador y Administrador. */}
          <Route path="/panel" element={<RutaProtegida roles={["operador", "admin"]} />}>
            <Route element={<PanelLayout />}>
              <Route index element={<Navigate to="prestamos" replace />} />
              <Route path="prestamos" element={<Prestamos />} />
              {/* Dentro del panel, esta parte es solo del Administrador. */}
              <Route element={<RutaProtegida roles={["admin"]} />}>
                <Route path="resumen" element={<PanelResumen />} />
              </Route>
            </Route>
          </Route>

          {/* Dirección anterior de la página de préstamos */}
          <Route path="/prestamos" element={<Navigate to="/panel/prestamos" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default App;