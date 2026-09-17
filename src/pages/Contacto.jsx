import { useState } from "react";

function Contacto() {
  const [datos, setDatos] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    mensaje: "",
  });

  const [errores, setErrores] = useState({});
  const [enviado, setEnviado] = useState(false);

  // Función que valida un campo individual en tiempo real
  function validarCampo(nombreCampo, valor, datosActuales) {
    let mensajeError = "";

    switch (nombreCampo) {
      case "nombre":
        if (!valor.trim()) mensajeError = "Ingresá tu nombre.";
        break;
      case "apellido":
        if (!valor.trim()) mensajeError = "Ingresá tu apellido.";
        break;
      case "email":
        if (valor.trim() && !/\S+@\S+\.\S+/.test(valor)) {
          mensajeError = "Ejemplo válido: usuario@dominio.com";
        }
        break;
      case "telefono":
        if (valor.trim() && !/^[0-9+\s-]+$/.test(valor)) {
          mensajeError = "Ingresá solo números, espacios o +";
        }
        break;
      case "mensaje":
        if (!valor.trim()) mensajeError = "Escribí tu mensaje.";
        break;
      default:
        break;
    }

    // Actualizamos los errores
    setErrores((prevErrores) => {
      const nuevosErrores = { ...prevErrores, [nombreCampo]: mensajeError };

      // Revisa la regla Email O Teléfono dinámicamente
      const emailActual = nombreCampo === "email" ? valor : datosActuales.email;
      const telActual = nombreCampo === "telefono" ? valor : datosActuales.telefono;

      if (!emailActual.trim() && !telActual.trim()) {
        nuevosErrores.contacto = "Ingresá al menos un Email o un Teléfono de contacto.";
      } else {
        nuevosErrores.contacto = "";
      }

      return nuevosErrores;
    });
  }

  function manejarCambio(evento) {
    const { name, value } = evento.target;
    const nuevosDatos = { ...datos, [name]: value };
    
    setDatos(nuevosDatos);
    // Validamos en tiempo real con el valor nuevo
    validarCampo(name, value, nuevosDatos);
  }

  function manejarEnvio(evento) {
    evento.preventDefault();

    // Verificamos si hay algún error activo o campos vacíos obligatorios
    const hayErrores = Object.values(errores).some((e) => e !== "");
    const faltanObligatorios = !datos.nombre || !datos.apellido || !datos.mensaje;
    const faltaContacto = !datos.email && !datos.telefono;

    if (!hayErrores && !faltanObligatorios && !faltaContacto) {
      console.log("Datos enviados:", datos);
      setEnviado(true);
    } else {
      setEnviado(false);
      alert("Por favor revisá los campos marcados antes de enviar.");
    }
  }

  return (
    <div className="pagina">
      <h1>Contacto</h1>

      {enviado && (
        <p style={{ color: "var(--exito, green)", fontWeight: 600 }}>
          ¡Gracias! Recibimos tu mensaje.
        </p>
      )}

      {/* Cartel de ayuda para la regla Email o Teléfono */}
      {errores.contacto && (
        <p style={{ color: "orange", fontWeight: 500 }}>
          ⚠️ {errores.contacto}
        </p>
      )}

      <form className="formulario" onSubmit={manejarEnvio} noValidate>
        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={datos.nombre}
            onChange={manejarCambio}
          />
          {errores.nombre && <span className="error">{errores.nombre}</span>}
        </div>

        <div className="campo">
          <label htmlFor="apellido">Apellido</label>
          <input
            id="apellido"
            name="apellido"
            type="text"
            value={datos.apellido}
            onChange={manejarCambio}
          />
          {errores.apellido && <span className="error">{errores.apellido}</span>}
        </div>

        <div className="campo">
          <label htmlFor="telefono">Teléfono</label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            placeholder="Ej: +54 387 123456"
            value={datos.telefono}
            onChange={manejarCambio}
          />
          {errores.telefono && <span className="error">{errores.telefono}</span>}
        </div>

        <div className="campo">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="nombre@ejemplo.com"
            value={datos.email}
            onChange={manejarCambio}
          />
          {errores.email && <span className="error">{errores.email}</span>}
        </div>

        <div className="campo">
          <label htmlFor="mensaje">Mensaje</label>
          <textarea
            id="mensaje"
            name="mensaje"
            value={datos.mensaje}
            onChange={manejarCambio}
          />
          {errores.mensaje && <span className="error">{errores.mensaje}</span>}
        </div>

        <button type="submit" className="boton">
          Enviar
        </button>
      </form>
    </div>
  );
}

export default Contacto;