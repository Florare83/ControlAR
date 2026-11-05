import { Link } from "react-router-dom";

// Se muestra cuando la dirección no corresponde a ninguna página.
function NoEncontrada() {
  return (
    <div className="pagina">
      <div className="tarjeta tarjeta-central">
        <h1 className="titulo-tarjeta">Página no encontrada</h1>
        <p className="subtitulo">
          La dirección que abriste no existe o cambió de lugar.
        </p>

        <p style={{ marginTop: 16, fontSize: 14 }}>
          <Link to="/nosotros">Ir al inicio</Link>
          {" · "}
          <Link to="/juegos">Ver los juegos</Link>
          {" · "}
          <Link to="/club">Ver los eventos</Link>
        </p>
      </div>
    </div>
  );
}

export default NoEncontrada;
