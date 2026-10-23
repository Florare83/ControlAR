
import { useEffect, useRef, useState } from "react";

// Formulario para crear un juego nuevo o editar uno existente.
// La imagen es opcional y se guarda como una URL pública.

const VACIO = {
  titulo: "",
  editorial: "",
  cantidad_jugadores: "",
  duracion_minutos: "",
  edad_minima: "",
  precio: "",
  stock: "0",
  en_venta: false,
  se_presta: false,
  categoria_id: "",
  imagen_url: "",
};

function desdeJuego(juego) {
  if (!juego) return { ...VACIO };

  return {
    titulo: juego.titulo,
    editorial: juego.editorial ?? "",
    cantidad_jugadores: juego.cantidad_jugadores,
    duracion_minutos: String(juego.duracion_minutos),
    edad_minima: String(juego.edad_minima),
    precio: String(juego.precio),
    stock: String(juego.stock),
    en_venta: juego.en_venta,
    se_presta: Boolean(juego.se_presta),
    categoria_id: String(juego.categoria.id),
    imagen_url: juego.imagen_url ?? "",
  };
}

function FormularioJuego({ juego, categorias, onGuardar, onCancelar }) {
  const [form, setForm] = useState(() => desdeJuego(juego));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorImagen, setErrorImagen] = useState(false);
  const campoTitulo = useRef(null);

  useEffect(() => {
    campoTitulo.current?.focus();
  }, []);

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }));

    if (campo === "imagen_url") {
      setErrorImagen(false);
    }
  }

  async function enviar(evento) {
    evento.preventDefault();
    setError("");

    const urlImagen = form.imagen_url.trim();

    if (urlImagen) {
      try {
        const url = new URL(urlImagen);

        if (!["http:", "https:"].includes(url.protocol)) {
          setError("La URL de la imagen debe comenzar con http:// o https://.");
          return;
        }
      } catch {
        setError("Ingresá una URL válida para la imagen o dejá el campo vacío.");
        return;
      }
    }

    setGuardando(true);

    const datos = {
      titulo: form.titulo.trim(),
      editorial: form.editorial.trim() || null,
      cantidad_jugadores: form.cantidad_jugadores.trim(),
      duracion_minutos: Number(form.duracion_minutos),
      edad_minima: Number(form.edad_minima),
      precio: Number(form.precio),
      stock: Number(form.stock),
      en_venta: form.en_venta,
      se_presta: form.se_presta,
      categoria_id: Number(form.categoria_id),
      imagen_url: urlImagen || null,
    };

    try {
      await onGuardar(datos);
    } catch (e) {
      setError(e.message || "No se pudo guardar el juego.");
      setGuardando(false);
    }
  }

  return (
    <div className="tarjeta tarjeta-columna" style={{ marginBottom: 24 }}>
      <h2>{juego ? `Editar "${juego.titulo}"` : "Agregar juego"}</h2>

      <form className="formulario" onSubmit={enviar} aria-busy={guardando}>
        <div className="campo">
          <label htmlFor="titulo">Título</label>
          <input
            id="titulo"
            ref={campoTitulo}
            value={form.titulo}
            minLength={2}
            maxLength={100}
            onChange={(e) => cambiar("titulo", e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="editorial">Editorial (opcional)</label>
          <input
            id="editorial"
            value={form.editorial}
            onChange={(e) => cambiar("editorial", e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="categoria">Categoría</label>
          <select
            id="categoria"
            value={form.categoria_id}
            onChange={(e) => cambiar("categoria_id", e.target.value)}
            required
            style={{ width: "100%", padding: "10px 12px" }}
          >
            <option value="">Elegí una categoría</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="imagen_url">URL de la imagen (opcional)</label>
          <input
            id="imagen_url"
            type="url"
            value={form.imagen_url}
            onChange={(e) => cambiar("imagen_url", e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            aria-describedby="ayuda-imagen"
          />
          <small id="ayuda-imagen" className="ayuda">
            Pegá el enlace directo a la imagen. Podés dejarlo vacío.
          </small>

          {form.imagen_url.trim() && (
            <div style={{ marginTop: 12 }}>
              {errorImagen ? (
                <p className="error" role="status">
                  No se pudo mostrar la vista previa. Revisá que el enlace
                  sea público y corresponda a una imagen.
                </p>
              ) : (
                <img
                  key={form.imagen_url}
                  src={form.imagen_url.trim()}
                  alt="Vista previa de la imagen del juego"
                  onError={() => setErrorImagen(true)}
                  onLoad={() => setErrorImagen(false)}
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: 260,
                    maxHeight: 220,
                    objectFit: "contain",
                    borderRadius: 8,
                    marginTop: 8,
                  }}
                />
              )}
            </div>
          )}
        </div>

        <div className="campo">
          <label htmlFor="jugadores">Cantidad de jugadores</label>
          <input
            id="jugadores"
            value={form.cantidad_jugadores}
            onChange={(e) =>
              cambiar("cantidad_jugadores", e.target.value)
            }
            aria-describedby="ayuda-jugadores"
            required
          />
          <small id="ayuda-jugadores" className="ayuda">
            Por ejemplo: 2-4
          </small>
        </div>

        <div className="campo">
          <label htmlFor="duracion">Duración (minutos)</label>
          <input
            id="duracion"
            type="number"
            min="1"
            value={form.duracion_minutos}
            onChange={(e) => cambiar("duracion_minutos", e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="edad">Edad mínima</label>
          <input
            id="edad"
            type="number"
            min="0"
            value={form.edad_minima}
            onChange={(e) => cambiar("edad_minima", e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="precio">Precio</label>
          <input
            id="precio"
            type="number"
            min="0"
            step="0.01"
            value={form.precio}
            onChange={(e) => cambiar("precio", e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="stock">Stock</label>
          <input
            id="stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => cambiar("stock", e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.en_venta}
              onChange={(e) => cambiar("en_venta", e.target.checked)}
              style={{ width: "auto" }}
              aria-describedby="ayuda-en-venta"
            />
            Está en venta
          </label>
          <small id="ayuda-en-venta" className="ayuda">
            Solo los juegos en venta muestran stock, precio y el botón
            "Agregar al carrito".
          </small>
        </div>

        <div className="campo">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.se_presta}
              onChange={(e) => cambiar("se_presta", e.target.checked)}
              style={{ width: "auto" }}
              aria-describedby="ayuda-se-presta"
            />
            Disponible para préstamo
          </label>
          <small id="ayuda-se-presta" className="ayuda">
            Tildalo si el juego es de la ludoteca. Solo estos juegos se pueden
            prestar en los eventos y reservar desde el catálogo.
          </small>
        </div>

        {error && (
          <span className="error" role="alert">
            {error}
          </span>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="boton" type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
          <button
            className="boton"
            type="button"
            onClick={onCancelar}
            disabled={guardando}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormularioJuego;
