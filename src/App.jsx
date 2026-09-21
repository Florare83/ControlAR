import React from "react";
import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Nosotros from "./pages/Nosotros.jsx";
import Club from "./pages/Club.jsx";
import Juegos from "./pages/Juegos.jsx";
import Contacto from "./pages/Contacto.jsx";
import Login from "./pages/Login.jsx";

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
      <Navbar modoOscuro={modoOscuro} onCambiarTema={cambiarTema} />

      {/* Acá es donde React Router decide qué página mostrar
          según la URL, sin recargar el navegador. */}
      <Routes>
        <Route path="/" element={<Navigate to="/nosotros" />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/club" element={<Club />} />
        <Route path="/juegos" element={<Juegos />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

export default App;