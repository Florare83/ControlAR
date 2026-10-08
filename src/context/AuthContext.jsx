import { createContext, useContext, useEffect, useState } from "react";
import {
  iniciarSesion,
  obtenerPerfil,
  obtenerToken,
  guardarToken,
  borrarToken,
} from "../api/api.js";

// Guarda quién está logueado y lo comparte con toda la app,
// así Navbar, Juegos, etc. pueden preguntar "¿hay sesión? ¿es admin?".
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(Boolean(obtenerToken()));

  // Al abrir la página: si hay un token guardado, pedimos el perfil.
  // Si el token venció o es inválido, lo descartamos.
  useEffect(() => {
    if (!obtenerToken()) return;
    obtenerPerfil()
      .then(setUsuario)
      .catch(() => borrarToken())
      .finally(() => setCargando(false));
  }, []);

  async function login(email, contrasena, recordar) {
    const { access_token } = await iniciarSesion(email, contrasena);
    guardarToken(access_token, recordar);
    setUsuario(await obtenerPerfil());
  }

  function logout() {
    borrarToken();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
