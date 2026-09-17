import { useState } from "react";


// Preguntas frecuentes. Cada una tiene su pregunta y su respuesta.
// Si mañana quieren agregar una pregunta nueva, alcanza con
// agregar un objeto más a este array.
const preguntas = [
  {
    pregunta: "¿Cuáles son los horarios del club?",
    respuesta:
      "Abrimos de martes a sábado de 17 a 22 hs. Los domingos por la tarde organizamos torneos especiales.",
  },
  {
    pregunta: "¿Cómo funciona la membresía?",
    respuesta:
      "Podés sumarte con una cuota mensual que incluye préstamo ilimitado de juegos dentro del club.",
  },
  {
    pregunta: "¿Puedo pedir préstamos de juegos?",
    respuesta:
      "Sí, cualquier socio puede solicitar el préstamo de un juego disponible desde la sección Juegos.",
  },
  {
    pregunta: "¿Cómo reservo una mesa para un evento o taller?",
    respuesta:
      "Escribinos desde la sección Contacto indicando el evento y la cantidad de personas.",
  },
];

function Nosotros() {
  // Guardamos qué pregunta está abierta. Si es null, están todas cerradas.
  const [abierta, setAbierta] = useState(null);

  function alternar(indice) {
    // Si tocan la que ya está abierta, la cerramos (null).
    // Si tocan otra, esa pasa a ser la abierta.
    setAbierta(abierta === indice ? null : indice);
  }

  return (
    <div className="pagina">
      <h1>Quiénes somos</h1>
      <p className="subtitulo">
        El Rincón de Hermes es un club de juegos de mesa en Salta, pensado
        para reunir a la comunidad alrededor de una buena partida, cualquiera
        sea tu nivel de experiencia.
      </p>


      <p className="subtitulo">
        Nuestra misión es acercar el juego de mesa como una forma de
        compartir tiempo real con otras personas, en un espacio cómodo y
        con una biblioteca de juegos en constante crecimiento.
      </p>

      <h2 style={{ marginTop: 40, marginBottom: 12 }}>
        Preguntas frecuentes
      </h2>

      <div>
        {preguntas.map((item, indice) => (
          <div className="acordeon-item" key={indice}>
            <button
              className="acordeon-pregunta"
              onClick={() => alternar(indice)}
            >
              {item.pregunta}
              <span>{abierta === indice ? "−" : "+"}</span>
            </button>

            {/* Solo mostramos la respuesta si esta pregunta es la abierta */}
            {abierta === indice && (
              <p className="acordeon-respuesta">{item.respuesta}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Nosotros;