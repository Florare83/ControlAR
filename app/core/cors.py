# Orígenes que pueden llamar a la API desde el navegador (CORS).


def origenes_permitidos(cors_origins: str = "", frontend_url: str = "") -> list[str]:
    """Desarrollo local + CORS_ORIGINS (separados por coma) + FRONTEND_URL.

    FRONTEND_URL ya se necesita para volver desde Mercado Pago, así que se permite también
    como origen: al cambiar de dominio alcanza con actualizar esa variable. Sin barra final
    y sin duplicados, conservando el orden."""
    origenes = ["http://localhost:5173", "http://127.0.0.1:5173"]
    origenes += [o.strip() for o in cors_origins.split(",")]
    origenes.append(frontend_url.strip())

    limpios = [o.rstrip("/") for o in origenes if o]
    return list(dict.fromkeys(limpios))
