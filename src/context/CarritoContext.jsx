import { createContext, useContext, useState } from "react";
import { useToast } from "./ToastContext.jsx";

// Carrito de compras en memoria: guarda qué juegos agregó la persona y cuántos.
// (Se vacía al recargar la página. Todavía no hay pantalla de compra: es el paso siguiente.)
const CarritoContext = createContext(null);

export function CarritoProvider({ children }) {
  const toast = useToast();
  const [items, setItems] = useState([]); // [{ id, titulo, precio, cantidad }]

  function agregar(juego) {
    // Doble control: aunque el botón solo se muestre en juegos en venta.
    if (!juego.en_venta) {
      toast.error("Este juego no está disponible en tienda.");
      return;
    }
    const enCarrito = items.find((i) => i.id === juego.id)?.cantidad ?? 0;
    if (enCarrito >= juego.stock) {
      toast.error(`No hay más stock de "${juego.titulo}".`);
      return;
    }

    setItems((actuales) => {
      const existe = actuales.some((i) => i.id === juego.id);
      if (existe) {
        return actuales.map((i) => (i.id === juego.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...actuales, { id: juego.id, titulo: juego.titulo, precio: juego.precio, cantidad: 1 }];
    });
    toast.exito(`"${juego.titulo}" agregado al carrito.`);
  }

  const cantidadTotal = items.reduce((suma, i) => suma + i.cantidad, 0);

  return (
    <CarritoContext.Provider value={{ items, cantidadTotal, agregar }}>
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  return useContext(CarritoContext);
}