// Encabezado de tabla que se puede tocar para ordenar. Un primer toque ordena
// por esa columna; otro toque invierte el sentido.
//   orden = { campo, direccion }  con direccion "asc" | "desc"
function ThOrdenable({ etiqueta, campo, orden, onOrdenar }) {
  const activo = orden.campo === campo;
  const ariaSort = activo
    ? orden.direccion === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th scope="col" aria-sort={ariaSort}>
      <button
        type="button"
        className={`th-ordenable ${activo ? "activo" : ""}`}
        onClick={() => onOrdenar(campo)}
        title={`Ordenar por ${etiqueta.toLowerCase()}`}
      >
        {etiqueta}
        <span className="th-ordenable-flecha" aria-hidden="true">
          {activo ? (orden.direccion === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

// Sentido con el que arranca cada columna al tocarla por primera vez.
export const DIRECCION_INICIAL = { fecha: "desc", juego: "asc", cliente: "asc", estado: "asc" };

// Nuevo orden al tocar una columna.
export function siguienteOrden(orden, campo) {
  if (orden.campo === campo) {
    return { campo, direccion: orden.direccion === "asc" ? "desc" : "asc" };
  }
  return { campo, direccion: DIRECCION_INICIAL[campo] ?? "asc" };
}

export default ThOrdenable;
