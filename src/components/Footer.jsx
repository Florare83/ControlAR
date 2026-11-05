import { Link } from "react-router-dom";
import { enlaceWhatsApp, WHATSAPP_VISIBLE } from "./BotonWhatsApp.jsx";

function Footer() {
  const anio = new Date().getFullYear();
  const wa = enlaceWhatsApp();

  return (
    <footer className="footer">
      <div className="footer-contenido">
        <div className="footer-bloque">
          <p className="footer-marca">El Rincón de Hermes</p>
          <p>Club de juegos de mesa · Salta, Argentina</p>
        </div>

        <div className="footer-bloque">
          <p className="footer-titulo">Contacto</p>
          <ul>
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  WhatsApp: {WHATSAPP_VISIBLE}
                </a>
              </li>
            )}
            <li>
              <a
                href="https://www.instagram.com/elrincondehermes"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram: @elrincondehermes
              </a>
            </li>
            <li>
              <Link to="/contacto">Escribinos desde el formulario</Link>
            </li>
          </ul>
        </div>
      </div>

      <p className="footer-copy">
        © {anio} El Rincón de Hermes. Todos los derechos reservados.
      </p>
    </footer>
  );
}

export default Footer;
