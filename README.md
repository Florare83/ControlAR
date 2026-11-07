# ControlAR — El Rincón de Hermes

Sitio web y sistema de gestión de **El Rincón de Hermes**, un club de juegos de mesa modernos de Salta. Combina tres cosas en una sola aplicación:

1. **Tienda**: catálogo de juegos en venta, carrito y pago con Mercado Pago o efectivo/transferencia.
2. **Ludoteca**: juegos que el club presta **solo durante los eventos presenciales** (no salen del lugar), con reservas anticipadas por parte de los clientes.
3. **Administración**: panel para registrar préstamos y entregas, gestionar eventos, clientes, ventas, usuarios, mensajes y novedades, y ver reportes con gráficos y una tabla dinámica.

- Sitio en producción (Static Site): https://controlar-de64.onrender.com
- API en producción (Swagger): https://controlarwebsservice-3u4z.onrender.com/docs
- Diseño en Figma: https://www.figma.com/design/hQ57pUiLWMExiycWbQKpGj/ControlAR?node-id=1-2723&t=uNablvEeJrcQvXxc-1

## Integrantes

| Nombre            | Usuario GitHub          |
|-------------------|-------------------------|
| Albaro Rodo       | @albarorodo1234-oss     |
| Silvia Duran      | @1silviaduran           |
| Estefania Mercado | @Estefania-Mercado-tec  |
| Lidia Areco       | @Florare83              |

![Colaboradores](./docs/capturas/colaboradores.jpeg)

---

## Índice

