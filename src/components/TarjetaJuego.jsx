
<div className="etiquetas">
  <span
    className={`etiqueta ${
      enPrestamo ? "no-disponible" : "disponible"
    }`}
    title={
      enPrestamo
        ? "En préstamo"
        : "Disponible para préstamo"
    }
  >
    <span aria-hidden="true">
      {enPrestamo ? "📤" : "📥"}
    </span>{" "}
    {enPrestamo
      ? "En préstamo"
      : "Disponible para préstamo"}
  </span>

  <span
    className={`etiqueta ${
      enVenta ? "disponible" : "neutra"
    }`}
    title={
      enVenta
        ? "Disponible en tienda"
        : "No disponible en tienda"
    }
  >
    <span aria-hidden="true">
      {enVenta ? "🛒" : "🚫"}
    </span>{" "}
    {enVenta
      ? "Disponible en tienda"
      : "No disponible en tienda"}
  </span>
</div>
