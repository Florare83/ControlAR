import tardes from "../img/eventos.jpeg";
// Los eventos del club, por ahora escritos a mano.
// Cuando el backend tenga esta info, esto se va a reemplazar
// por un fetch a la API (igual que los juegos).
const eventos = [
  {
    id: 1,
    titulo: "Tarde de juegos",
    descripcion:
      "Una tarde mensual para descubrir juegos de mesa modernos",
    fecha: "Fecha: Domingo 27 de septiembre",
    hora: "Horario: de 17 a 21",
    lugar: "Lugar: Fundación Copaipa - Zuviría 291",
  },
  {
    id: 2,
    titulo: "Torneo de Catan",
    descripcion:
      "Torneo abierto a todos los niveles. Inscripción previa por Whatsapp",
    fecha: "Fecha: Domingo 27 de septiembre",
    hora: "Horario: de 17 a 21",
    lugar: "Lugar: Fundación Copaipa - Zuviría 291",
  },

    {
    id: 3,
    titulo: "Encuentro Provincial de Juegos de Mesa",
    descripcion:
      "Clubes y Editoriales brindando sus servicios al público en general",
    fecha: "Fecha: Mes de Junio",
    hora: "Horario: de 12 a 22",
    lugar: "Lugar: Usina Cultural - España 1-98",
  },
];



function Club() {
  return (
    <div className="pagina">
      <h1>Club</h1>
      <p className="subtitulo">
        Próximas actividades y eventos organizados por El Rincón de Hermes.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {eventos.map((evento) => (
          <div className="tarjeta" key={evento.id}>
            {/* 1. Encapsulamos los textos */}
            <div className="tarjeta-contenido">
              <h3 style={{ margin: "0 0 6px" }}>{evento.titulo}</h3>
              <p style={{ margin: "0 0 8px", color: "var(--texto-suave)" }}>
                {evento.descripcion}
              </p>
              <p>
                {evento.fecha}<br />
                {evento.hora}<br />
                {evento.lugar}
              </p>
            </div>

            {/* 2. Agregamos la imagen a la derecha */}
            <img 
              src={tardes} 
              alt={evento.titulo} 
              className="tarjeta-imagen" 
            />
          </div>
        ))}
      </div>
    </div>
  );
}
export default Club;