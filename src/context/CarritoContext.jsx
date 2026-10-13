
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "./AuthContext.jsx";

const CarritoContext = createContext(null);

export function CarritoProvider({ children }) {
  const toast = useToast();
  const { usuario, cargando } = useAuth();
  const navegar = useNavigate();

  const [items, setItems] = useState([]);

  function agregar(juego) {
    // Esperar a que se compruebe la sesión.
    if (cargando) {
      toast.info("Estamos verificando tu sesión. Intentá nuevamente.");
      return;
    }

    // Solo los usuarios autenticados pueden agregar juegos.
    if (!usuario) {
      toast.info("Para agregar juegos al carrito, iniciá sesión o registrate.");
      navegar("/login");
      return;
    }

    // El juego debe estar disponible para la venta.
    if (!juego.en_venta) {
      toast.error("Este juego no está disponible en tienda.");
      return;
    }

    // Comprobar el stock disponible.
    const enCarrito =
      items.find((item) => item.id === juego.id)?.cantidad ?? 0;

    if (enCarrito >= juego.stock) {
      toast.error(`No hay más stock de "${juego.titulo}".`);
      return;
    }

    setItems((actuales) => {
      const existe = actuales.some((item) => item.id === juego.id);

      if (existe) {
        return actuales.map((item) =>
          item.id === juego.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }

      return [
        ...actuales,
        {
          id: juego.id,
          titulo: juego.titulo,
          precio: juego.precio,
          cantidad: 1,
        },
      ];
    });

    toast.exito(`"${juego.titulo}" agregado al carrito.`);
  }

  function vaciar() {
    setItems([]);
  }

  const cantidadTotal = items.reduce(
    (suma, item) => suma + item.cantidad,
    0
  );

  return (
    <CarritoContext.Provider
      value={{ items, cantidadTotal, agregar, vaciar }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  return useContext(CarritoContext);
}
