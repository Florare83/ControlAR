import { useState } from "react";
import { Link } from "react-router-dom";
import { enviarContacto } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  LIMITES,
  MENSAJE_MAX,
  errorContacto,
  errorEmail,
  errorMensaje,
  errorNombre,
  errorTelefono,
  normalizarEspacios,
} from "../utils/validacionesContacto.js";

const OBLIGATORIOS = ["nombre", "apellido", "mensaje"];

// Devuelve el mensaje de error de un campo ("" si está bien).
function errorDeCampo(campo, valor) {
  switch (campo) {
    case "nombre":
      return errorNombre(valor, "nombre");
    case "apellido":
      return errorNombre(valor, "apellido");
    case "mensaje":
      return errorMensaje(valor);
    case "email":
      return errorEmail(valor);
    case "telefono":
      return errorTelefono(valor);
    default:
      return "";
  }
}

function validarTodo(datos) {
  const errores = {};
  for (const campo of Object.keys(datos)) {
    errores[campo] = errorDeCampo(campo, datos[campo]);
  }
  errores.contacto = errorContacto(datos);
  return errores;
}

const VACIO = { nombre: "", apellido: "", telefono: "", email: "", mensaje: "" };

function Contacto() {
  const toast = useToast();
  const { rol } = useAuth();
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Validamos en tiempo real, pero solo el campo que se está escribiendo.
  function manejarCambio(evento) {
    const { name, value } = evento.target;
    const nuevosDatos = { ...datos, [name]: value };
    setDatos(nuevosDatos);
    setErrores((previos) => ({
      ...previos,
      [name]: errorDeCampo(name, value),
      contacto: errorContacto(nuevosDatos),
    }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    const todos = validarTodo(datos);
    setErrores(todos);

    const primerError = Object.keys(datos).find((campo) => todos[campo]);
    if (primerError || todos.contacto) {
      setEnviado(false);
      toast.error("Revisá los campos marcados antes de enviar.");
      // Llevamos el cursor al primer campo con problema (o al email si falta el contacto).
      document.getElementById(primerError ?? "email")?.focus();
      return;
    }

    setEnviando(true);
    try {
      await enviarContacto({
        nombre: normalizarEspacios(datos.nombre),
        apellido: normalizarEspacios(datos.apellido),
        telefono: datos.telefono.trim(),
        email: datos.email.trim(),
        mensaje: datos.mensaje.trim(),
      });
      setEnviado(true);
      setDatos(VACIO);
      setErrores({});
      toast.exito("¡Gracias! Recibimos tu mensaje.");
    } catch (e) {
      setEnviado(false);
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  }

  // Atributos de accesibilidad comunes a todos los campos:
  // aria-invalid avisa que hay error y aria-describedby lo conecta con su mensaje.
  function atributos(campo) {
    const hayError = Boolean(errores[campo]);
    const ids = [];
    if (hayError) ids.push(`error-${campo}`);
    if ((campo === "email" || campo === "telefono") && errores.contacto) ids.push("error-contacto");
    return {
      id: campo,
      name: campo,
      value: datos[campo],
      onChange: manejarCambio,
      "aria-invalid": hayError ? "true" : undefined,
      "aria-describedby": ids.length ? ids.join(" ") : undefined,
      "aria-required": OBLIGATORIOS.includes(campo) ? "true" : undefined,
      maxLength: LIMITES[campo],
    };
  }

  return (
    <div className="pagina">
      <div className="tarjeta tarjeta-central tarjeta-contacto">
      <h1 className="titulo-tarjeta">Contacto</h1>
      <p className="subtitulo">Escribinos y te respondemos a la brevedad.</p>

      {rol === "cliente" && (
        <p className="ayuda" role="note">
          Iniciaste sesión: también podés escribirnos desde{" "}
          <Link to="/mis-mensajes">Mis mensajes</Link> y ver nuestra respuesta
          ahí mismo, sin esperar un correo.
        </p>
      )}

      {enviado && (
        <p style={{ color: "var(--exito, green)", fontWeight: 600 }} role="status">
          ¡Gracias! Recibimos tu mensaje.
        </p>
      )}

      <form className="formulario" onSubmit={manejarEnvio} noValidate>
        <p className="ayuda">Los campos con * son obligatorios. Completá al menos un Email o un Teléfono.</p>

        {errores.contacto && (
          <p id="error-contacto" className="error">
            ⚠️ {errores.contacto}
          </p>
        )}

        <div className="campo">
          <label htmlFor="nombre">Nombre *</label>
          <input type="text" autoComplete="given-name" {...atributos("nombre")} />
          {errores.nombre && (
            <span id="error-nombre" className="error">
              {errores.nombre}
            </span>
          )}
        </div>

        <div className="campo">
          <label htmlFor="apellido">Apellido *</label>
          <input type="text" autoComplete="family-name" {...atributos("apellido")} />
          {errores.apellido && (
            <span id="error-apellido" className="error">
              {errores.apellido}
            </span>
          )}
        </div>

        <div className="campo">
          <label htmlFor="telefono">Teléfono</label>
          <input type="tel" autoComplete="tel" placeholder="Ej: +54 387 123456" {...atributos("telefono")} />
          {errores.telefono && (
            <span id="error-telefono" className="error">
              {errores.telefono}
            </span>
          )}
        </div>

        <div className="campo">
          <label htmlFor="email">Email</label>
          <input type="email" autoComplete="email" placeholder="nombre@ejemplo.com" {...atributos("email")} />
          {errores.email && (
            <span id="error-email" className="error">
              {errores.email}
            </span>
          )}
        </div>

        <div className="campo">
          <label htmlFor="mensaje">Mensaje *</label>
          <textarea {...atributos("mensaje")} />
          <span className="ayuda" aria-hidden="true">
            {datos.mensaje.length}/{MENSAJE_MAX}
          </span>
          {errores.mensaje && (
            <span id="error-mensaje" className="error">
              {errores.mensaje}
            </span>
          )}
        </div>

        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar"}
        </button>
      </form>
      </div>
    </div>
  );
}

export default Contacto;