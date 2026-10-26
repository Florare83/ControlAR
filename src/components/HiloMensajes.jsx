// Conversación entre un cliente y el equipo, en formato de burbujas.
//   mensajes: [{ autor: "cliente" | "admin", texto, creado_en }]
//   yo: quién está mirando ("cliente" o "admin"): sus mensajes van a la derecha.
//   nombreCliente: cómo se muestra al cliente cuando lo mira el equipo.
function formatearFecha(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function HiloMensajes({ mensajes, yo, nombreCliente = "Cliente" }) {
  function autorDe(m) {
    if (m.autor === yo) return "Vos";
    return m.autor === "admin" ? "Equipo de El Rincón de Hermes" : nombreCliente;
  }

  return (
    <ul className="hilo" aria-label="Conversación">
      {mensajes.map((m, i) => (
        <li
          key={m.id ?? i}
          className={`hilo-burbuja ${m.autor === yo ? "propia" : "ajena"}`}
        >
          <span className="hilo-autor">{autorDe(m)}</span>
          <p className="hilo-texto">{m.texto}</p>
          <time className="hilo-hora" dateTime={m.creado_en}>
            {formatearFecha(m.creado_en)}
          </time>
        </li>
      ))}
    </ul>
  );
}

export default HiloMensajes;
