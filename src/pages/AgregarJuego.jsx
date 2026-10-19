import { useEffect, useState } from "react";
import { crearJuego, listarCategorias } from "../api/api.js";
import { useToast } from "../context/ToastContext.jsx";
import FormularioJuego from "../components/FormularioJuego.jsx";

// Sección del panel del administrador: solo el formulario de carga,
// sin el listado de juegos.
function AgregarJuego() {
  const toast = useToast();
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // Al cambiar la clave, el formulario se vuelve a montar vacío.
  const [formularioKey, setFormularioKey] = useState(0);

  useEffect(() => {
    let activo = true;

    listarCategorias()
      .then((lista) => {
        if (activo) setCategorias(lista);
      })
      .catch((e) => {
        if (activo) setError(e.message);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  async function guardar(datos) {
    await crearJuego(datos);
    toast.exito(`"${datos.titulo}" se agregó al catálogo.`);
    setFormularioKey((k) => k + 1); // queda listo para cargar otro juego
  }

  return (
    <div>
      <h1>Agregar juegos</h1>
      <p className="subtitulo">Cargá un juego nuevo en el catálogo.</p>

      {cargando ? (
        <p className="cargando" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando...
        </p>
      ) : error ? (
        <p className="error" role="alert">{error}</p>
      ) : (
        <FormularioJuego
          key={formularioKey}
          juego={null}
          categorias={categorias}
          onGuardar={guardar}
          onCancelar={() => setFormularioKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

export default AgregarJuego;
