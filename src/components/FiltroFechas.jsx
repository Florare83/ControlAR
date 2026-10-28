// Filtro por rango de fechas (Desde / Hasta, ambas inclusive). Las fechas son
// texto AAAA-MM-DD, tal como las entrega <input type="date">.
function FiltroFechas({ desde, hasta, onDesde, onHasta, etiqueta = "Fecha de retiro" }) {
  const hayFechas = Boolean(desde || hasta);

  return (
    <fieldset className="filtro-fechas">
      <legend>{etiqueta}</legend>

      <div className="filtro-fechas-campo">
        <label htmlFor="filtro-desde">Desde</label>
        <input
          id="filtro-desde"
          type="date"
          value={desde}
          max={hasta || undefined}
          onChange={(e) => onDesde(e.target.value)}
        />
      </div>

      <div className="filtro-fechas-campo">
        <label htmlFor="filtro-hasta">Hasta</label>
        <input
          id="filtro-hasta"
          type="date"
          value={hasta}
          min={desde || undefined}
          onChange={(e) => onHasta(e.target.value)}
        />
      </div>

      {hayFechas && (
        <button
          type="button"
          className="filtro-fechas-limpiar"
          onClick={() => {
            onDesde("");
            onHasta("");
          }}
        >
          Quitar fechas
        </button>
      )}
    </fieldset>
  );
}

export default FiltroFechas;
