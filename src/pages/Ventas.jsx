import { useEffect, useState } from "react";
import {
  cancelarPedidoEfectivo,
  listarVentasAdmin,
  marcarPedidoPagado,
} from "../api/api.js";
import { useToast } from "../context/ToastContext.jsx";
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

const ETIQUETAS = {
  aprobado: "Pagado",
  pendiente: "Pago pendiente",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
};

const EFECTIVO = "efectivo_transferencia";

function textoJuegos(venta) {
  return venta.items
    .map((i) => (i.cantidad > 1 ? `${i.titulo} × ${i.cantidad}` : i.titulo))
    .join(", ");
}

// Detalle completo de una venta (se muestra en una ventana modal).
function DetalleVenta({ venta, ocupado, error, onConfirmar, onCancelar }) {
  const unidades = venta.items.reduce((suma, i) => suma + i.cantidad, 0);

  return (
    <div className="venta-detalle">
      <dl className="venta-detalle-datos">
        <div>
          <dt>Estado</dt>
          <dd>
            <span className={`prestamo-estado ${venta.estado}`}>
              {ETIQUETAS[venta.estado] || venta.estado}
            </span>
          </dd>
        </div>
        <div>
          <dt>Forma de pago</dt>
          <dd>{venta.forma_pago_texto || "Mercado Pago"}</dd>
        </div>
        <div>
          <dt>Pedido creado</dt>
          <dd>{fechaHoraArgentina(venta.creado_en || venta.fecha)}</dd>
        </div>
        <div>
          <dt>Pagado</dt>
          <dd>{fechaHoraArgentina(venta.pagado_en)}</dd>
        </div>
        <div>
          <dt>Cliente</dt>
          <dd>{venta.cliente ? venta.cliente.nombre : "Cuenta eliminada"}</dd>
        </div>
        <div>
          <dt>Correo</dt>
          <dd>{venta.cliente ? venta.cliente.email : "—"}</dd>
        </div>
        {venta.forma_pago !== EFECTIVO && (
          <div>
            <dt>N.º de pago (Mercado Pago)</dt>
            <dd>{venta.pago_id || "—"}</dd>
          </div>
        )}
      </dl>

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
            {venta.items.map((item, indice) => (
              <tr key={`${venta.id}-${indice}`}>
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
                {dinero(venta.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {venta.forma_pago === EFECTIVO && venta.estado === "pendiente" && (
        <div className="venta-detalle-confirmar">
          <p className="ayuda">
            Pago en efectivo/transferencia pendiente. Cuando el cliente te
            pague, confirmalo: recién ahí se descuenta el stock.
          </p>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-acciones">
            <button
              type="button"
              className="boton"
              disabled={ocupado}
              onClick={onConfirmar}
            >
              {ocupado ? "Guardando..." : "Confirmar pago"}
            </button>
            <button
              type="button"
              className="boton boton-secundario"
              disabled={ocupado}
              onClick={onCancelar}
            >
              Cancelar pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Descarga el listado que se está viendo como CSV (se abre bien en Excel).
function descargarCsv(ventas) {
  const celda = (valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`;

  const filas = [
    ["Pedido", "Fecha", "Cliente", "Correo", "Juegos", "Total", "Forma de pago", "Estado"],
    ...ventas.map((v) => [
      v.id,
      fechaArgentina(v.fecha),
      v.cliente ? v.cliente.nombre : "Cuenta eliminada",
      v.cliente ? v.cliente.email : "",
      textoJuegos(v),
      String(v.total).replace(".", ","),
      v.forma_pago_texto || "Mercado Pago",
      ETIQUETAS[v.estado] || v.estado,
    ]),
  ];

  const texto = filas.map((fila) => fila.map(celda).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff" + texto], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = `ventas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export default function Ventas() {
  const toast = useToast();
  const [estado, setEstado] = useState("aprobado");
  const [buscar, setBuscar] = useState("");
  const [buscarAplicado, setBuscarAplicado] = useState("");

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [accionando, setAccionando] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");
  // Al cambiar, se vuelve a pedir el listado (después de confirmar o cancelar).
  const [version, setVersion] = useState(0);

  // Espera un momento después de escribir antes de consultar.
  useEffect(() => {
    const temporizador = setTimeout(
      () => setBuscarAplicado(buscar.trim()),
      350
    );

    return () => clearTimeout(temporizador);
  }, [buscar]);

  useEffect(() => {
    let vigente = true;

    setCargando(true);
    setError("");

    listarVentasAdmin({ estado, buscar: buscarAplicado })
      .then((respuesta) => {
        if (vigente) setDatos(respuesta);
      })
      .catch((e) => {
        if (vigente) setError(e.message || "No se pudieron cargar las ventas.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [estado, buscarAplicado, version]);

  function abrirDetalle(venta) {
    setErrorAccion("");
    setVentaDetalle(venta);
  }

  async function ejecutarAccion(accion, textoConfirmar, textoExito) {
    if (!window.confirm(textoConfirmar)) return;

    setAccionando(true);
    setErrorAccion("");

    try {
      const actualizada = await accion(ventaDetalle.id);
      setVentaDetalle(actualizada);
      setVersion((v) => v + 1);
      toast.exito(textoExito);
    } catch (e) {
      setErrorAccion(e.message || "No se pudo completar la acción.");
    } finally {
      setAccionando(false);
    }
  }

  const resumen = datos ? datos.resumen : null;
  const ventas = datos ? datos.pedidos : [];
  const maximo = resumen && resumen.mas_vendidos.length
    ? resumen.mas_vendidos[0].cantidad
    : 1;

  const opciones = [
    { valor: "aprobado", texto: `Pagadas${resumen ? ` (${resumen.pagados})` : ""}` },
    { valor: "pendiente", texto: `Pago pendiente${resumen ? ` (${resumen.pendientes})` : ""}` },
    { valor: "rechazado", texto: `Rechazadas${resumen ? ` (${resumen.rechazados})` : ""}` },
    { valor: "cancelado", texto: `Canceladas${resumen ? ` (${resumen.cancelados ?? 0})` : ""}` },
    { valor: "", texto: "Todas" },
  ];

  return (
    <section className="ventas">
      <h1>Ventas</h1>
      <p className="ventas-subtitulo">
        Seguí lo que se vendió en la tienda: ingresos, pedidos y juegos más
        elegidos.
      </p>

      {error && (
        <div className="prestamos-error" role="alert">
          <strong>No pudimos cargar las ventas.</strong>
          <span>{error}</span>
        </div>
      )}

      {resumen && (
        <>
          <dl className="prestamos-resumen ventas-resumen">
            <div>
              <dd className="compras-monto">{dinero(resumen.ingresos_total)}</dd>
              <dt>Ingresos totales</dt>
            </div>
            <div>
              <dd className="compras-monto">{dinero(resumen.ingresos_mes)}</dd>
              <dt>Ingresos de este mes</dt>
            </div>
            <div>
              <dd>{resumen.pagados}</dd>
              <dt>{resumen.pagados === 1 ? "Pedido pagado" : "Pedidos pagados"}</dt>
            </div>
            <div>
              <dd className="compras-monto">{dinero(resumen.ticket_promedio)}</dd>
              <dt>Compra promedio</dt>
            </div>
          </dl>

          {resumen.mas_vendidos.length > 0 && (
            <div className="ventas-top">
              <h2>Juegos más vendidos</h2>

              <ol>
                {resumen.mas_vendidos.map((juego) => (
                  <li key={juego.titulo}>
                    <span className="ventas-top-nombre">{juego.titulo}</span>
                    <span
                      className="ventas-top-barra"
                      style={{ width: `${(juego.cantidad / maximo) * 100}%` }}
                      aria-hidden="true"
                    />
                    <span className="ventas-top-cantidad">
                      {juego.cantidad} {juego.cantidad === 1 ? "unidad" : "unidades"}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      <div className="ventas-filtros">
        <div className="ventas-filtro ventas-filtro-busqueda">
          <label htmlFor="ventas-buscar">
            Buscar por cliente, correo o número de pedido
          </label>
          <input
            id="ventas-buscar"
            type="search"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Escribí un nombre, correo o número..."
          />
        </div>

        <div className="ventas-filtro">
          <label htmlFor="ventas-estado">Estado</label>
          <select
            id="ventas-estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            {opciones.map((o) => (
              <option key={o.valor || "todas"} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="boton ventas-exportar"
          onClick={() => descargarCsv(ventas)}
          disabled={ventas.length === 0}
        >
          Descargar CSV
        </button>
      </div>

      {cargando && (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando ventas...
        </p>
      )}

      {!cargando && !error && ventas.length === 0 && (
        <div className="prestamos-vacio">
          <p className="prestamos-vacio-icono" aria-hidden="true">
            🧾
          </p>
          <p className="prestamos-vacio-titulo">No hay pedidos para mostrar</p>
          <p>Probá con otro estado o con otra búsqueda.</p>
        </div>
      )}

      {!cargando && !error && ventas.length > 0 && (
        <>
          <p className="ventas-cantidad" role="status">
            Mostrando {ventas.length}{" "}
            {ventas.length === 1 ? "pedido" : "pedidos"}
            {ventas.length === 200 ? " (los 200 más recientes)" : ""}.
          </p>

          <div className="ventas-tabla-contenedor">
            <table className="ventas-tabla">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Juegos</th>
                  <th>Total</th>
                  <th>Forma de pago</th>
                  <th>Estado</th>
                  <th>Detalle</th>
                </tr>
              </thead>

              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td>#{venta.id}</td>
                    <td>{fechaArgentina(venta.fecha)}</td>
                    <td>
                      {venta.cliente ? (
                        <>
                          <span className="ventas-cliente">
                            {venta.cliente.nombre}
                          </span>
                          <span className="ventas-correo">
                            {venta.cliente.email}
                          </span>
                        </>
                      ) : (
                        <span className="ventas-correo">Cuenta eliminada</span>
                      )}
                    </td>
                    <td>
                      <ul className="ventas-juegos">
                        {venta.items.map((item, indice) => (
                          <li key={`${venta.id}-${indice}`}>
                            {item.titulo}
                            {item.cantidad > 1 && (
                              <span className="compra-detalle-cantidad">
                                {" "}
                                × {item.cantidad}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="ventas-total">{dinero(venta.total)}</td>
                    <td>{venta.forma_pago_texto || "Mercado Pago"}</td>
                    <td>
                      <span className={`prestamo-estado ${venta.estado}`}>
                        {ETIQUETAS[venta.estado] || venta.estado}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="venta-ojo"
                        aria-label={`Ver detalle del pedido #${venta.id}`}
                        title="Ver detalle"
                        onClick={() => abrirDetalle(venta)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {ventaDetalle && (
        <Modal
          titulo={`Pedido #${ventaDetalle.id}`}
          ancho={720}
          ocupado={accionando}
          onCerrar={() => setVentaDetalle(null)}
        >
          <DetalleVenta
            venta={ventaDetalle}
            ocupado={accionando}
            error={errorAccion}
            onConfirmar={() =>
              ejecutarAccion(
                marcarPedidoPagado,
                `¿Confirmás que el pedido #${ventaDetalle.id} se pagó? Se va a descontar el stock.`,
                `Pedido #${ventaDetalle.id} marcado como pagado.`
              )
            }
            onCancelar={() =>
              ejecutarAccion(
                cancelarPedidoEfectivo,
                `¿Cancelar el pedido #${ventaDetalle.id}? No se puede deshacer.`,
                `Pedido #${ventaDetalle.id} cancelado.`
              )
            }
          />
        </Modal>
      )}
    </section>
  );
}