1. [Funcionalidades](#1-funcionalidades)
2. [Tecnologías y arquitectura](#2-tecnologías-y-arquitectura)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [Puesta en marcha local](#4-puesta-en-marcha-local)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Scripts de administración](#6-scripts-de-administración)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Reglas de negocio](#8-reglas-de-negocio)
9. [Roles y permisos](#9-roles-y-permisos)
10. [Referencia de la API](#10-referencia-de-la-api)
11. [Frontend](#11-frontend)
12. [Pagos y correo](#12-pagos-y-correo)
13. [Despliegue en Render](#13-despliegue-en-render)
14. [Seguridad](#14-seguridad)
15. [Puntos a revisar](#15-puntos-a-revisar)
16. [Evidencias de la primera entrega](#16-evidencias-de-la-primera-entrega)

---

## 1. Funcionalidades

### Visitantes (sin sesión)
- Ver la portada (**Nosotros**: presentación, preguntas frecuentes, los 2 juegos más populares y las **novedades**: los 3 últimos juegos cargados, que se actualizan solos) y la agenda del **Club** (eventos próximos y anteriores, con enlace a Google Maps).
- Explorar el **catálogo de juegos** con buscador, filtros (categoría, editorial, edad, precio, etc.), orden y paginación.
- Enviar un mensaje desde el formulario de **Contacto** (validado en frontend y backend).
- Registrarse e iniciar sesión, y recuperar la contraseña con un enlace por correo («¿Olvidaste tu contraseña?»).

### Clientes (con sesión)
- Todo lo anterior, más:
- **Favoritos** («me gusta»): determinan qué juegos son los más populares.
- **Carrito y compra**: pagar con Mercado Pago, o registrar un pedido en efectivo/transferencia y coordinarlo por WhatsApp. Historial en **Mis compras**.
- **Cargar su DNI** en *Mi cuenta*: un administrador lo **valida en persona** cuando lo presenta en un evento del club.
- **Reservar un juego** de la ludoteca para el próximo evento (una reserva por persona y evento; **requiere el DNI validado**) y cancelarla. Ver el estado en **Mis reservas**. Si todavía no puede reservar, la pantalla le explica cómo validar el DNI.
- **Correos automáticos**: confirmación de la reserva, del pedido y de la compra, y aviso si una reserva o un pedido se cancela o vence.
- **Mis préstamos**: historial de los juegos que retiró en eventos.
- **Mis mensajes**: conversaciones con el equipo dentro de la app, con aviso de respuestas nuevas.
- **Novedades por correo**: suscribirse (en el registro o en *Mi cuenta → Novedades*) para que le avisemos de eventos y juegos nuevos, y darse de baja cuando quiera.
- Cambiar la contraseña y eliminar (desactivar) su cuenta.

### Administradores
- **Préstamos**: registrar, corregir los datos de la persona, cambiar el juego, devolver y deshacer una devolución (hasta 48 h). Exportar a CSV.
- **Reservas**: ver las del próximo evento y **entregar** el juego (crea el préstamo en el mismo paso).
- **Historial**: todos los préstamos con búsqueda, filtros, orden y exportación CSV; historial por persona.
- **Clientes**: registrar a una persona **solo con su DNI**, sin correo ni cuenta (no puede iniciar sesión), y ver el historial de préstamos de cada una. Quien se lleva un juego queda registrado solo.
- **Reportes**: cuatro pestañas (préstamos, ventas, reservas y **tabla dinámica**) con gráficos, períodos rápidos y comparación contra el período anterior. Ver [Reportes](#reportes).
- **Novedades**: avisar por correo a los suscriptores de eventos y juegos nuevos, y enviar el resumen de novedades.
- **Eventos**: crear, editar, duplicar y eliminar, con la opción de avisar por correo a los suscriptores.
- **Ventas**: resumen de ingresos, listado de pedidos, confirmar o cancelar pagos en efectivo/transferencia.
- **Juegos**: alta, edición y baja de juegos (venta, stock, precio, si se presta, observaciones internas).
- **Mensajes**: bandeja de contacto; responder por correo (SMTP/Brevo) o dentro de la app.
- **Usuarios**: buscar, activar/desactivar, dar o quitar el rol de administrador y **verificar el DNI** de una cuenta.

---

## 2. Tecnologías y arquitectura

| Capa       | Tecnología |
|------------|------------|
| Backend    | Python, **FastAPI**, **SQLAlchemy 2**, Pydantic 2, Uvicorn |
| Base de datos | **PostgreSQL** (Render). Los índices parciales también tienen variante SQLite |
| Autenticación | **JWT** (HS256, PyJWT) y hash de contraseñas con **argon2** (pwdlib) |
| Pagos      | **Mercado Pago** (Checkout Pro) vía `httpx` |
| Correo     | API HTTPS de **Brevo** o SMTP directo (`smtplib`), en segundo plano (`BackgroundTasks`) |
| Frontend   | **React 18**, **React Router 6**, **Vite 5** (JavaScript, sin librería de UI) |
| Pruebas    | **pytest** con SQLite temporal (nunca toca la base real) |
| Hosting    | Render: Web Service (API), Static Site (frontend) y PostgreSQL |

```
Navegador (React + Vite)  ──HTTP/JSON──►  FastAPI (/auth, /juegos, /prestamos, ...)  ──SQLAlchemy──►  PostgreSQL
        │                                          │
        └── redirige a Mercado Pago ◄──────────────┴── webhook / verificación de pagos
                                                   └── Brevo / SMTP (contacto, reservas, compras, novedades y recuperación)
```

El backend sigue una organización por módulos: cada recurso tiene su *router*; los módulos más grandes (`auth`, `juegos`) separan además `schemas` (validación Pydantic) y `repository` (consultas). Las reglas de tiempo y las validaciones compartidas viven en `app/core`. El texto de **todos los correos** está junto en `app/core/avisos.py`: cada endpoint arma el correo con la sesión de la base abierta y lo envía en segundo plano, así que un fallo de correo nunca deshace una reserva, un pedido o un préstamo.

En el frontend, cada pantalla se descarga recién al entrar (`React.lazy`), así que el sitio abre más rápido. Los gráficos de **Reportes** se dibujan en SVG propio, sin librerías de gráficos.

Al iniciar, el backend ejecuta `asegurar_esquema()` (ver [Esquema de base de datos automático](#esquema-de-base-de-datos-automático)).

---

## 3. Estructura del repositorio

```
ControlAR/
├── app/                              # Backend (FastAPI)
│   ├── main.py                       # App, CORS, arranque (lifespan) y registro de routers
│   ├── api/v1/
│   │   ├── auth/                     # Registro, login, perfil, cuenta y gestión de usuarios
│   │   │   ├── router.py  schemas.py  repository.py  dependencies.py
│   │   ├── juegos/                   # CRUD de juegos, búsqueda y populares
│   │   │   ├── router.py  schemas.py  repository.py
│   │   ├── categorias.py             # Listado de categorías
│   │   ├── favoritos.py              # Favoritos («me gusta»)
│   │   ├── prestamos.py              # Préstamos (admin): alta, devolución, historial
│   │   ├── historial_prestamos.py    # «Mis préstamos» del cliente
│   │   ├── reservas.py               # Reservas para eventos (solo con DNI verificado) y entrega
│   │   ├── clientes.py               # Clientes sin cuenta, registrados por DNI (admin)
│   │   ├── suscripcion.py            # Baja de novedades por enlace y resumen de novedades
│   │   ├── eventos.py                # Eventos del club
│   │   ├── pedidos.py                # Carrito → pedido → pago; ventas; webhook
│   │   ├── contacto.py               # Formulario de contacto y conversaciones
│   │   └── reportes.py               # Reportes: préstamos, ventas, reservas y tabla dinámica
│   ├── core/
│   │   ├── db.py                     # Motor, sesión y Base de SQLAlchemy
│   │   ├── security.py               # Hash de contraseñas y JWT
│   │   ├── validaciones.py           # Validaciones del formulario de contacto y escape de búsquedas LIKE
│   │   ├── limitador.py              # Límites de intentos (login y recuperación), en memoria
│   │   ├── avisos.py                 # Todos los correos al cliente y su envío en segundo plano
│   │   ├── cron.py                   # Clave (CRON_CLAVE) de las tareas que dispara un cron externo
│   │   ├── cors.py                   # Orígenes permitidos (CORS)
│   │   ├── clientes.py               # Fichas de clientes: alta automática y carga desde préstamos
│   │   ├── recuperacion.py           # Enlace firmado de «olvidé mi contraseña»
│   │   ├── suscripciones.py          # Token de baja de novedades
│   │   ├── resumen.py                # Armado del resumen de novedades
│   │   ├── reservas_reglas.py        # Zona horaria, cierre y espera de reservas
│   │   ├── mercadopago.py            # Cliente de Mercado Pago
│   │   ├── correo.py                 # Envío de correos (Brevo / SMTP)
│   │   ├── asegurar_esquema.py       # Reparación/migración automática al iniciar
│   │   ├── cargar_eventos.py         # Eventos iniciales (se cargan una sola vez)
│   │   └── (scripts)                 # crear_tablas, cargar_categorias, crear_admin, ...
│   └── models/                       # Modelos SQLAlchemy (una tabla por archivo)
├── src/                              # Frontend (React + Vite)
│   ├── main.jsx  App.jsx  index.css
│   ├── api/api.js                    # Cliente HTTP y manejo del token
│   ├── context/                      # AuthContext, CarritoContext, ToastContext
│   ├── components/                   # Navbar, TarjetaJuego, CarritoSidebar, Modal, Graficos, ...
│   ├── pages/                        # Una pantalla por ruta
│   │   └── reportes/                 # Pestañas de Reportes: préstamos, ventas, reservas, tabla dinámica
│   ├── data/eventos.js               # Funciones para mostrar eventos
│   ├── hooks/useEventos.js           # Carga de eventos desde la API
│   ├── utils/                        # prestamos.js, validacionesContacto.js
│   └── img/                          # Imágenes y logos
├── tests/                            # Pruebas automáticas (pytest)
├── docs/capturas/                    # Capturas usadas en este README
├── requirements.txt                  # Dependencias del backend
├── requirements-dev.txt  pytest.ini  # Dependencias y configuración de las pruebas
├── .env.example                      # Plantilla de variables de entorno del backend
├── package.json  vite.config.js  index.html
├── .env.development                 # VITE_API_URL para desarrollo
└── README.md
```

> El backend y el frontend conviven en la misma carpeta raíz: `app/` es la API y `src/` es la interfaz.

---

## 4. Puesta en marcha local

### Requisitos
- Python 3.11 o superior (el código usa la sintaxis `X | None`)
- Node.js 18 o superior y npm
- Una base de datos PostgreSQL (puede ser la de Render; ver `DATABASE_URL`)

### Backend

1. Clonar el repositorio: `git clone https://github.com/Florare83/ControlAR.git`
2. Crear y activar un entorno virtual:
   - `python -m venv venv`
   - Windows: `venv\Scripts\activate` — Linux/Mac: `source venv/bin/activate`
3. Instalar dependencias: `pip install -r requirements.txt`
4. Crear un archivo `.env` en la raíz con, como mínimo, `DATABASE_URL` y `SECRET_KEY` (ver [Variables de entorno](#5-variables-de-entorno)). Para generar la clave:
   `python -c "import secrets; print(secrets.token_hex(32))"`
5. Crear las tablas y cargar las categorías:
   - `python -m app.core.crear_tablas`
   - `python -m app.core.cargar_categorias`
6. Crear el primer administrador (PowerShell):
   `$env:ADMIN_EMAIL="correo@ejemplo.com"; $env:ADMIN_PASSWORD="una-clave-larga"; python -m app.core.crear_admin`
7. Levantar el servidor: `fastapi dev app/main.py` (o `uvicorn app.main:app --reload`)
8. Documentación interactiva (Swagger): http://localhost:8000/docs

### Frontend

```bash
npm install        # solo la primera vez
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm run build      # genera la carpeta dist/
npm run preview    # sirve el build localmente
```

### Pruebas automáticas

```bash
pip install -r requirements-dev.txt
pytest
```

Son casi 200 pruebas sobre un SQLite temporal (no usan la base real ni mandan correos: el envío se reemplaza por una lista). Cubren permisos, préstamos, reservas y su regla del DNI, compras, clientes, correos, novedades, recuperación de contraseña y reportes.

La URL de la API sale de `VITE_API_URL`. En desarrollo ya está definida en `.env.development` (`http://localhost:8000`). Vite la incorpora al compilar: si se cambia en Render, hay que **volver a desplegar** el Static Site.

---

## 5. Variables de entorno

### Backend (`.env`, no se sube a git)

| Variable | Obligatoria | Por defecto | Descripción |
|----------|:-----------:|-------------|-------------|
| `DATABASE_URL` | Sí | — | URL de PostgreSQL. Local: *External Database URL* de Render; dentro de Render: *Internal Database URL*. Debe empezar con `postgresql://` |
| `SECRET_KEY` | Sí | — | Clave para firmar los JWT. Sin ella la app no arranca |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | Duración del token |
| `CORS_ORIGINS` | No | — | Orígenes extra permitidos, separados por coma y sin barra final. Ya se permiten `localhost:5173`, `127.0.0.1:5173` y la URL de `FRONTEND_URL`, así que normalmente no hace falta definirla |
| `FRONTEND_URL` | No | `http://localhost:5173` | A dónde vuelve el cliente desde Mercado Pago. Con `https://` se activa `auto_return`. También se permite como origen CORS |
| `BACKEND_URL` | No | — | URL pública de la API. Solo con `https://` se informa el *webhook* a Mercado Pago |
| `MP_ACCESS_TOKEN` | Para pagos | — | Token de Mercado Pago. Con credenciales de **prueba** todo funciona en *sandbox*. Si falta, el checkout responde 503 |
| `BREVO_API_KEY` | Opción A | — | Clave de Brevo (`xkeysib-...`). Si está definida, los correos van por HTTPS y se ignora el SMTP |
| `BREVO_API_URL` | No | `https://api.brevo.com/v3/smtp/email` | Endpoint de Brevo |
| `SMTP_HOST` | Opción B | — | Servidor SMTP (p. ej. `smtp.gmail.com`) |
| `SMTP_PORT` | No | `587` | Puerto SMTP |
| `SMTP_SECURITY` | No | `starttls` | `starttls` (587), `ssl` (465) o `none` |
| `SMTP_USER` / `SMTP_PASSWORD` | Opción B | — | Credenciales (en Gmail, una *contraseña de aplicación*) |
| `SMTP_FROM` | Sí para correo | `SMTP_USER` | Remitente. Con Brevo debe ser un remitente **verificado** |
| `SMTP_FROM_NAME` | No | `ControlAR` | Nombre del remitente |
| `CRON_CLAVE` | No | — | Clave para las tareas que dispara un cron externo, con el encabezado `X-Cron-Clave`: el resumen mensual de novedades (`POST /suscripcion/resumen/automatico`) y el vencimiento de reservas a su hora (`POST /reservas/vencer/automatico`). Sin ella esas rutas responden `404` |

El archivo `.env.example` sirve como plantilla de estas variables.

### Frontend

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend, sin barra al final. Por defecto `http://localhost:8000` |

---

## 6. Scripts de administración

Se ejecutan desde la raíz con `python -m app.core.<script>` y leen sus parámetros de variables de entorno.

| Script | Para qué sirve | Variables / argumentos |
|--------|----------------|------------------------|
| `crear_tablas` | Crea las tablas que falten | — |
| `cargar_categorias` | Carga *Infantil*, *Familiar* y *Experto* (no duplica) | — |
| `crear_admin` | Crea un administrador, o **promueve** a uno ya registrado (sin cambiar su contraseña; debe volver a iniciar sesión) | `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mín. 8), `ADMIN_NOMBRE` (opcional) |
| `cambiar_contrasena` | Cambia la contraseña de un usuario | `EMAIL`, `NUEVA_PASSWORD` (mín. 8) |
| `eliminar_usuario` | Elimina un usuario o solo le quita el rol de admin. Nunca deja el sitio sin administradores | `EMAIL`, `SOLO_QUITAR_ADMIN=1` (opcional) |
| `marcar_se_presta` | Marca qué juegos forman parte de la ludoteca | `"Catan" "Carcassonne"` · `--todos` · `--ninguno "Catan"` · `--listar` |
| `cargar_eventos` | Carga los 4 eventos iniciales **solo si la tabla está vacía** (también se ejecuta solo al crear la tabla) | — |

### Esquema de base de datos automático

`create_all()` de SQLAlchemy no modifica tablas que ya existen, así que una base creada con una versión anterior de los modelos podía fallar con errores 500 (columnas inexistentes). Por eso, en cada arranque `app/core/asegurar_esquema.py`:

1. Crea las tablas que falten (y, la primera vez, carga los eventos iniciales).
2. Agrega a las tablas existentes las columnas que el modelo espera y no tienen, completando los registros viejos con un valor razonable.
3. En PostgreSQL, quita el `NOT NULL` de columnas viejas que el modelo ya no usa.
4. Crea los índices que falten (si hay datos que los incumplen, lo avisa en el log).
5. Convierte datos del diseño anterior de `prestamos` (`titulo_juego` / `devuelto`).
6. Registra como **clientes** a las personas que ya tienen préstamos y todavía no tienen ficha (con los datos de su préstamo más reciente). Se puede repetir sin duplicar.

Nunca borra datos y **nunca impide que el servidor arranque**: cualquier error queda en el log.

---

## 7. Modelo de datos

```mermaid
erDiagram
    CATEGORIA ||--o{ JUEGO : clasifica
    USUARIO ||--o{ FAVORITO : marca
    JUEGO ||--o{ FAVORITO : recibe
    USUARIO ||--o{ PEDIDO : compra
    PEDIDO ||--|{ PEDIDO_ITEM : contiene
    JUEGO ||--o{ PEDIDO_ITEM : "se vende en"
    JUEGO ||--o{ PRESTAMO : "se presta en"
    USUARIO ||--o{ RESERVA : realiza
    CLIENTE ||..o{ PRESTAMO : "mismo DNI"
    EVENTO ||--o{ RESERVA : recibe
    JUEGO ||--o{ RESERVA : reservado
    RESERVA ||--o| PRESTAMO : genera
    USUARIO ||--o{ MENSAJE_CONTACTO : escribe
    MENSAJE_CONTACTO ||--o{ RESPUESTA_MENSAJE : tiene
```

> `CLIENTE` no tiene clave foránea: se vincula con los préstamos por **DNI**. `RESUMEN_NOVEDADES` (tabla `resumenes_novedades`) no se relaciona con otras: solo guarda cada envío del resumen.

| Tabla | Descripción y campos destacados |
|-------|---------------------------------|
| `usuarios` | `nombre`, `email` (único), `contrasena_hash`, `es_admin`, `activo`, `dni`, `dni_verificado`, `suscrito_novedades`. La propiedad `rol` devuelve `admin` o `cliente` |
| `clientes` | Personas registradas por un administrador **sin cuenta**: `dni` (único), `nombre`, `sexo` y `telefono` (opcionales), `creado_en`. No tienen correo ni contraseña, así que no pueden iniciar sesión |
| `resumenes_novedades` | Un envío del resumen de novedades: `enviado_en`, `ultimo_juego_id`, `disponibles` (JSON) y `destinatarios`. El último sirve de punto de partida del siguiente |
| `categorias` | `nombre` (único) |
| `juegos` | `titulo`, `editorial`, `cantidad_jugadores` (p. ej. `"2-4"`), `duracion_minutos`, `edad_minima`, `precio`, `stock`, `en_venta`, **`se_presta`** (pertenece a la ludoteca), `imagen_url` (HTTPS), `observaciones` (nota interna, solo visible para admin), `creado_en` (fecha de alta; vacía en los juegos cargados antes de existir la columna), `categoria_id` |
| `favoritos` | `usuario_id`, `juego_id`; único por par |
| `prestamos` | `dni`, `nombre`, `sexo`, `telefono`, `estado` (`activo`/`cerrado`), `fecha_inicio`, `fecha_cierre`, `juego_id`, `titulo_juego` (copia del título al prestar). La columna `email` quedó solo por datos viejos: ya no se pide ni se muestra |
| `eventos` | `tipo`, `titulo`, `descripcion`, `fecha` (exacta) o `fecha_texto`/`mes_corto`, `hora_inicio`, `hora_texto`, `lugar`, `direccion`, `inscripcion`, `aporte`, `imagen_url`, `permite_reservas` |
| `reservas` | `usuario_id`, `evento_id`, `juego_id`, `estado` (`activa`/`cancelada`/`entregada`/`vencida`), `creada_en`, `cerrada_en`, `prestamo_id` |
| `pedidos` | `usuario_id`, `total`, `estado` (`pendiente`/`aprobado`/`rechazado`/`cancelado`), `forma_pago` (`mercadopago`/`efectivo_transferencia`), `preferencia_id`, `pago_id`, `creado_en`, `pagado_en` |
| `pedido_items` | `pedido_id`, `juego_id` (nulo si el juego se borra), `titulo` y `precio_unitario` (copias), `cantidad` |
| `mensajes_contacto` | Primer mensaje de una conversación: `nombre`, `apellido`, `telefono`, `email`, `mensaje`, `leido` (para el equipo), `leido_cliente`, `usuario_id` (nulo si es visitante), `creado_en`, `actualizado_en`, `respondido_en` |
| `respuestas_mensaje` | Mensajes siguientes: `mensaje_id`, `autor` (`admin`/`cliente`), `texto`, `creado_en` |

### Garantías a nivel de base de datos

Son índices únicos **parciales**: protegen las reglas incluso si dos personas operan al mismo tiempo.

| Índice | Garantiza |
|--------|-----------|
| `uq_prestamo_activo_dni` | Una persona (DNI) tiene como máximo **un préstamo activo** |
| `uq_prestamo_activo_juego` | Un juego está en como máximo **un préstamo activo** |
| `uq_reserva_persona_evento` | Una persona tiene como máximo **una reserva por evento** (activa o entregada) |
| `uq_reserva_juego_evento` | Un juego está en como máximo **una reserva por evento** (activa o entregada) |
| `uq_favorito_usuario_juego` | No se duplican favoritos |
| `uq_usuario_dni_verificado` | Un mismo DNI solo puede estar **verificado** en una cuenta |
| `clientes.dni` (único) | Una sola ficha de cliente por DNI |

---

## 8. Reglas de negocio

### Préstamos (ludoteca)
- Los juegos se prestan **solo durante el evento y en el lugar**. Un administrador registra el préstamo con DNI, nombre, sexo (F/M) y teléfono. Ya no se pide el email.
- Solo se pueden prestar juegos marcados como `se_presta` y que no estén ya prestados. «Prestado ahora» (`en_prestamo`) se calcula a partir de los préstamos activos.
- Al cargar un DNI, el formulario completa los datos de préstamos anteriores de esa persona o de su ficha de cliente.
- Quien se lleva un juego (por préstamo directo o al entregar una reserva) **queda registrado como cliente** si no lo estaba. Los datos de una ficha existente no se pisan.
- La pantalla de gestión carga de a 20 préstamos («Ver más») y filtra, busca y ordena en el servidor (usa `GET /prestamos/historial`); el CSV descarga todo lo que coincide con los filtros. En pantalla el sexo se muestra como F o M.
- **Cambiar juego**: se puede cambiar el juego de un préstamo activo por otro disponible.
- **Devolver** cierra el préstamo. Si fue un error, se puede **deshacer dentro de las 48 horas**, siempre que el juego siga libre y la persona no tenga otro préstamo activo.
- Un préstamo **«sin devolver»** es uno activo retirado antes de hoy (hora de Argentina): como los juegos no salen del evento, casi seguro faltó registrar la devolución.
- No se puede eliminar un juego que tenga préstamos o reservas registrados (responde 409).
- El cliente ve «Mis préstamos» cruzando por **el DNI de su cuenta**, y solo si un administrador **verificó** ese DNI mirando el documento físico. Un mismo DNI solo puede estar verificado en una cuenta.

### Reservas
- **Solo reservan las cuentas con el DNI validado.** La persona carga su DNI en *Mi cuenta* y, cuando lo presenta en un evento, un administrador lo verifica. Si no puede reservar, la API responde `403` con un mensaje que explica el paso que le falta (cargar el DNI o presentarlo). Las reservas ya hechas antes de la regla no se tocan.
- Se reserva para **el próximo evento que permita reservas** (con fecha exacta y hora de inicio).
- Las reservas se aceptan **hasta las 20:00 del día anterior** al evento.
- **Una reserva por persona y por evento**; un juego solo puede estar en una reserva por evento. Se puede cancelar mientras esté activa.
- La reserva se guarda **hasta 30 minutos después de la hora de inicio**; pasado ese tiempo pasa a `vencida` y el juego queda libre.
- El vencimiento se aplica al consultar (cada endpoint de reservas llama a `vencer_reservas`) y, si se configura el cron, también **a su hora**: `POST /reservas/vencer/automatico` cada 10 o 15 minutos (ver [Despliegue](#13-despliegue-en-render)).
- Para **entregar**, el administrador pide DNI, sexo y teléfono (la cuenta no los tiene). En una sola operación se crea el préstamo y la reserva pasa a `entregada`.
- Para permitir reservas, un evento necesita fecha exacta y hora de inicio.
- No se puede eliminar un evento que tenga reservas.
- Todas las reglas de hora usan UTC-3 fijo (Argentina no tiene horario de verano).
- El correo de «reserva vencida» sale cuando se vence la reserva: con el cron, a la hora; sin él, cuando alguien usa la web después del límite.

### Compras
- El servidor **recalcula** precios y stock desde la base: nunca confía en los valores del cliente. Un juego debe estar `en_venta`, tener precio mayor a 0 y stock suficiente.
- **Mercado Pago**: se crea el pedido (`pendiente`) y una preferencia de pago; el cliente paga en Mercado Pago y vuelve a `/compra/resultado`. Esa pantalla **no confía en la URL**: el servidor vuelve a consultar el pago a Mercado Pago, verifica que corresponda al pedido y que el monto coincida, y recién ahí aprueba. El stock se descuenta **una sola vez** aunque lleguen a la vez el webhook y la vuelta del cliente.
- **Efectivo / transferencia**: el pedido queda `pendiente` sin tocar el stock y se abre WhatsApp con el detalle. El administrador lo confirma (descuenta stock, pasa a `aprobado`) o lo cancela desde **Ventas**.
- Los ítems guardan copia del título y del precio: el pedido no cambia si después se edita o borra el juego.

### Juegos populares y novedades
- Los **populares** son los juegos **en venta** con más favoritos, con desempate por título. La portada muestra 2 (`/juegos/populares?limite=2`).
- Las **novedades** de la portada son los últimos juegos cargados (`/juegos/novedades?limite=3`). Se ordenan por fecha de alta (`creado_en`); los juegos cargados antes de existir esa fecha van después y se ordenan entre ellos por `id`. No filtra por «en venta»: aparece cualquier juego cargado.

### Mensajes de contacto
- Cualquiera puede escribir desde **Contacto** (con al menos un email o un teléfono). Si tiene sesión iniciada, el mensaje queda vinculado a su cuenta.
- Mensajes de **visitantes**: el administrador responde **por correo** (se agrega el mensaje original citado).
- Mensajes de **clientes con cuenta activa**: se responde **dentro de la app** y el cliente lo ve en «Mis mensajes» (con aviso de respuesta nueva).
- Límites anti-spam (en memoria): 5 mensajes por hora y por IP en el formulario público, 5 conversaciones nuevas por hora y 30 respuestas por hora por usuario.
- Las reglas de validación están duplicadas a propósito en `app/core/validaciones.py` y `src/utils/validacionesContacto.js`: **si se cambia una, hay que cambiar la otra**.

### Novedades por correo
- Es **opt-in**: nadie recibe nada si no se suscribió (casilla del registro o *Mi cuenta → Novedades*). Se guarda en `usuarios.suscrito_novedades`.
- Al crear un evento o un juego, el admin decide si avisar con una casilla del formulario (la API lo recibe como `?avisar=true`). En eventos arranca tildada; en juegos, destildada, para no mandar un mail por cada juego al cargar el catálogo. No se avisa de eventos con fecha pasada.
- Además del aviso de **evento nuevo** (que ya explica cómo reservar juegos, hasta qué hora y qué se necesita), el admin puede avisar cuando un evento **cambia** (nombre, fecha, horario o lugar; le llega también a quien tiene una reserva activa aunque no esté suscripto) o se **cancela**. Corregir solo la descripción no manda nada.
- **Resumen de novedades**: próximos eventos + juegos nuevos + los favoritos de cada persona que ya están a la venta o volvieron a tener stock. Se manda desde el panel (*Novedades → Enviar resumen ahora*). El primer envío solo lleva los próximos eventos (sirve de punto de partida); desde el segundo cuenta lo nuevo. A quien no le toca nada no se le escribe.
- Para mandarlo solo una vez por mes, definí `CRON_CLAVE` y programá en un cron externo (por ejemplo cron-job.org) un `POST {BACKEND_URL}/suscripcion/resumen/automatico` con el encabezado `X-Cron-Clave`. No repite si ya salió uno en los últimos 20 días. Sin `CRON_CLAVE` queda desactivado.
- Se arma **un correo por suscriptor** (cada uno con su enlace de baja) y se envía en segundo plano; un fallo no impide crear el evento o el juego. Con Brevo gratuito el tope es de unos 300 correos por día en total (incluye los avisos de reservas y compras).
- El enlace de baja (`/baja?token=...`) lleva un token firmado que **solo sirve para darse de baja**: usa otra clave derivada de `SECRET_KEY` y no sirve como sesión. No vence. La baja se confirma con un botón para que los antivirus que abren los enlaces no den de baja a nadie.
- «Eliminar cuenta» también cancela la suscripción.

### Clientes sin cuenta
- Un administrador registra a una persona con su **DNI** (6 a 9 números, sin puntos) y su nombre; sexo y teléfono son opcionales. **No lleva correo ni contraseña**, por eso no puede iniciar sesión.
- El DNI **no se puede cambiar** (es lo que une a la persona con sus préstamos): si se cargó mal, se elimina la ficha y se registra de nuevo. Una ficha **con préstamos no se puede eliminar** (`409`).
- El historial de cada cliente sale de los préstamos con el mismo DNI (`/panel/historial?dni=`). Si además la persona tiene una cuenta con el DNI verificado, el listado lo indica («Con cuenta»).

### Cuentas
- «Eliminar cuenta» **desactiva** la cuenta: anonimiza nombre y email, invalida la contraseña y borra los favoritos, pero conserva préstamos, pedidos y mensajes.
- Un administrador no puede desactivarse ni quitarse el rol a sí mismo.

### Correos automáticos
Todos son texto plano, se envían en segundo plano y un fallo se anota en el log sin deshacer la operación.

| Cuándo | Qué recibe la persona |
|--------|-----------------------|
| Hace una reserva | Confirmación: juego, evento, fecha, lugar, n.º de reserva y hasta qué hora se la guardamos |
| Cancela una reserva / la reserva vence | Aviso de que el juego quedó libre |
| Crea un pedido en efectivo/transferencia | «Recibimos tu pedido», pendiente de pago |
| Se acredita el pago (Mercado Pago, o el administrador lo confirma a mano) | «Compra confirmada». Sale **una sola vez** aunque lleguen a la vez la vuelta del cliente y el webhook |
| Un administrador cancela un pedido pendiente | «Pedido cancelado» (no se cobró nada ni se descontó stock) |
| Pide recuperar la contraseña | Enlace para elegir una nueva |
| Se suscribió a las novedades | Evento nuevo, evento modificado o cancelado, juego nuevo y resumen (ver [Novedades por correo](#novedades-por-correo)) |

Los pedidos de Mercado Pago no mandan correo al crearse (la persona todavía está pagando): reciben uno solo cuando el pago se aprueba.

### Reportes
- Todos los reportes son **solo para administradores** y aceptan un período (`desde` / `hasta`, inclusive, en horario argentino).
- Cada pestaña toma las fechas de su propio criterio: los **préstamos** por la fecha de retiro; las **ventas**, los pedidos pagados por el día del pago y el resto por el día de creación; las **reservas** por el día en que se hicieron.
- Si se indican las dos fechas, la API devuelve también el **período anterior de la misma duración** (`anterior`), y el frontend muestra las flechas de variación.
- El gráfico va **día por día** hasta 62 días y **mes por mes** (hasta 36) en períodos más largos; los días sin movimiento se incluyen en cero para no engañar.
- **Pendientes de devolución**, **stock bajo** y **juegos sin movimiento** son datos del día de hoy.
- **Tabla dinámica**: se elige la fuente (préstamos, ventas pagadas o reservas), qué va en filas, qué en columnas (opcional) y qué se calcula. Solo se aceptan las dimensiones y medidas que la API publica en `/reportes/tabla-dinamica/opciones` (cualquier otra devuelve `422`). Los totales de «personas distintas» y «pedidos» cuentan una vez a cada persona o pedido, por eso pueden ser menores que la suma de las celdas. Muestra hasta 200 filas y 20 columnas (avisa si hay más).

### Olvidé mi contraseña
- Desde *Iniciar sesión → ¿Olvidaste tu contraseña?* (`/recuperar`) la persona escribe su correo y recibe un enlace (`/restablecer?token=...`).
- La respuesta es siempre la misma, exista o no la cuenta, para no revelar qué correos están registrados. Hay un límite de 5 pedidos por hora por conexión.
- El enlace vale **1 hora** y se puede usar **una sola vez**: lleva una huella de la contraseña vigente, así que deja de servir apenas se elige la nueva (o se cambia desde la cuenta). Usa una clave derivada de `SECRET_KEY` y no sirve como sesión.

---

## 9. Roles y permisos

| Rol | Cómo se obtiene | Acceso |
|-----|-----------------|--------|
| Visitante | Sin sesión | Catálogo, Club, Nosotros, Contacto, login y registro |
| Cliente | Registro desde `/registro` | Lo anterior + favoritos, carrito/compras, reservas (con DNI validado), mis préstamos, mis mensajes, novedades, cuenta |
| Administrador | `crear_admin` o desde **Usuarios** en el panel | Todo, incluido el panel `/panel/*` |

La seguridad real la aplica la API (401 sin sesión, 403 sin permisos). `RutaProtegida` en el frontend solo ordena la pantalla.

> Hay solo dos roles (`admin` y `cliente`). Los **clientes sin cuenta** (ver [Clientes sin cuenta](#clientes-sin-cuenta)) no son un rol: no tienen acceso al sistema.

---

## 10. Referencia de la API

Base: `http://localhost:8000` (local) o la URL del Web Service en Render. Documentación interactiva en `/docs`. El token se envía en `Authorization: Bearer <token>`.

Leyenda de acceso: **Público**, **Usuario** (cualquier sesión), **Admin**. Códigos de error comunes: `401` sin sesión o token vencido, `403` sin permisos, `422` datos inválidos.

### Autenticación (`/auth`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/auth/register` | Público | Crea un cliente (`nombre`, `email`, `contrasena` de 8 o más, `suscrito_novedades` opcional). `409` si el correo existe |
| POST | `/auth/login` | Público | Formulario `username` (el correo) y `password`. Devuelve `access_token`. `429` tras 8 contraseñas incorrectas seguidas (misma cuenta y misma conexión): espera 10 minutos |
| GET | `/auth/me` | Usuario | Perfil (`id`, `nombre`, `email`, `es_admin`, `rol`, `dni`, `dni_verificado`, `suscrito_novedades`) |
| PUT | `/auth/me/dni` | Usuario | Carga o corrige el DNI. Si cambia, hay que volver a verificarlo |
| PUT | `/auth/me/novedades` | Usuario | Suscribe o da de baja de las novedades por correo (`{"suscrito": true}`) |
| POST | `/auth/recuperar` | Público | «Olvidé mi contraseña»: manda el enlace por correo (`{"email": ...}`). Responde igual exista o no la cuenta. `429` si se piden más de 5 por hora |
| POST | `/auth/restablecer` | Público | Elige la contraseña nueva con el `token` del enlace (`token`, `contrasena` de 8 o más). `400` si el enlace venció o ya se usó |
| POST | `/auth/cambiar-contrasena` | Usuario | Requiere la actual; la nueva, de 8 o más y distinta |
| DELETE | `/auth/me` | Usuario | Desactiva la cuenta (pide la contraseña) |
| GET | `/auth/admin/usuarios` | Admin | Lista usuarios (`?buscar=` por nombre, email o DNI, también con puntos). Incluye `prestamos_cantidad` y `prestamo_nombre` (a nombre de quién están los préstamos con el DNI de la cuenta) para compararlos antes de verificar |
| PATCH | `/auth/admin/usuarios/{id}` | Admin | Cambia `es_admin`, `activo` y/o `dni_verificado` (los dos primeros no sobre uno mismo). `dni_verificado` exige que la cuenta tenga DNI y que ninguna otra lo tenga verificado |

### Juegos y categorías

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/juegos/` | Público | Lista (`?query=` busca por título). Incluye `en_prestamo` y `me_gusta`. `observaciones` solo se devuelve a admins |
| GET | `/juegos/populares` | Público | Más populares de la tienda (`?limite=`, 1 a 12, por defecto 2) |
| GET | `/juegos/novedades` | Público | Los últimos juegos cargados (`?limite=`, 1 a 12, por defecto 3) |
| GET | `/juegos/{id}` | Público | Detalle. `404` si no existe |
| POST | `/juegos/` | Admin | Crea (`201`). `400` si la categoría no existe. Con `?avisar=true` manda un correo a los suscriptores |
| PUT | `/juegos/{id}` | Admin | Actualización parcial (solo cambia los campos enviados) |
| DELETE | `/juegos/{id}` | Admin | `204`. `409` si tiene préstamos o reservas |
| GET | `/categorias/` | Público | Lista de categorías |

La imagen (`imagen_url`) debe ser una URL **HTTPS** válida.

### Favoritos (`/favoritos`) — Usuario

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/favoritos/` | Ids de los juegos favoritos |
| POST | `/favoritos/{juego_id}` | Agrega (si ya estaba, lo informa sin error) |
| DELETE | `/favoritos/{juego_id}` | Quita (`404` si no estaba) |

### Préstamos (`/prestamos`) — Admin

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/prestamos/` | Lista (`?estado=activo\|cerrado`) |
| POST | `/prestamos/` | Registra un préstamo. `409` si la persona ya tiene uno activo o el juego está prestado; `400` si el juego no existe o no se presta |
| GET | `/prestamos/buscar-persona/{dni}` | Datos de la persona en préstamos anteriores o en su ficha de cliente (`encontrado: true/false`) |
| GET | `/prestamos/historial` | Historial paginado. Filtros: `buscar`, `estado`, `atrasados`, `desde`, `hasta`; orden: `ordenar` (`fecha`/`juego`/`cliente`/`estado`) y `direccion`; paginación: `limite` (1–100) y `desplazamiento`. Devuelve `items`, `total` y `resumen` |
| GET | `/prestamos/historial/persona` | Todos los préstamos de una persona (`?dni=`, obligatorio). Si todavía no tiene préstamos pero está registrada como cliente, devuelve sus datos |
| PATCH | `/prestamos/{id}` | Corrige los datos de la persona de un préstamo (activo o cerrado). `409` si el nuevo DNI ya tiene otro préstamo activo |
| PUT | `/prestamos/{id}/juego` | Cambia el juego de un préstamo activo |
| POST | `/prestamos/{id}/devolver` | Cierra el préstamo |
| POST | `/prestamos/{id}/reabrir` | Deshace una devolución (hasta 48 h) |

### Clientes (`/clientes`) — Admin

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/clientes/` | Lista alfabética (`?buscar=` por nombre o DNI, también con puntos; `?limite=` 1–100 y `?desplazamiento=`). Devuelve `items` y `total`; cada cliente trae `prestamos_total`, `prestamos_activos` y `con_cuenta` |
| POST | `/clientes/` | Registra a una persona sin cuenta (`dni`, `nombre`; `sexo` y `telefono` opcionales). `409` si el DNI ya está registrado, `422` si es inválido |
| PUT | `/clientes/{id}` | Corrige `nombre`, `sexo` y `telefono`. El DNI no se cambia |
| DELETE | `/clientes/{id}` | `204`. `409` si tiene préstamos |

### Mi cuenta

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/mi-cuenta/prestamos` | Usuario | Préstamos del DNI verificado de la cuenta (vacío si no está verificado) |

### Suscripción (`/suscripcion`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/suscripcion/baja` | Público | Da de baja con el `token` del enlace de un correo. `400` si el enlace no es válido. Se puede repetir |
| GET | `/suscripcion/resumen` | Admin | Qué llevaría el próximo resumen, cuántos suscriptores hay y cuándo salió el último |
| POST | `/suscripcion/resumen/enviar` | Admin | Manda el resumen ahora |
| POST | `/suscripcion/resumen/automatico` | Clave | Para un cron externo (`X-Cron-Clave` = `CRON_CLAVE`). `404` si está desactivado, `401` si la clave no coincide |

### Eventos (`/eventos`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/eventos/` | Público | Lista de eventos (más recientes primero) |
| POST | `/eventos/` | Admin | Crea (`201`). Con `?avisar=true` manda un correo a los suscriptores (solo si el evento no pasó) |
| PUT | `/eventos/{id}` | Admin | Actualiza. Con `?avisar=true`, si cambió nombre, fecha, horario o lugar, avisa a suscriptores y a quien tiene reserva activa |
| POST | `/eventos/{id}/duplicar` | Admin | Copia el evento con otra `fecha` (y `hora_inicio` opcional), sin reservas |
| DELETE | `/eventos/{id}` | Admin | `204`. `409` si tiene reservas. Con `?avisar=true` avisa a los suscriptores que se canceló |

### Reservas (`/reservas`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/reservas/estado` | Público | Evento reservable, si las reservas siguen abiertas, hasta cuándo se espera y qué juegos ya están reservados |
| GET | `/reservas/mias` | Usuario | Mis reservas |
| POST | `/reservas/` | Usuario | Reserva un juego (`{ "juego_id": 1 }`). `403` si el DNI no está cargado o validado (el mensaje explica cómo hacerlo). `409` si no hay evento, ya cerraron, ya tenés una reserva o el juego está tomado |
| DELETE | `/reservas/{id}` | Usuario | Cancela una reserva propia y activa (`404` si es de otra persona) |
| POST | `/reservas/vencer/automatico` | Clave | Para un cron externo cada 10 o 15 minutos (`X-Cron-Clave` = `CRON_CLAVE`): vence las reservas cuya espera terminó y avisa por correo. Devuelve `{"vencidas": N}`. `404` si está desactivado, `401` si la clave no coincide |
| GET | `/reservas/` | Admin | Reservas de un evento (`?evento_id=`; por defecto, el próximo) |
| POST | `/reservas/{id}/entregar` | Admin | Entrega el juego: crea el préstamo y cierra la reserva (`dni`, `sexo`, `telefono`, `nombre` opcional) |

### Compras y pagos

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/pedidos/checkout` | Usuario | Valida el carrito, crea el pedido y la preferencia de Mercado Pago. Devuelve `init_point` |
| POST | `/pedidos/efectivo` | Usuario | Crea un pedido pendiente para pagar en efectivo/transferencia |
| GET | `/pedidos/mis-compras` | Usuario | Historial de compras propias |
| GET | `/pedidos/{id}` | Usuario | Un pedido propio |
| POST | `/pedidos/{id}/confirmar` | Usuario | Verifica el pago con Mercado Pago al volver (`pago_id`) |
| GET | `/pedidos/admin/ventas` | Admin | Resumen de ingresos + listado (`?estado=`, `?buscar=`; hasta 200) |
| POST | `/pedidos/{id}/marcar-pagado` | Admin | Confirma un pago en efectivo/transferencia y descuenta stock |
| POST | `/pedidos/{id}/cancelar` | Admin | Cancela un pedido en efectivo/transferencia pendiente |
| POST | `/pagos/webhook` | Público | Aviso de Mercado Pago. Siempre responde `200`; el pago se verifica contra su API |

### Contacto (`/contacto`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/contacto/` | Público | Envía un mensaje (`429` si supera el límite). Con sesión se vincula a la cuenta |
| GET | `/contacto/mis-mensajes` | Usuario | Mis conversaciones |
| GET | `/contacto/mis-mensajes/sin-leer` | Usuario | Cantidad de conversaciones con respuesta nueva |
| POST | `/contacto/mis-mensajes` | Usuario | Inicia una conversación |
| GET | `/contacto/mis-mensajes/{id}` | Usuario | Abre una conversación (la marca como leída) |
| POST | `/contacto/mis-mensajes/{id}/respuestas` | Usuario | Agrega un mensaje a mi conversación |
| GET | `/contacto/` | Admin | Bandeja (`?solo_no_leidos=`, `?limite=`, `?desplazamiento=`). Incluye `no_leidos` |
| PATCH | `/contacto/{id}` | Admin | Marca como leído o no leído |
| POST | `/contacto/{id}/responder` | Admin | Responde **por correo** (`asunto`, `cuerpo`). `400` si no dejó email |
| POST | `/contacto/{id}/respuestas` | Admin | Responde **dentro de la app** (solo cuentas activas) |
| DELETE | `/contacto/{id}` | Admin | Elimina el mensaje y su conversación |

### Reportes (`/reportes`) — Admin

Todos aceptan `desde` y `hasta` (`AAAA-MM-DD`, inclusive). `422` si «desde» es posterior a «hasta». Con las dos fechas devuelven además `anterior` (el período previo de la misma duración).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/reportes/prestamos` | Totales (`total`, `activos`, `devueltos`, `sin_devolver`, `personas`, nuevas y que vuelven, duración promedio), evolución, 10 juegos más prestados, por categoría, día de la semana y sexo, movimiento por día de evento, juegos sin movimiento y pendientes de devolución |
| GET | `/reportes/ventas` | Ingresos, pedidos pagados, unidades, ticket promedio, compradores y tasa de pago; evolución, 10 más vendidos (unidades e ingresos), ingresos por categoría, forma de pago, día de la semana, estado de pedidos y stock bajo |
| GET | `/reportes/reservas` | Reservas por estado (retiradas, vencidas, canceladas, activas) y tasa de retiro; evolución, detalle por evento y juegos más reservados |
| GET | `/reportes/tabla-dinamica/opciones` | Fuentes, dimensiones y medidas disponibles para la tabla dinámica |
| GET | `/reportes/tabla-dinamica` | Cruza los datos: `fuente` (`prestamos`/`ventas`/`reservas`), `filas`, `columnas` (opcional) y `medida`. Devuelve filas, columnas, celdas y totales. `422` si alguna opción no existe o si filas y columnas son iguales |

### Raíz y estado

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/` | Público | Mensaje de bienvenida (`{"mensaje": ...}`) |
| GET | `/health` | Público | `{"estado": "ok"}`: para comprobar que el backend responde (Render, UptimeRobot) |

--------|------|--------|-------------|
| GET | `/reportes/prestamos` | Admin | Totales (`total`, `activos`, `devueltos`, `sin_devolver`, `personas`, duración promedio), 10 juegos más prestados y movimiento por día de evento (hasta 30 días). Filtros `desde` / `hasta` por fecha de retiro |

### Raíz

`GET /` devuelve un mensaje de bienvenida.

---

## 11. Frontend

### Rutas

| Ruta | Acceso | Pantalla |
|------|--------|----------|
| `/` | Público | Redirige a `/nosotros` |
| cualquier otra dirección | Público | Página «no encontrada» (404) |
| `/nosotros` | Público | Presentación del club, preguntas frecuentes, **juegos más populares** y **novedades** (los 3 últimos juegos cargados) |
| `/club` | Público | Eventos próximos y anteriores, con mapa y datos de la tarde de juegos |
| `/juegos` | Público | Catálogo: filtros, orden, paginación, favoritos, carrito y reservas |
| `/contacto` | Público | Formulario de contacto con validación en tiempo real |
| `/recuperar`, `/restablecer?token=...` | Público | «Olvidé mi contraseña»: pedir el enlace y elegir la contraseña nueva |
| `/login`, `/registro` | Público | Sesión («Recordarme» guarda el token en `localStorage`; si no, en `sessionStorage`) |
| `/checkout`, `/compra/resultado` | Cliente / Admin | Pantallas completas de pago y resultado |
| `/favoritos`, `/mis-compras`, `/mis-mensajes` | Cliente / Admin | Listas personales |
| `/cuenta`, `/cambiar-contrasena`, `/eliminar-cuenta` | Cliente / Admin | Gestión de la cuenta (`/cuenta/dni` y `/cuenta/novedades`: solo cliente; el DNI se carga en `/cuenta#mi-dni`) |
| `/baja?token=...` | Público | Baja de las novedades desde el enlace de un correo |
| `/mis-prestamos`, `/mis-reservas` | Solo cliente | Historial de préstamos y reservas |
| `/panel` | Admin | Redirige a `/panel/prestamos` |
| `/panel/prestamos`, `/panel/reservas` | Admin | Gestión de préstamos y de reservas |
| `/panel/historial` | Admin | Historial; con `?dni=` muestra una sola persona |
| `/panel/clientes` | Admin | Clientes registrados por DNI (sin cuenta) y acceso a su historial |
| `/panel/reportes` | Admin | Reportes con pestañas (`?tab=prestamos\|ventas\|reservas\|tabla`, `?desde=`, `?hasta=`): se puede recargar o compartir el enlace sin perder lo que se miraba |
| `/panel/novedades` | Admin | Enviar el resumen de novedades |
| `/panel/eventos`, `/panel/mensajes`, `/panel/ventas`, `/panel/juegos`, `/panel/usuarios` | Admin | Secciones administrativas |

`/prestamos` y `/panel/agregar-juego` son redirecciones heredadas hacia `/panel/prestamos` y `/panel/juegos`.

### Estado global (`src/context`)

Se montan en `main.jsx` en este orden (el carrito usa los avisos y la sesión): `BrowserRouter` → `ToastProvider` → `AuthProvider` → `CarritoProvider`.

| Contexto | Responsabilidad |
|----------|-----------------|
| `AuthContext` | Usuario logueado y rol (`admin` o `cliente`); `login`, `logout`. Al abrir la página recupera el perfil con el token guardado |
| `CarritoContext` | Ítems, cantidades, total y panel lateral. Se guarda **por usuario** en `localStorage` (`controlar_carrito_<id>`) porque el pago ocurre en otro sitio y la página se recarga al volver |
| `ToastContext` | Avisos breves (`exito`, `error`, `info`), con botón de acción opcional (p. ej. «Deshacer») |

### Componentes principales (`src/components`)

| Componente | Función |
|------------|---------|
| `Navbar` | Menú principal, contador del carrito, aviso de respuestas nuevas y menú de cuenta según rol |
| `PanelLayout` | Menú lateral del panel con contador de mensajes sin leer |
| `RutaProtegida` | Restringe rutas por rol (redirige a login o muestra «Sin permiso») |
| `TarjetaJuego` | Tarjeta del catálogo: favorito, carrito, reservar/cancelar y acciones de admin |
| `FormularioJuego` | Alta y edición de juegos |
| `JuegosPopulares`, `JuegosNovedades` | Secciones de la portada: los más populares y los 3 últimos juegos cargados |
| `Graficos` | Gráficos SVG livianos (barras, líneas, dona y ranking) con tooltip, modo claro/oscuro y ajuste al ancho del contenedor |
| `CarritoSidebar`, `LineaCarrito` | Carrito lateral y sus renglones |
| `FiltroFechas`, `ThOrdenable` | Filtro «desde/hasta» y encabezados de tabla ordenables |
| `Modal`, `HiloMensajes` | Ventana modal y vista de una conversación |

### Reportes (frontend)

`src/pages/Reportes.jsx` arma la barra de pestañas y el período; cada pestaña vive en `src/pages/reportes/` y se descarga solo al abrirla.

| Archivo | Función |
|---------|---------|
| `PanelPrestamos.jsx`, `PanelVentas.jsx`, `PanelReservas.jsx` | Indicadores con comparación contra el período anterior, gráficos y tablas de cada área |
| `TablaDinamica.jsx` | Selectores de fuente, filas, columnas y valores; totales, mapa de calor, orden por columna, intercambiar filas y columnas, vistas rápidas y descarga en CSV |
| `componentes.jsx` | `useReporte` (carga y caché), indicadores (`Kpi`), tarjetas y estados de carga/error |
| `utilidades.js` | Formatos (dinero, fechas), períodos rápidos (7 y 30 días, este mes, mes pasado, este año, todo) y exportación CSV |
| `reportes.css` | Estilos propios, con variables para modo claro y oscuro; se cargan solo al entrar a Reportes |

Lo ya consultado se guarda en memoria mientras la página está abierta: volver a una pestaña o a un período visto es instantáneo (el botón «Actualizar» vuelve a pedir los datos).

### Utilidades

- `src/api/api.js`: cliente HTTP único (`pedir`). Agrega el token, arma mensajes de error legibles a partir de `detail` y centraliza todos los endpoints.
- `src/utils/prestamos.js`: fechas en horario de Salta (`America/Argentina/Salta`), cálculo de «días sin devolver» y exportación a **CSV** (con BOM y `;` para abrir bien en Excel).
- `src/utils/validacionesContacto.js`: validaciones del formulario de contacto (espejo del backend).
- `src/data/eventos.js`: convierte eventos de la API al formato de las pantallas, los clasifica en próximos y anteriores, y define el aviso destacado del aporte mínimo.

### Otros detalles
- Accesibilidad: enlace «Saltar al contenido», regiones *aria-live* para avisos y manejo de foco en el carrito.
- Modo claro/oscuro desde la barra de navegación (no se guarda entre visitas). Los reportes también lo respetan.
- Las pantallas se cargan bajo demanda (`React.lazy`) y las imágenes usan `loading="lazy"`.
- El número de WhatsApp de la tienda está definido en `src/pages/Checkout.jsx`.

---

## 12. Pagos y correo

### Mercado Pago
1. `POST /pedidos/checkout` crea el pedido y la preferencia (`external_reference` = id del pedido) y devuelve `init_point`.
2. El frontend redirige al cliente a Mercado Pago. Al terminar vuelve a `FRONTEND_URL/compra/resultado?pedido=<id>`.
3. `POST /pedidos/{id}/confirmar` consulta el pago a Mercado Pago y sincroniza el pedido.
4. Si `BACKEND_URL` es público y `https`, Mercado Pago también avisa a `/pagos/webhook`. Un aviso falso no puede aprobar un pedido porque siempre se vuelve a consultar el pago con el token del servidor.

Para pruebas, usar credenciales de **prueba** en `MP_ACCESS_TOKEN`: no se mueve dinero real. En local (`http://localhost`) funciona la vuelta del cliente, pero no el webhook ni `auto_return`.

### Correo
- Con `BREVO_API_KEY` definida, se envía por la **API HTTPS de Brevo** (puerto 443).
- Sin ella, se usa **SMTP** (`SMTP_HOST`, etc.).
- Los servicios gratuitos de Render **bloquean los puertos SMTP** (25, 465 y 587): el envío se queda esperando y falla a los 15 segundos. En Render gratuito, usar Brevo (con remitente verificado en *Settings → Senders*).
- Los correos que dispara el sistema (reservas, compras, novedades, recuperación) se arman en `app/core/avisos.py` y se envían **en segundo plano**: si el envío falla, queda en el log y la operación igual se guarda. En cambio, al **responder un mensaje de contacto** el error sí se muestra al administrador.
- Con Brevo gratuito el tope es de unos 300 correos por día **en total** (incluye reservas, compras y novedades).

---

## 13. Despliegue en Render

### URLs actuales (cuenta de Render vigente)

| Servicio | Identificador / URL |
|----------|---------------------|
| Web Service (API) | https://controlarwebsservice-3u4z.onrender.com (Swagger en `/docs`) |
| Static Site (frontend) | https://controlar-de64.onrender.com |
| Base de datos PostgreSQL | `dpg-dbduqepsrm7s73d2kan0-a` (host interno) |

Con estas URLs, las variables quedan así:

| Dónde | Variable | Valor |
|-------|----------|-------|
| Web Service | `CORS_ORIGINS` | `https://controlar-de64.onrender.com` |
| Web Service | `FRONTEND_URL` | `https://controlar-de64.onrender.com` |
| Web Service | `BACKEND_URL` | `https://controlarwebsservice-3u4z.onrender.com` |
| Web Service | `DATABASE_URL` | Internal Database URL de la base (`postgresql://USUARIO:CLAVE@dpg-dbduqepsrm7s73d2kan0-a/NOMBRE_BD`) |
| Static Site | `VITE_API_URL` | `https://controlarwebsservice-3u4z.onrender.com` |

> Los datos de la base (usuario, clave y nombre) se copian del panel de Render y **no deben subirse al repositorio**. Para conectarte desde tu PC usá la *External Database URL*, cuyo host incluye el dominio de la región.
> Al cambiar `VITE_API_URL` hay que volver a desplegar el Static Site. Como la base es nueva, ejecutá otra vez `crear_admin` para tener un administrador.

### Base de datos
PostgreSQL de Render. Dentro de Render, usar la **Internal Database URL**.

### Backend (Web Service)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**:
  `python -m app.core.crear_tablas && python -m app.core.cargar_categorias && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Variables**: `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS` (URL del Static Site, sin barra final; varias separadas por coma). Para pagos y correo: `MP_ACCESS_TOKEN`, `FRONTEND_URL`, `BACKEND_URL`, `BREVO_API_KEY`, `SMTP_FROM`, `SMTP_FROM_NAME`. Para el resumen mensual automático: `CRON_CLAVE`.
- **Health Check Path** (opcional): `/health`.
- **Tareas automáticas** (opcionales): en un cron externo (por ejemplo cron-job.org), con el encabezado `X-Cron-Clave` igual a `CRON_CLAVE` y el tiempo de espera en 30 segundos (el máximo de cron-job.org). Si Render gratis estaba dormido, esa primera llamada puede fallar por tiempo, pero lo despierta y la siguiente funciona:
  - **Resumen mensual**: `POST {BACKEND_URL}/suscripcion/resumen/automatico`, una vez por mes. No repite si ya salió uno en los últimos 20 días.
  - **Vencimiento de reservas**: `POST {BACKEND_URL}/reservas/vencer/automatico`, cada 10 o 15 minutos. Es seguro repetirlo: solo vence lo que ya corresponde y cada reserva avisa una vez.

### Frontend (Static Site)
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Variable**: `VITE_API_URL` con la URL del backend (sin barra final).
- **Rewrite**: regla `/*` → `/index.html`, para que rutas como `/login` funcionen al recargar.

El plan gratuito de Render duerme el servicio sin uso: la primera carga puede tardar hasta un minuto.

---

## 14. Seguridad

- Contraseñas con **hash argon2**; nunca se guardan en texto plano.
- **JWT** con vencimiento (60 minutos por defecto) y **sin refresh token**: al vencer hay que iniciar sesión de nuevo.
- `.env` está en `.gitignore`: no se sube la URL de la base ni la `SECRET_KEY`.
- Autorización en el servidor por dependencias (`get_current_user`, `require_admin`); las cuentas desactivadas no pueden operar.
- Los recursos ajenos responden `404` (reservas, conversaciones, pedidos) para no revelar que existen.
- Pagos verificados siempre contra Mercado Pago; ítems y montos recalculados en el servidor; bloqueo de filas (`with_for_update`) para no descontar stock dos veces.
- Correos: se eliminan saltos de línea en asunto y destinatario (evita inyección de cabeceras).
- Búsquedas con `LIKE` escapan `%` y `_` en el historial de préstamos.
- CORS limitado a los orígenes configurados.
- Los enlaces de **baja de novedades** y de **recuperación de contraseña** llevan tokens firmados con claves derivadas de `SECRET_KEY` que **no sirven como sesión**. El de recuperación vence en 1 hora y se usa una sola vez; la respuesta de «olvidé mi contraseña» es siempre la misma para no revelar qué correos existen, y hay un límite de 5 pedidos por hora.
- Reservar exige el **DNI verificado en persona** por un administrador. Los clientes sin cuenta no tienen credenciales, así que no pueden acceder.
- Los reportes, los clientes y las novedades son solo para administradores. La lista de pendientes de devolución muestra nombre, DNI y teléfono: es información personal y no debe compartirse.
- La tabla dinámica solo acepta dimensiones y medidas de una lista cerrada: no se arma ninguna consulta con texto del usuario.

---

## 15. Puntos a revisar

Limitaciones conocidas y cosas para tener presentes:

- **Cron externo**: el resumen mensual y el vencimiento de reservas a su hora necesitan `CRON_CLAVE` y un cron que llame a la API. Sin eso, el resumen se manda a mano desde el panel y las reservas vencen (y avisan) cuando alguien usa la web después del límite.
- **Límites de intentos en memoria** (login, contacto, recuperación): se reinician con el servidor y no se comparten entre varias instancias.
- **Tope de correos de Brevo gratuito** (unos 300 por día): lo comparten reservas, compras, novedades y recuperación. Con muchos suscriptores, el resumen podría agotarlo.
- **Fecha de alta de los juegos**: los juegos cargados antes de agregar la columna `creado_en` no tienen fecha y, en las novedades, se ordenan por `id`. Los nuevos sí la guardan.
- **Reportes** calculan en Python sobre las filas del período (es suficiente para el volumen de un club). Si los datos crecieran mucho, convendría pasar las agregaciones a SQL.
- **JWT sin refresh token**: al vencer (60 minutos por defecto) hay que iniciar sesión de nuevo.
- **Correos en texto plano**: `enviar_correo` todavía no soporta HTML.

---

## 16. Evidencias de la primera entrega

Capturas de las pruebas hechas sobre la API con Swagger (`/docs`) en la primera entrega. Pueden mostrar nombres o rutas de esa etapa.

| Prueba | Resultado | Captura |
|--------|-----------|---------|
| Creación válida | 201 | ![Crear válido](./docs/capturas/01_crear_valido.png) |
| Categoría inexistente | 400 | ![Categoría inexistente](./docs/capturas/02_crear_categoria_inexistente.png) |
| Validación de esquema (precio negativo) | 422 | ![Precio inválido](./docs/capturas/03_crear_precio_invalido.png) |
| Listado con filtros combinados | 200 | ![Filtrar](./docs/capturas/04_filtrar_productos.png) |
| Actualización parcial (`exclude_unset`) | 200 | ![Actualizar parcial](./docs/capturas/05_actualizar_parcial.png) |
| Eliminación y repetición | 204 y 404 | ![Eliminar](./docs/capturas/06_eliminar_producto.png) |

Historial de commits:

![Commits](./docs/capturas/estef2.jpeg)
