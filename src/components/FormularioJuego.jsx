import { useState } from "react";

// Formulario para crear un juego nuevo o editar uno existente.
// - Si recibe "juego", arranca con sus datos (modo edición).
// - Al enviar, llama a onGuardar(datos) y la página se encarga del resto.

const VACIO = {
  titulo: "",
  editorial: "",
  cantidad_jugadores: "",
  duracion_minutos: "",
  edad_minima: "",
  precio: "",
  stock: "0",
  en_venta: false,
  categoria_id: "",
};

function desdeJuego(juego) {
  if (!juego) return VACIO;
  return {
    titulo: juego.titulo,
    editorial: juego.editorial ?? "",
    cantidad_jugadores: juego.cantidad_jugadores,
    duracion_minutos: String(juego.duracion_minutos),
    edad_minima: String(juego.edad_minima),
    precio: String(juego.precio),
    stock: String(juego.stock),
    en_venta: juego.en_venta,
    categoria_id: String(juego.categoria.id),
  };
}

function FormularioJuego({ juego, categorias, onGuardar, onCancelar }) {
  const [form, setForm] = useState(desdeJuego(juego));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    setGuardando(true);

    // Los inputs devuelven texto: convertimos a número lo que la API espera así.
    const datos = {
      titulo: form.titulo.trim(),
      editorial: form.editorial.trim() || null,
      cantidad_jugadores: form.cantidad_jugadores.trim(),
      duracion_minutos: Number(form.duracion_minutos),
      edad_minima: Number(form.edad_minima),
      precio: Number(form.precio),
      stock: Number(form.stock),
      en_venta: form.en_venta,
      categoria_id: Number(form.categoria_id),
    };

    try {
      await onGuardar(datos);
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  return (
    <div className="tarjeta" style={{ marginBottom: 24 }}>
      <h2>{juego ? `Editar "${juego.titulo}"` : "Agregar juego"}</h2>

      <form className="formulario" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="titulo">Título</label>
          <input
            id="titulo"
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
          <label htmlFor="jugadores">Cantidad de jugadores (ej: 2-4)</label>
          <input
            id="jugadores"
            value={form.cantidad_jugadores}
            onChange={(e) => cambiar("cantidad_jugadores", e.target.value)}
            required
          />
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
            />
            Está en venta
          </label>
        </div>

        {error && <span className="error">{error}</span>}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="boton" type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
          <button className="boton" type="button" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormularioJuego;