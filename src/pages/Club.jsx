// Los eventos del club, por ahora escritos a mano.
// Cuando el backend tenga esta info, esto se va a reemplazar
// por un fetch a la API (igual que los juegos).
const eventos = [
  {
    id: 1,
    titulo: "Noche de juegos clásicos",
    descripcion:
      "Una noche para redescubrir juegos de mesa tradicionales, ideal para socios nuevos.",
    fecha: "Viernes 25 de septiembre, 19 hs",
  },
  {
    id: 2,
    titulo: "Torneo de Catan",
    descripcion:
      "Torneo abierto a todos los niveles. Inscripción previa en el mostrador del club.",
    fecha: "Sábado 3 de octubre, 17 hs",
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
            <h3 style={{ margin: "0 0 6px" }}>{evento.titulo}</h3>
            <p style={{ margin: "0 0 8px", color: "var(--texto-suave)" }}>
              {evento.descripcion}
            </p>
            <strong>{evento.fecha}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Club;