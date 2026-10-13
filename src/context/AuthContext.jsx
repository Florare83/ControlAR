import { createContext, useContext, useEffect, useState } from "react";
import {
  iniciarSesion,
  obtenerPerfil,
  obtenerToken,
  guardarToken,
  borrarToken,
} from "../api/api.js";

// Guarda quién está logueado y lo comparte con toda la app,
// así Navbar, Juegos, etc. pueden preguntar "¿hay sesión? ¿qué rol tiene?".
const AuthContext = createContext(null);

// Rol del usuario: "admin", "operador" o "cliente" (null si no hay sesión).
// La API lo manda en "rol"; si todavía no lo manda, lo deducimos de es_admin.
export function rolDe(usuario) {
  if (!usuario) return null;
  return usuario.rol ?? (usuario.es_admin ? "admin" : "cliente");
}

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

  // Devuelve el perfil para que la pantalla de login sepa a dónde mandar al usuario.
  async function login(email, contrasena, recordar) {
    const { access_token } = await iniciarSesion(email, contrasena);
    guardarToken(access_token, recordar);
    const perfil = await obtenerPerfil();
    setUsuario(perfil);
    return perfil;
  }

  function logout() {
    borrarToken();
    setUsuario(null);
  }

  const rol = rolDe(usuario);
  const valor = {
    usuario,
    rol,
    esAdmin: rol === "admin",
    // El admin también puede hacer todo lo del operador.
    puedeOperar: rol === "admin" || rol === "operador",
    cargando,
    login,
    logout,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}