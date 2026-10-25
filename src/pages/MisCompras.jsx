import { useEffect, useState } from "react";
import { listarMisCompras } from "../api/api.js";
import Modal from "../components/Modal.jsx";

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

function fechaHoraArgentina(fecha) {
  if (!fecha) return "—";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return "—";

  return valor.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Salta",
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

function textoFormaPago(compra) {
  return compra.forma_pago === EFECTIVO ? "Efectivo / Transferencia" : "Mercado Pago";
}

// Detalle completo de una compra (se muestra en una ventana modal).
function DetalleCompra({ compra }) {
  const unidades = compra.items.reduce((suma, i) => suma + i.cantidad, 0);

  return (
    <div className="venta-detalle">
      <dl className="venta-detalle-datos">
        <div>
          <dt>Estado</dt>
          <dd>
            <span className={`prestamo-estado ${compra.estado}`}>
              {ESTADOS[compra.estado] || compra.estado}
            </span>
          </dd>
        </div>
        <div>
          <dt>Forma de pago</dt>
          <dd>{textoFormaPago(compra)}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{fechaHoraArgentina(compra.fecha)}</dd>
        </div>
      </dl>

      {compra.forma_pago === EFECTIVO && compra.estado === "pendiente" && (
        <p className="ayuda">
          Pago en efectivo/transferencia: coordinalo con la tienda por
          WhatsApp. Cuando lo confirmemos, pasa a "Pagado".
        </p>
      )}

      <div className="ventas-tabla-contenedor">
        <table className="venta-detalle-tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="venta-num">Cant.</th>
              <th className="venta-num">Precio unit.</th>
              <th className="venta-num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {compra.items.map((item, indice) => (
              <tr key={`${compra.id}-${indice}`}>
                <td>{item.titulo}</td>
                <td className="venta-num">{item.cantidad}</td>
                <td className="venta-num">{dinero(item.precio_unitario)}</td>
                <td className="venta-num">
                  {dinero(
                    item.subtotal ?? item.precio_unitario * item.cantidad
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">
                Total ({unidades} {unidades === 1 ? "unidad" : "unidades"})
              </th>
              <td colSpan={3} className="venta-num venta-detalle-total">
                {dinero(compra.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Ej.: "Catan y 2 más" / "Catan × 2".
function resumenProductos(compra) {
  const [primero, ...resto] = compra.items;
  if (!primero) return "Sin productos";

  const nombre =
    primero.cantidad > 1 ? `${primero.titulo} × ${primero.cantidad}` : primero.titulo;

  return resto.length === 0
    ? nombre
    : `${nombre} y ${resto.length} ${resto.length === 1 ? "producto más" : "productos más"}`;
}

function MisCompras() {
  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [compraDetalle, setCompraDetalle] = useState(null);

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
                  <div className="compra-cabecera-acciones">
                    <span className={`prestamo-estado ${compra.estado}`}>
                      {ESTADOS[compra.estado] || compra.estado}
                    </span>
                    <button
                      type="button"
                      className="venta-ojo"
                      aria-label={`Ver detalle del pedido #${compra.id}`}
                      title="Ver detalle"
                      onClick={() => setCompraDetalle(compra)}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                </div>

                {compra.forma_pago === EFECTIVO && compra.estado === "pendiente" && (
                  <p className="ayuda">
                    Pago en efectivo/transferencia: coordinalo con la tienda por
                    WhatsApp. Cuando lo confirmemos, pasa a "Pagado".
                  </p>
                )}

                <p className="compra-resumen">
                  {resumenProductos(compra)}
                </p>

                <dl className="prestamo-fechas compra-pie">
                  <div>
                    <dt>Fecha</dt>
                    <dd>{fechaArgentina(compra.fecha)}</dd>
                  </div>
                  <div>
                    <dt>Forma de pago</dt>
                    <dd>{textoFormaPago(compra)}</dd>
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

      {compraDetalle && (
        <Modal
          titulo={`Pedido #${compraDetalle.id}`}
          ancho={680}
          onCerrar={() => setCompraDetalle(null)}
        >
          <DetalleCompra compra={compraDetalle} />
        </Modal>
      )}
    </main>
  );
}

export default MisCompras;
