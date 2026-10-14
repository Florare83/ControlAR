import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { CarritoProvider } from "./context/CarritoContext.jsx";
import "./index.css";

// Este es el punto de entrada de toda la aplicación.
// BrowserRouter es lo que le permite a React Router manejar
// la navegación entre páginas sin recargar el navegador.
// El orden importa: el carrito usa los avisos (toasts), así que va adentro de ToastProvider.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CarritoProvider>
            <App />
          </CarritoProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);