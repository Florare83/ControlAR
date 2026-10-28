// Filtro desplegable reutilizable (estado, tipo, etc.) para los paneles de administración.
// opciones: [{ valor, texto }]
function FiltroSelect({ id, etiqueta, valor, onCambio, opciones }) {
  return (
    <div className="filtro-select">
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} value={valor} onChange={(e) => onCambio(e.target.value)}>
        {opciones.map((o) => (
          <option key={o.valor || "todos"} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

export default FiltroSelect;
