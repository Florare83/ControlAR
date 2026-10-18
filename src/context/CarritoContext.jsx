import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { imagenDeJuego } from "../api/imagenes.js";

const CarritoContext = createContext(null);

// El carrito se guarda por usuario en el navegador: al pagar, el cliente sale
// a Mercado Pago y la página se recarga al volver, así que no puede vivir
// solo en memoria.
const clave = (usuarioId) => `controlar_carrito_${usuarioId}`;

function leerGuardado(usuarioId) {
  try {
    const crudo = window.localStorage.getItem(clave(usuarioId));
    const datos = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

export function CarritoProvider({ children }) {
  const toast = useToast();
  const { usuario, cargando } = useAuth();
  const navegar = useNavigate();

  const [items, setItems] = useState([]);
  const [abierto, setAbierto] = useState(false);

  // Evita pisar lo guardado antes de haberlo leído.
  const cargadoPara = useRef(null);

  // Al iniciar/cerrar sesión: cargar el carrito de ese usuario.
  useEffect(() => {
    if (cargando) return;

    if (usuario) {
      setItems(leerGuardado(usuario.id));
      cargadoPara.current = usuario.id;
    } else {
      setItems([]);
      setAbierto(false);
      cargadoPara.current = null;
    }
  }, [usuario?.id, cargando]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar cada cambio.
  useEffect(() => {
    if (!usuario || cargadoPara.current !== usuario.id) return;
    try {
      window.localStorage.setItem(clave(usuario.id), JSON.stringify(items));
    } catch {}
  }, [items, usuario]);

  function agregar(juego) {
    if (cargando) {
      toast.info("Estamos verificando tu sesión. Intentá nuevamente.");
      return;
    }

    if (!usuario) {
      toast.info("Para agregar juegos al carrito, iniciá sesión o registrate.");
      navegar("/login");
      return;
    }

    if (!juego.en_venta) {
      toast.error("Este juego no está disponible en tienda.");
      return;
    }

    const enCarrito =
      items.find((item) => item.id === juego.id)?.cantidad ?? 0;

    if (enCarrito >= juego.stock) {
      toast.error(`No hay más stock de "${juego.titulo}".`);
      return;
    }

    setItems((actuales) => {
      if (actuales.some((item) => item.id === juego.id)) {
        return actuales.map((item) =>
          item.id === juego.id
            ? { ...item, cantidad: item.cantidad + 1, stock: juego.stock }
            : item
        );
      }

      return [
        ...actuales,
        {
          id: juego.id,
          titulo: juego.titulo,
          precio: juego.precio,
          stock: juego.stock,
          imagen: juego.imagen_url?.trim() || imagenDeJuego(juego.titulo),
          cantidad: 1,
        },
      ];
    });

    // Como en cualquier tienda: al agregar se muestra el carrito.
    setAbierto(true);
  }

  function cambiarCantidad(id, cantidad) {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (cantidad <= 0) {
      quitar(id);
      return;
    }

    if (cantidad > item.stock) {
      toast.error(`Solo hay ${item.stock} unidades de "${item.titulo}".`);
      return;
    }

    setItems((actuales) =>
      actuales.map((i) => (i.id === id ? { ...i, cantidad } : i))
    );
  }

  function quitar(id) {
    setItems((actuales) => actuales.filter((i) => i.id !== id));
  }

  function vaciar() {
    setItems([]);
  }

  const cantidadTotal = useMemo(
    () => items.reduce((suma, item) => suma + item.cantidad, 0),
    [items]
  );

  const total = useMemo(
    () => items.reduce((suma, item) => suma + item.precio * item.cantidad, 0),
    [items]
  );

  return (
    <CarritoContext.Provider
      value={{
        items,
        cantidadTotal,
        total,
        abierto,
        abrir: () => setAbierto(true),
        cerrar: () => setAbierto(false),
        agregar,
        cambiarCantidad,
        quitar,
        vaciar,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  return useContext(CarritoContext);
}
