import { useEffect, useState } from "react";
import { listarMisCompras } from "../api/api.js";

function fechaArgentina(fecha) {
  if (!fecha) return "—";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return "—";

  return valor.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dinero(valor) {
  return Number(valor || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });
}

const ESTADOS = {
  aprobado: "Pagado",
  pendiente: "Pago pendiente",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
};

const EFECTIVO = "efectivo_transferencia";

function MisCompras() {
  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;

    listarMisCompras()
      .then((datos) => {
        if (vigente) {
          setCompras(Array.isArray(datos) ? datos : []);
        }
      })
      .catch((e) => {
        if (vigente) {
          setError(e.message || "No se pudo cargar tu historial de compras.");
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const pagadas = compras.filter((c) => c.estado === "aprobado");
  const totalGastado = pagadas.reduce((suma, c) => suma + Number(c.total), 0);

  return (
    <main className="pagina mis-prestamos mis-compras">
      <h1>Mis compras</h1>
      <p className="subtitle">
        Revisá los juegos que compraste y el estado de cada pago.
      </p>

      {cargando && (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando compras...
        </p>
      )}

      {!cargando && error && (
        <div className="prestamos-error" role="alert">
          <strong>No pudimos cargar tus compras.</strong>
          <span>{error}</span>
        </div>
      )}

      {!cargando && !error && compras.length === 0 && (
        <div className="prestamos-vacio">
          <p className="prestamos-vacio-icono" aria-hidden="true">
            🛍️
          </p>
          <p className="prestamos-vacio-titulo">Todavía no hiciste compras</p>
          <p>
            Cuando compres un juego en la tienda, vas a verlo acá con su
            detalle y el estado del pago.
          </p>
        </div>
      )}

      {!cargando && !error && compras.length > 0 && (
        <>
          <dl className="prestamos-resumen">
            <div>
              <dd>{pagadas.length}</dd>
              <dt>{pagadas.length === 1 ? "Compra pagada" : "Compras pagadas"}</dt>
            </div>
            <div>
              <dd className="compras-monto">{dinero(totalGastado)}</dd>
              <dt>Total gastado</dt>
            </div>
            <div>
              <dd>{compras.length}</dd>
              <dt>Pedidos en total</dt>
            </div>
          </dl>

          <ul className="prestamos-lista">
            {compras.map((compra) => (
              <li
                key={compra.id}
                className={`prestamo-item ${compra.estado}`}
              >
                <div className="prestamo-cabecera">
                  <h2 className="prestamo-titulo">Pedido #{compra.id}</h2>
                  <span className={`prestamo-estado ${compra.estado}`}>
                    {ESTADOS[compra.estado] || compra.estado}
                  </span>
                </div>

                {compra.forma_pago === EFECTIVO && compra.estado === "pendiente" && (
                  <p className="ayuda">
                    Pago en efectivo/transferencia: coordinalo con la tienda por
                    WhatsApp. Cuando lo confirmemos, pasa a "Pagado".
                  </p>
                )}

                <ul className="compra-detalle">
                  {compra.items.map((item, indice) => (
                    <li key={`${compra.id}-${indice}`}>
                      <span className="compra-detalle-nombre">
                        {item.titulo}
                        {item.cantidad > 1 && (
                          <span className="compra-detalle-cantidad">
                            {" "}
                            × {item.cantidad}
                          </span>
                        )}
                      </span>
                      <span>{dinero(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                <dl className="prestamo-fechas compra-pie">
                  <div>
                    <dt>Fecha</dt>
                    <dd>{fechaArgentina(compra.fecha)}</dd>
                  </div>
                  <div>
                    <dt>Forma de pago</dt>
                    <dd>
                      {compra.forma_pago === EFECTIVO
                        ? "Efectivo / Transferencia"
                        : "Mercado Pago"}
                    </dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{dinero(compra.total)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

export default MisCompras;
