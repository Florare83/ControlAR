import { obtenerReportePrestamos } from "../../api/api.js";
import { GraficoBarras, GraficoDona, GraficoLinea, Ranking } from "../../components/Graficos.jsx";
import { Carga, Kpi, LeyendaLinea, MiniBarra, Tarjeta, useReporte } from "./componentes.jsx";
import { duracionTexto, etiquetaEje, etiquetaLarga, fechaCorta, numero } from "./utilidades.js";

function PanelPrestamos({ desde, hasta, cache, generacion }) {
  const estado = useReporte(
    `prestamos|${desde}|${hasta}|${generacion}`,
    () => obtenerReportePrestamos({ desde, hasta }),
    cache
  );

  return (
    <Carga estado={estado}>
      {(d) => {
        const r = d.resumen;
        const a = d.anterior;
        const maxDia = d.por_evento.reduce((m, x) => Math.max(m, x.cantidad), 0);

        if (r.total === 0 && d.pendientes.total === 0) {
          return (
            <div className="rep-tarjeta">
              <p className="rep-vacio">
                {desde || hasta ? "No hay préstamos en ese período." : "Todavía no hay préstamos registrados."}
              </p>
            </div>
          );
        }

        const personasNota =
          r.personas_nuevas !== null && r.personas_nuevas !== undefined
            ? `${numero(r.personas_nuevas)} nuevas · ${numero(r.personas_que_vuelven)} ya habían venido`
            : undefined;

        return (
          <>
            <dl className="rep-kpis">
              <Kpi etiqueta="Préstamos" valor={numero(r.total)} actual={r.total} anterior={a?.total} />
              <Kpi
                etiqueta="Personas distintas"
                valor={numero(r.personas)}
                nota={personasNota}
                actual={r.personas}
                anterior={a?.personas}
              />
              <Kpi etiqueta="Devueltos" valor={numero(r.devueltos)} actual={r.devueltos} anterior={a?.devueltos} />
              <Kpi etiqueta="En préstamo ahora" valor={numero(r.activos)} />
              <Kpi
                etiqueta="Sin devolver (días anteriores)"
                valor={numero(d.pendientes.total)}
                alerta={d.pendientes.total > 0}
                nota="Al día de hoy, sin importar el período"
              />
              <Kpi
                etiqueta="Duración promedio"
                valor={duracionTexto(r.duracion_promedio_minutos)}
                actual={r.duracion_promedio_minutos}
                anterior={a?.duracion_promedio_minutos}
                neutro
              />
            </dl>

            <div className="rep-grid">
              <Tarjeta
                id="rep-evolucion"
                ancha
                titulo="Evolución de los préstamos"
                ayuda={`Según la fecha de retiro, ${d.granularidad === "mes" ? "mes por mes" : "día por día"}.`}
              >
                <LeyendaLinea
                  items={[
                    { nombre: "Préstamos", color: "var(--rep-1)" },
                    { nombre: "Personas", color: "var(--rep-2)" },
                  ]}
                />
                <GraficoLinea
                  ariaLabel="Evolución de préstamos y personas en el período"
                  etiquetas={d.serie.map((p) => etiquetaEje(p.clave, d.granularidad))}
                  titulos={d.serie.map((p) => etiquetaLarga(p.clave, d.granularidad))}
                  series={[
                    { nombre: "Préstamos", valores: d.serie.map((p) => p.prestamos), color: "var(--rep-1)" },
                    { nombre: "Personas", valores: d.serie.map((p) => p.personas), color: "var(--rep-2)" },
                  ]}
                  formato={numero}
                />
              </Tarjeta>

              <Tarjeta id="rep-juegos" titulo="Juegos más prestados" ayuda="Los 10 que más salieron.">
                <Ranking
                  datos={d.juegos_mas_prestados.map((j) => ({
                    nombre: j.titulo,
                    valor: j.cantidad,
                    detalle: `${numero(j.personas)} ${j.personas === 1 ? "persona" : "personas"}`,
                  }))}
                  formato={(n) => `${numero(n)} ${n === 1 ? "vez" : "veces"}`}
                />
              </Tarjeta>

              <Tarjeta id="rep-semana" titulo="Qué día se presta más" ayuda="Préstamos según el día de la semana.">
                <GraficoBarras
                  ariaLabel="Préstamos por día de la semana"
                  datos={d.por_dia_semana.map((x) => ({ etiqueta: x.dia.slice(0, 3), titulo: x.dia, valor: x.cantidad }))}
                  formato={numero}
                  nombreValor="Préstamos"
                />
              </Tarjeta>
            </div>

            <div className="rep-grid tres">
              <Tarjeta id="rep-categorias" titulo="Por categoría">
                <GraficoDona
                  ariaLabel="Préstamos por categoría de juego"
                  datos={d.por_categoria.map((c) => ({ nombre: c.nombre, valor: c.cantidad }))}
                  formato={numero}
                  centro="préstamos"
                />
              </Tarjeta>

              <Tarjeta id="rep-sexo" titulo="Quiénes piden juegos">
                <GraficoDona
                  ariaLabel="Préstamos según el sexo de la persona"
                  datos={d.por_sexo.map((c) => ({ nombre: c.nombre, valor: c.cantidad }))}
                  formato={numero}
                  centro="préstamos"
                />
              </Tarjeta>

              <Tarjeta
                id="rep-sin-movimiento"
                titulo="Juegos sin movimiento"
                ayuda={`${numero(d.sin_movimiento.cantidad)} de ${numero(d.sin_movimiento.total_ludoteca)} juegos de la ludoteca no salieron en el período.`}
              >
                {d.sin_movimiento.cantidad === 0 ? (
                  <p className="rep-vacio">¡Todos los juegos se usaron al menos una vez!</p>
                ) : (
                  <ul className="rep-lista-simple">
                    {d.sin_movimiento.ejemplos.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                    {d.sin_movimiento.cantidad > d.sin_movimiento.ejemplos.length && (
                      <li className="rep-ayuda">
                        y {d.sin_movimiento.cantidad - d.sin_movimiento.ejemplos.length} más
                      </li>
                    )}
                  </ul>
                )}
              </Tarjeta>
            </div>

            <div className="rep-grid">
              <Tarjeta
                id="rep-pendientes"
                titulo="Pendientes de devolución"
                ayuda="Juegos que se retiraron en un día anterior y todavía no volvieron."
              >
                {d.pendientes.total === 0 ? (
                  <p className="rep-vacio">No hay juegos sin devolver. 🎉</p>
                ) : (
                  <>
                    <div className="rep-tabla-caja">
                      <table className="rep-tabla">
                        <caption className="solo-lectores">Préstamos sin devolver</caption>
                        <thead>
                          <tr>
                            <th scope="col">Persona</th>
                            <th scope="col">Juego</th>
                            <th scope="col">Retiro</th>
                            <th scope="col" className="num">Días</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.pendientes.items.map((p) => (
                            <tr key={p.id}>
                              <td>
                                {p.nombre}
                                <br />
                                <small className="rep-ayuda">
                                  DNI {p.dni} · {p.telefono}
                                </small>
                              </td>
                              <td>{p.titulo}</td>
                              <td>{fechaCorta(p.desde)}</td>
                              <td className="num">
                                <span className="rep-tag-alerta">{p.dias}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {d.pendientes.total > d.pendientes.items.length && (
                      <p className="rep-ayuda" style={{ marginTop: 10 }}>
                        Se muestran los {d.pendientes.items.length} más antiguos de {d.pendientes.total}.
                      </p>
                    )}
                  </>
                )}
              </Tarjeta>

              <Tarjeta
                id="rep-eventos"
                titulo="Movimiento por día de evento"
                ayuda="Los préstamos se agrupan por el día en que se retiraron. Si ese día hubo un evento cargado, se muestra su nombre."
              >
                {d.por_evento.length === 0 ? (
                  <p className="rep-vacio">No hay movimiento en el período.</p>
                ) : (
                  <div className="rep-tabla-caja">
                    <table className="rep-tabla">
                      <caption className="solo-lectores">Préstamos por día</caption>
                      <thead>
                        <tr>
                          <th scope="col">Fecha</th>
                          <th scope="col">Evento</th>
                          <th scope="col">Préstamos</th>
                          <th scope="col" className="num">Personas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.por_evento.map((x) => (
                          <tr key={x.fecha}>
                            <td>{fechaCorta(x.fecha)}</td>
                            <td>{x.evento || <span className="rep-ayuda">Sin evento cargado</span>}</td>
                            <td>
                              <div className="rep-celda-barra">
                                <strong>{x.cantidad}</strong>
                                <MiniBarra valor={x.cantidad} maximo={maxDia} />
                              </div>
                            </td>
                            <td className="num">{x.personas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Tarjeta>
            </div>
          </>
        );
      }}
    </Carga>
  );
}

export default PanelPrestamos;
