import { useState } from "react";
import { guardarMiDni } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

function EditarDni() {
  const { usuario, recargarPerfil } = useAuth();
  const toast = useToast();

  const [dni, setDni] = useState(usuario?.dni ?? "");
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();

    const nuevo = dni.replace(/\D/g, "");

    if (nuevo.length < 6 || nuevo.length > 9) {
      toast.error("El DNI debe tener entre 6 y 9 números.");
      return;
    }

    if (
      usuario?.dni_verificado &&
      nuevo !== usuario.dni &&
      !window.confirm(
        "Tu DNI ya está verificado. Si lo cambiás, un administrador tendrá " +
          "que volver a verificarlo y mientras tanto no vas a ver tus " +
          "préstamos. ¿Querés continuar?"
      )
    ) {
      return;
    }

    setGuardando(true);

    try {
      await guardarMiDni(nuevo);
      await recargarPerfil();
      setDni(nuevo);
      toast.exito("DNI guardado.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <h1>🪪 Editar DNI</h1>

      {usuario?.dni_verificado ? (
        <p className="subtitulo">
          ✓ Tu DNI está verificado. Ya podés ver tus préstamos.
        </p>
      ) : usuario?.dni ? (
        <p className="subtitulo">
          Pendiente de verificación: mostrale tu DNI a un administrador en el
          próximo evento. Cuando lo verifique, vas a ver tus préstamos en la
          sección "Mis préstamos".
        </p>
      ) : (
        <p className="subtitulo">
          Cargá tu DNI para poder ver tus préstamos. Un administrador lo
          verifica con tu documento en el próximo evento.
        </p>
      )}

      <form onSubmit={guardar} className="formulario">
        <div className="campo">
          <label htmlFor="dni">DNI</label>
          <input
            id="dni"
            inputMode="numeric"
            autoComplete="off"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            maxLength={12}
            required
          />
        </div>

        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar DNI"}
        </button>
      </form>
    </section>
  );
}

export default EditarDni;
