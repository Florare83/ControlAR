// Tablas del panel en celular.
//
// En pantallas angostas las tablas anchas (.tabla y .ventas-tabla) se muestran como
// tarjetas: cada fila pasa a ser una tarjeta y cada celda lleva su título al lado
// (lo dibuja mobile.css con `content: attr(data-label)`).
//
// Para no tocar el código de cada pantalla, este archivo copia el texto de cada
// encabezado (<th>) a las celdas de su columna como `data-label`. Vigila la página
// porque React vuelve a dibujar las filas cuando cambian los datos.
const SELECTOR = "table.tabla, table.ventas-tabla";

// Texto del encabezado sin las flechas de orden (▲ ▼ ↕) ni espacios de más.
function textoDeCabecera(th) {
  return (th.textContent || "").replace(/[▲▼↕↑↓]/g, "").replace(/\s+/g, " ").trim();
}

function etiquetarTabla(tabla) {
  const filaCabecera = tabla.querySelector("thead tr:last-child");
  if (!filaCabecera) return;

  const etiquetas = [];
  filaCabecera.querySelectorAll("th").forEach((th) => {
    const texto = textoDeCabecera(th);
    for (let i = 0; i < (th.colSpan || 1); i += 1) etiquetas.push(texto);
  });

  tabla.querySelectorAll("tbody > tr").forEach((fila) => {
    let columna = 0;
    for (const celda of fila.children) {
      if (celda.tagName !== "TD") continue;
      const ocupa = celda.colSpan || 1;
      const etiqueta = ocupa === 1 ? etiquetas[columna] : "";

      if (etiqueta) {
        if (celda.dataset.label !== etiqueta) celda.dataset.label = etiqueta;
        celda.classList.remove("celda-completa");
      } else if (!celda.classList.contains("celda-completa")) {
        // Sin título (acciones, filas de detalle): ocupa todo el ancho de la tarjeta.
        celda.removeAttribute("data-label");
        celda.classList.add("celda-completa");
      }
      columna += ocupa;
    }
  });

  if (!tabla.classList.contains("es-tarjetas")) tabla.classList.add("es-tarjetas");
}

function etiquetarTodas() {
  document.querySelectorAll(SELECTOR).forEach(etiquetarTabla);
}

// Devuelve una función para dejar de vigilar (se usa al desmontar la app).
export function iniciarTablasResponsivas() {
  etiquetarTodas();

  // Solo reacciona cuando se agregan nodos; cambiar atributos no dispara nada,
  // así que no hay bucles. El aviso llega antes de que el navegador dibuje.
  const observador = new MutationObserver((cambios) => {
    if (cambios.some((c) => c.addedNodes.length > 0)) etiquetarTodas();
  });
  observador.observe(document.body, { childList: true, subtree: true });

  return () => observador.disconnect();
}
