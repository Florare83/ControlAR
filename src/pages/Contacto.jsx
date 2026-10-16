
import { useState } from "react";
import { useToast } from "../context/ToastContext.jsx";
import { enviarMensajeContacto } from "../api/api.js";

const OBLIGATORIOS = ["nombre", "apellido", "mensaje"];

const VACIO = {
  nombre: "",
  apellido: "",
  telefono: "",
  email: "",
  mensaje: "",
};

function errorDeCampo(campo, valor) {
  const texto = valor.trim();

  if (OBLIGATORIOS.includes(campo) && !texto) {
    return "Este campo es obligatorio.";
  }

  if (campo === "email" && texto) {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);

    if (!emailValido) {
      return "Ingresá un correo electrónico válido.";
    }
  }

  if (campo === "telefono" && texto) {
    if (!/^[0-9+\s()-]+$/.test(texto)) {
      return "Ingresá un teléfono válido.";
    }
  }

  return "";
}

function errorDeContacto(datos) {
  if (!datos.email.trim() && !datos.telefono.trim()) {
    return "Ingresá un correo electrónico o un teléfono.";
  }

  return "";
}

function Contacto() {
  const toast = useToast();

  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function manejarCambio(evento) {
    const { name, value } = evento.target;

    setDatos((actuales) => ({
      ...actuales,
      [name]: value,
    }));

    setEnviado(false);

    setErrores((actuales) => ({
      ...actuales,
      [name]: errorDeCampo(name, value),
      ...(name === "email" || name === "telefono"
        ? {
            email: "",
            telefono: "",
          }
        : {}),
    }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();

    const erroresNuevos = {};

    for (const campo of OBLIGATORIOS) {
      const error = errorDeCampo(campo, datos[campo]);

      if (error) {
        erroresNuevos[campo] = error;
      }
    }

    const errorContacto = errorDeContacto(datos);

    if (errorContacto) {
      erroresNuevos.email = errorContacto;
      erroresNuevos.telefono = errorContacto;
    } else {
      erroresNuevos.email = errorDeCampo("email", datos.email);
      erroresNuevos.telefono = errorDeCampo(
        "telefono",
        datos.telefono
      );

      if (!erroresNuevos.email) delete erroresNuevos.email;
      if (!erroresNuevos.telefono) delete erroresNuevos.telefono;
    }

    setErrores(erroresNuevos);
    setEnviado(false);

    if (Object.keys(erroresNuevos).length > 0) {
      toast.error("Revisá los campos marcados.");
      return;
    }

    setEnviando(true);

    try {
      await enviarMensajeContacto({
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        telefono: datos.telefono.trim() || null,
        email: datos.email.trim() || null,
        mensaje: datos.mensaje.trim(),
      });

      setEnviado(true);
      setDatos({ ...VACIO });
      setErrores({});

      toast.exito("¡Gracias! Recibimos tu mensaje.");
    } catch (error) {
      toast.error(
        error.message ||
          "No se pudo enviar el mensaje. Intentá nuevamente."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="pagina-contacto">
      <div className="contenedor-contacto">
        <h1>Contacto</h1>

        <p>
          ¿Tenés alguna consulta o sugerencia? Completá el formulario
          y nos pondremos en contacto con vos.
        </p>

        {enviado && (
          <p className="mensaje-exito" role="status">
            ¡Gracias! Tu mensaje fue recibido correctamente.
          </p>
        )}

        <form onSubmit={manejarEnvio} noValidate>
          <div className="campo-contacto">
            <label htmlFor="nombre">Nombre *</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={datos.nombre}
              onChange={manejarCambio}
              maxLength={100}
              required
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={
                errores.nombre ? "error-nombre" : undefined
              }
            />
            {errores.nombre && (
              <p id="error-nombre" className="error-campo" role="alert">
                {errores.nombre}
              </p>
            )}
          </div>

          <div className="campo-contacto">
            <label htmlFor="apellido">Apellido *</label>
            <input
              id="apellido"
              name="apellido"
              type="text"
              value={datos.apellido}
              onChange={manejarCambio}
              maxLength={100}
              required
              aria-invalid={Boolean(errores.apellido)}
              aria-describedby={
                errores.apellido ? "error-apellido" : undefined
              }
            />
            {errores.apellido && (
              <p
                id="error-apellido"
                className="error-campo"
                role="alert"
              >
                {errores.apellido}
              </p>
            )}
          </div>

          <div className="campo-contacto">
            <label htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              value={datos.telefono}
              onChange={manejarCambio}
              maxLength={30}
              autoComplete="tel"
              aria-invalid={Boolean(errores.telefono)}
              aria-describedby={
                errores.telefono ? "error-telefono" : undefined
              }
            />
            {errores.telefono && (
              <p
                id="error-telefono"
                className="error-campo"
                role="alert"
              >
                {errores.telefono}
              </p>
            )}
          </div>

          <div className="campo-contacto">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              value={datos.email}
              onChange={manejarCambio}
              maxLength={255}
              autoComplete="email"
              aria-invalid={Boolean(errores.email)}
              aria-describedby={
                errores.email ? "error-email" : undefined
              }
            />
            {errores.email && (
              <p id="error-email" className="error-campo" role="alert">
                {errores.email}
              </p>
            )}
          </div>

          <p className="ayuda-contacto">
            * Campos obligatorios. Debés ingresar un teléfono o un
            correo electrónico para que podamos responderte.
          </p>

          <div className="campo-contacto">
            <label htmlFor="mensaje">Mensaje *</label>
            <textarea
              id="mensaje"
              name="mensaje"
              value={datos.mensaje}
              onChange={manejarCambio}
              rows={6}
              maxLength={10000}
              required
              aria-invalid={Boolean(errores.mensaje)}
              aria-describedby={
                errores.mensaje ? "error-mensaje" : undefined
              }
            />
            {errores.mensaje && (
              <p
                id="error-mensaje"
                className="error-campo"
                role="alert"
              >
                {errores.mensaje}
              </p>
            )}
          </div>

          <button type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar mensaje"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Contacto;
