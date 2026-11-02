import { obtenerReporteVentas } from "../../api/api.js";
import { GraficoBarras, GraficoDona, Ranking } from "../../components/Graficos.jsx";
import { Carga, Kpi, Tarjeta, useReporte } from "./componentes.jsx";
import { compacto, dinero, etiquetaEje, etiquetaLarga, numero, porcentaje } from "./utilidades.js";

const FORMAS = { mercadopago: "Mercado Pago", efectivo_transferencia: "Efectivo / transferencia" };
const ESTADOS = { aprobado: "Pagados", pendiente: "Pendientes", rechazado: "Rechazados", cancelado: "Cancelados" };

function PanelVentas({ desde, hasta, cache, generacion }) {
  const estado = useReporte(
    `ventas|${desde}|${hasta}|${generacion}`,
    () => obtenerReporteVentas({ desde, hasta }),
    cache
  );

  return (
    <Carga estado={estado}>
      {(d) => {
        const r = d.resumen;
        const a = d.anterior;
        const hayPedidos = d.por_estado.length > 0;

        if (!hayPedidos && d.stock_bajo.length === 0) {
          return (
            <div className="rep-tarjeta">
              <p className="rep-vacio">
                {desde || hasta ? "No hay pedidos en ese período." : "Todavía no hay pedidos registrados."}
              </p>
            </div>
          );
        }

        const sinPagar = [
          r.pendientes && `${r.pendientes} pendientes`,
          r.rechazados && `${r.rechazados} rechazados`,
          r.cancelados && `${r.cancelados} cancelados`,
        ].filter(Boolean);

        return (
          <>
            <dl className="rep-kpis">
              <Kpi etiqueta="Ingresos" valor={dinero(r.ingresos)} actual={r.ingresos} anterior={a?.ingresos} />
              <Kpi
                etiqueta="Pedidos pagados"
                valor={numero(r.pedidos_pagados)}
                actual={r.pedidos_pagados}
                anterior={a?.pedidos_pagados}
              />
              <Kpi etiqueta="Unidades vendidas" valor={numero(r.unidades)} actual={r.unidades} anterior={a?.unidades} />
              <Kpi
                etiqueta="Ticket promedio"
                valor={dinero(r.ticket_promedio)}
                actual={r.ticket_promedio}
                anterior={a?.ticket_promedio}
              />
              <Kpi
                etiqueta="Compradores"
                valor={numero(r.compradores)}
                actual={r.compradores}
                anterior={a?.compradores}
              />
              <Kpi
                etiqueta="Pedidos que se pagan"
                valor={porcentaje(r.tasa_pago)}
                nota={sinPagar.length ? sinPagar.join(" · ") : "Ninguno sin pagar"}
              />
            </dl>

            <div className="rep-grid">
              <Tarjeta
                id="rep-ingresos"
                ancha
                titulo="Ingresos en el tiempo"
                ayuda={`Pedidos pagados, ${d.granularidad === "mes" ? "mes por mes" : "día por día"}, según el día del pago.`}
              >
                <GraficoBarras
                  ariaLabel="Ingresos por período"
                  datos={d.serie.map((p) => ({
                    etiqueta: etiquetaEje(p.clave, d.granularidad),
                    titulo: etiquetaLarga(p.clave, d.granularidad),
                    valor: p.ingresos,
                  }))}
                  formato={dinero}
                  formatoEje={compacto}
                  nombreValor="Ingresos"
                  entero={false}
                  vacio="Todavía no hay ventas pagadas en el período."
                />
              </Tarjeta>

              <Tarjeta id="rep-vendidos" titulo="Juegos más vendidos" ayuda="Por unidades, de pedidos pagados.">
                <Ranking
                  datos={d.mas_vendidos.map((j) => ({
                    nombre: j.titulo,
                    valor: j.unidades,
                    detalle: `${dinero(j.ingresos)} en ingresos`,
                  }))}
                  formato={(n) => `${numero(n)} ${n === 1 ? "unidad" : "unidades"}`}
                  color="var(--rep-3)"
                  vacio="Todavía no hay ventas pagadas en el período."
                />
              </Tarjeta>

              <Tarjeta id="rep-categorias-v" titulo="Ingresos por categoría">
                <Ranking
                  datos={d.por_categoria.map((c) => ({ nombre: c.nombre, valor: c.ingresos }))}
                  formato={dinero}
                  color="var(--rep-5)"
                  vacio="Todavía no hay ventas pagadas en el período."
                />
              </Tarjeta>
            </div>

            <div className="rep-grid tres">
              <Tarjeta id="rep-forma-pago" titulo="Forma de pago" ayuda="Ingresos según cómo se pagó.">
                <GraficoDona
                  ariaLabel="Ingresos por forma de pago"
                  datos={d.por_forma_pago.map((f) => ({ nombre: FORMAS[f.forma] || f.forma, valor: f.ingresos }))}
                  formato={dinero}
                  formatoCentro={(n) => `$${compacto(n)}`}
                  centro="ingresos"
                  vacio="Todavía no hay ventas pagadas en el período."
                />
              </Tarjeta>

              <Tarjeta id="rep-estado-pedidos" titulo="Estado de los pedidos">
                <GraficoDona
                  ariaLabel="Pedidos según su estado"
                  datos={d.por_estado.map((e) => ({ nombre: ESTADOS[e.estado] || e.estado, valor: e.cantidad }))}
                  formato={numero}
                  centro="pedidos"
                />
              </Tarjeta>

              <Tarjeta id="rep-stock" titulo="Stock bajo" ayuda="Juegos en venta con 2 unidades o menos.">
                {d.stock_bajo.length === 0 ? (
                  <p className="rep-vacio">Todos los juegos tienen stock suficiente.</p>
                ) : (
                  <ul className="rep-lista-simple">
                    {d.stock_bajo.map((j) => (
                      <li key={j.titulo}>
                        <span>{j.titulo}</span>
                        <span className={j.stock === 0 ? "rep-tag-alerta" : undefined}>
                          {j.stock === 0 ? "Agotado" : `${j.stock} en stock`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Tarjeta>
            </div>

            <div className="rep-grid">
              <Tarjeta id="rep-semana-v" ancha titulo="Qué día se vende más" ayuda="Pedidos pagados según el día de la semana.">
                <GraficoBarras
                  ariaLabel="Pedidos pagados por día de la semana"
                  datos={d.por_dia_semana.map((x) => ({ etiqueta: x.dia.slice(0, 3), titulo: x.dia, valor: x.pedidos }))}
                  formato={numero}
                  nombreValor="Pedidos"
                  color="var(--rep-3)"
                  alto={200}
                  vacio="Todavía no hay ventas pagadas en el período."
                />
              </Tarjeta>
            </div>
          </>
        );
      }}
    </Carga>
  );
}

export default PanelVentas;
