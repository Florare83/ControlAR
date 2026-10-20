
import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import Nosotros from "./pages/Nosotros.jsx";
import Club from "./pages/Club.jsx";
import Juegos from "./pages/Juegos.jsx";
import Contacto from "./pages/Contacto.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import Prestamos from "./pages/Prestamos.jsx";
import MisPrestamos from "./pages/MisPrestamos.jsx";

import { useAuth } from "./context/AuthContext.jsx";

function App() {
  const { usuario, cargando } = useAuth();
  const [modoOscuro, setModoOscuro] = useState(false);

  function cambiarTema() {
    const nuevoValor = !modoOscuro;
    setModoOscuro(nuevoValor);
    document.body.classList.toggle("oscuro", nuevoValor);
  }

  return (
    <>
      <Navbar
        modoOscuro={modoOscuro}
        onCambiarTema={cambiarTema}
      />

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
          path="/prestamos"
          element={
            cargando ? (
              <p className="pagina">Verificando sesión...</p>
            ) : usuario?.es_admin ? (
              <Prestamos />
            ) : (
              <Navigate
                to={usuario ? "/juegos" : "/login"}
                replace
              />
            )
          }
        />

        <Route
          path="/mis-prestamos"
          element={
            cargando ? (
              <p className="pagina">Verificando sesión...</p>
            ) : usuario && !usuario.es_admin ? (
              <MisPrestamos />
            ) : (
              <Navigate
                to={usuario ? "/juegos" : "/login"}
                replace
              />
            )
          }
        />
      </Routes>
    </>
  );
}

export default App;
