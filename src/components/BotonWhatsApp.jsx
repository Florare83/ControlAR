// Número de WhatsApp de la tienda (formato internacional, sin "+" ni espacios).
// Es el mismo que usa el Checkout: se configura en VITE_WHATSAPP_TIENDA.
const NUMERO = import.meta.env.VITE_WHATSAPP_TIENDA;

// Para mostrarlo legible: 543874491907 -> +54 387 4491907
export const WHATSAPP_VISIBLE = NUMERO
  ? NUMERO.replace(/^(\d{2})(\d{3})(\d+)$/, "+$1 $2 $3")
  : "";

export function enlaceWhatsApp(
  texto = "Hola! Quería consultar por El Rincón de Hermes."
) {
  if (!NUMERO) return null;
  return `https://wa.me/${NUMERO}?text=${encodeURIComponent(texto)}`;
}

function BotonWhatsApp() {
  const enlace = enlaceWhatsApp();
  if (!enlace) return null; // sin número configurado, no se muestra

  return (
    <a
      className="boton-whatsapp"
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp (se abre en otra pestaña)"
      title="Escribinos por WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M16.04 3C9.4 3 4 8.4 4 15.03c0 2.12.55 4.18 1.6 6L4 29l8.18-1.57a12.03 12.03 0 0 0 3.86.64C22.67 28.07 28 22.67 28 16.04 28 9.4 22.68 3 16.04 3Zm0 22.03c-1.2 0-2.37-.2-3.48-.6l-.5-.17-4.85.93.96-4.7-.2-.5a9.96 9.96 0 0 1-1.55-5.3C6.42 9.9 10.9 5.4 16.04 5.4S25.6 9.9 25.6 15.4c0 5.55-4.5 9.63-9.56 9.63Zm5.5-7.2c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.18-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.65-.93-2.25-.25-.58-.5-.5-.68-.5h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.1 3.2 5.1 4.5.72.3 1.28.5 1.7.63.72.23 1.37.2 1.88.12.58-.08 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z"
        />
      </svg>
    </a>
  );
}

export default BotonWhatsApp;
