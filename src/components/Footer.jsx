const INSTAGRAM = "https://www.instagram.com/elrincondehermes";

function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="footer">
      <p className="footer-copy">
        © {anio} El Rincón de Hermes. Todos los derechos reservados.
        <span className="footer-lugar"> · Salta, Argentina</span>
      </p>

      <div className="footer-redes">
        <a
          href={INSTAGRAM}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram @elrincondehermes (se abre en otra pestaña)"
          title="Instagram"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
          </svg>
        </a>
      </div>
    </footer>
  );
}

export default Footer;