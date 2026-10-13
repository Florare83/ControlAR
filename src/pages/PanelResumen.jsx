import { Link } from "react-router-dom";

// Pantalla base del panel del administrador. Todavía sin funcionalidad:
// por ahora solo orienta hacia las secciones que ya existen.
function PanelResumen() {
  return (
    <div>
      <h1>Panel de administración</h1>
      <p className="subtitulo">Desde acá vas a poder ver el movimiento de la ludoteca.</p>

      <div className="tarjeta tarjeta-columna">
        <h2>Próximamente</h2>
        <p>Resumen de préstamos activos, juegos más pedidos y stock de la tienda.</p>
        <p>
          Mientras tanto: <Link to="/panel/prestamos">gestionar préstamos</Link> o{" "}
          <Link to="/juegos">administrar el catálogo de juegos</Link>.
        </p>
      </div>
    </div>
  );
}

export default PanelResumen;