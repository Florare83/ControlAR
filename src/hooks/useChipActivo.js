import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// En celular el menú del panel / de «Mi cuenta» es una fila de botones que se desliza
// hacia los costados. Al cambiar de sección, deja visible el botón activo.
export default function useChipActivo() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Solo en celular: en pantallas grandes el menú es una columna fija.
    if (!window.matchMedia("(max-width: 700px)").matches) return;
    const activo = document.querySelector(".panel-menu a.activo");
    activo?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);
}
