import { obtenerReporteReservas } from "../../api/api.js";
import { GraficoBarras, GraficoDona, Ranking } from "../../components/Graficos.jsx";
import { Carga, Kpi, MiniBarra, Tarjeta, useReporte } from "./componentes.jsx";
import { etiquetaEje, etiquetaLarga, fechaCorta, numero, porcentaje } from "./utilidades.js";

const ESTADOS = { entregada: "Retiradas", vencida: "Vencidas", cancelada: "Canceladas", activa: "Activas" };

function PanelReservas({ desde, hasta, cache, generacion }) {
  const estado = useReporte(
    `reservas|${desde}|${hasta}|${generacion}`,
    () => obtenerReporteReservas({ desde, hasta }),
    cache
  );

  return (
    <Carga estado={estado}>
      {(d) => {
        const r = d.resumen;
        const a = d.anterior;

        if (r.total === 0) {
          return (
            <div className="rep-tarjeta">
              <p className="rep-vacio">
                {desde || hasta ? "No hay reservas en ese período." : "Todavía no hay reservas registradas."}
              </p>
            </div>
          );
        }

        const maxEvento = d.por_evento.reduce((m, e) => Math.max(m, e.reservas), 0);

        return (
          <>
            <dl className="rep-kpis">
              <Kpi etiqueta="Reservas" valor={numero(r.total)} actual={r.total} anterior={a?.total} />
              <Kpi
                etiqueta="Personas distintas"
                valor={numero(r.personas)}
                actual={r.personas}
                anterior={a?.personas}
              />
              <Kpi etiqueta="Retiradas" valor={numero(r.entregadas)} actual={r.entregadas} anterior={a?.entregadas} />
              <Kpi
                etiqueta="Vencidas"
                valor={numero(r.vencidas)}
                actual={r.vencidas}
                anterior={a?.vencidas}
                menosEsMejor
              />
              <Kpi
                etiqueta="Canceladas"
                valor={numero(r.canceladas)}
                actual={r.canceladas}
                anterior={a?.canceladas}
                menosEsMejor
              />
              <Kpi
                etiqueta="Se retiran"
                valor={porcentaje(r.tasa_retiro)}
                nota="De las reservas terminadas sin cancelar"
                actual={r.tasa_retiro}
                anterior={a?.tasa_retiro}
              />
            </dl>

            <div className="rep-grid">
              <Tarjeta
                id="rep-reservas-tiempo"
                ancha
                titulo="Reservas en el tiempo"
                ayuda={`Según el día en que se hicieron, ${d.granularidad === "mes" ? "mes por mes" : "día por día"}.`}
              >
                <GraficoBarras
                  ariaLabel="Reservas por período"
                  datos={d.serie.map((p) => ({
                    etiqueta: etiquetaEje(p.clave, d.granularidad),
                    titulo: etiquetaLarga(p.clave, d.granularidad),
                    valor: p.reservas,
                  }))}
                  formato={numero}
                  nombreValor="Reservas"
                  color="var(--rep-5)"
                />
              </Tarjeta>

              <Tarjeta id="rep-reservas-estado" titulo="¿Cómo terminan las reservas?">
                <GraficoDona
                  ariaLabel="Reservas según cómo terminaron"
                  datos={d.por_estado.map((e) => ({ nombre: ESTADOS[e.estado] || e.estado, valor: e.cantidad }))}
                  formato={numero}
                  centro="reservas"
                />
              </Tarjeta>

              <Tarjeta id="rep-reservas-juegos" titulo="Juegos más reservados">
                <Ranking
                  datos={d.juegos_mas_reservados.map((j) => ({ nombre: j.titulo, valor: j.cantidad }))}
                  formato={(n) => `${numero(n)} ${n === 1 ? "vez" : "veces"}`}
                  color="var(--rep-5)"
                />
              </Tarjeta>

              <Tarjeta
                id="rep-reservas-eventos"
                ancha
                titulo="Reservas por evento"
                ayuda="Los eventos con reservas hechas en el período, del más reciente al más antiguo."
              >
                <div className="rep-tabla-caja">
                  <table className="rep-tabla">
                    <caption className="solo-lectores">Reservas por evento</caption>
                    <thead>
                      <tr>
                        <th scope="col">Evento</th>
                        <th scope="col">Reservas</th>
                        <th scope="col" className="num">Retiradas</th>
                        <th scope="col" className="num">Vencidas</th>
                        <th scope="col" className="num">Canceladas</th>
                        <th scope="col" className="num">Activas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.por_evento.map((e) => (
                        <tr key={`${e.evento}-${e.fecha}`}>
                          <td>
                            {e.evento}
                            {e.fecha && (
                              <>
                                <br />
                                <small className="rep-ayuda">{fechaCorta(e.fecha)}</small>
                              </>
                            )}
                          </td>
                          <td>
                            <div className="rep-celda-barra">
                              <strong>{e.reservas}</strong>
                              <MiniBarra valor={e.reservas} maximo={maxEvento} />
                            </div>
                          </td>
                          <td className="num">{e.entregadas}</td>
                          <td className="num">{e.vencidas}</td>
                          <td className="num">{e.canceladas}</td>
                          <td className="num">{e.activas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Tarjeta>
            </div>
          </>
        );
      }}
    </Carga>
  );
}

export default PanelReservas;
