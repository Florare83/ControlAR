import { useState } from "react";
import grupo from "../img/grupo.jpeg";

// Preguntas frecuentes. Cada una tiene su pregunta y su respuesta.

const preguntas = [
  {
    pregunta: "¿Cuándo se juntan a jugar juegos de mesa?",
    respuesta:
      "Organizamos una juntada mensual que siempre cae un sábado o domingo.",
  },
  {
    pregunta: "¿Para asistir a los eventos debo pagar algo?",
    respuesta:
      "Las tardes de juegos no tienen un costo fijo, sólo pedimos una colaboración a voluntad para sostener la movida. La colaboración recomendada es de $1.000 por persona.",
  },
  {
    pregunta: "¿Puedo pedir préstamos de juegos?",
    respuesta:
      "Sí, pero cabe aclarar que el préstamo sólo se realiza en los eventos y en el lugar destinado a los mismos, no fuera de ellos.",
  },
  {
    pregunta: "¿Cómo reservo una mesa para un evento?",
    respuesta:
      "En el caso de las tardes de juegos no hay reserva, sólo basta con asistir directamente. En cambio, en el caso de los torneos se solicita inscripción previa.",
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
      <p>
        El Rincón de Hermes es un club de juegos de mesa modernos ubicado en Salta, pensado para reunir a la comunidad a pasar un rato socializando, compartiendo y disfutando, cualquiera sea tu nivel de experiencia.
      </p>
      <p>  
        Nuestra misión es acercar el juego de mesa como una forma de compartir tiempo real con otras personas, en un espacio cómodo y
        con una ludoteca que sigue creciendo.
      </p>
      <p>
        Iniciamos en el año 2017, ¡este año estaremos cumpliendo 9 años en Octubre!
      </p>

    <div className="contenedor-imagen">
      <img 
          src={grupo} 
          alt="Equipo del Rincón de Hermes"
      />
    </div>

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