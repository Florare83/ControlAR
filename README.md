# ControlAR — El Rincón de Hermes

Sitio web y sistema de gestión de **El Rincón de Hermes**, un club de juegos de mesa modernos de Salta. Combina tres cosas en una sola aplicación:

1. **Tienda**: catálogo de juegos en venta, carrito y pago con Mercado Pago o efectivo/transferencia.
2. **Ludoteca**: juegos que el club presta **solo durante los eventos presenciales** (no salen del lugar), con reservas anticipadas por parte de los clientes.
3. **Administración**: panel para registrar préstamos y entregas, gestionar eventos, ventas, usuarios, mensajes y ver reportes.

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
- Ver la portada (**Nosotros**: presentación, preguntas frecuentes y los 2 juegos más populares) y la agenda del **Club** (eventos próximos y anteriores, con enlace a Google Maps).
- Explorar el **catálogo de juegos** con buscador, filtros (categoría, editorial, edad, precio, etc.), orden y paginación.
- Enviar un mensaje desde el formulario de **Contacto** (validado en frontend y backend).
- Registrarse e iniciar sesión.

### Clientes (con sesión)
- Todo lo anterior, más:
- **Favoritos** («me gusta»): determinan qué juegos son los más populares.
- **Carrito y compra**: pagar con Mercado Pago, o registrar un pedido en efectivo/transferencia y coordinarlo por WhatsApp. Historial en **Mis compras**.
- **Reservar un juego** de la ludoteca para el próximo evento (una reserva por persona y evento) y cancelarla. Ver el estado en **Mis reservas**.
- **Mis préstamos**: historial de los juegos que retiró en eventos.
- **Mis mensajes**: conversaciones con el equipo dentro de la app, con aviso de respuestas nuevas.
- Cambiar la contraseña y eliminar (desactivar) su cuenta.

### Administradores
- **Préstamos**: registrar, cambiar el juego, devolver y deshacer una devolución (hasta 48 h). Exportar a CSV.
- **Reservas**: ver las del próximo evento y **entregar** el juego (crea el préstamo en el mismo paso).
- **Historial**: todos los préstamos con búsqueda, filtros, orden y exportación CSV; historial por persona.
- **Reportes**: totales, juegos más prestados y movimiento por día de evento.
- **Eventos**: crear, editar, duplicar y eliminar.
- **Ventas**: resumen de ingresos, listado de pedidos, confirmar o cancelar pagos en efectivo/transferencia.
- **Juegos**: alta, edición y baja de juegos (venta, stock, precio, si se presta, observaciones internas).
- **Mensajes**: bandeja de contacto; responder por correo (SMTP/Brevo) o dentro de la app.
- **Usuarios**: buscar, activar/desactivar y dar o quitar el rol de administrador.

---

## 2. Tecnologías y arquitectura

| Capa       | Tecnología |
|------------|------------|
| Backend    | Python, **FastAPI**, **SQLAlchemy 2**, Pydantic 2, Uvicorn |
| Base de datos | **PostgreSQL** (Render). Los índices parciales también tienen variante SQLite |
| Autenticación | **JWT** (HS256, PyJWT) y hash de contraseñas con **argon2** (pwdlib) |
| Pagos      | **Mercado Pago** (Checkout Pro) vía `httpx` |
| Correo     | API HTTPS de **Brevo** o SMTP directo (`smtplib`) |
| Frontend   | **React 18**, **React Router 6**, **Vite 5** (JavaScript, sin librería de UI) |
| Hosting    | Render: Web Service (API), Static Site (frontend) y PostgreSQL |

```
Navegador (React + Vite)  ──HTTP/JSON──►  FastAPI (/auth, /juegos, /prestamos, ...)  ──SQLAlchemy──►  PostgreSQL
        │                                          │
        └── redirige a Mercado Pago ◄──────────────┴── webhook / verificación de pagos
                                                   └── Brevo / SMTP (respuestas de contacto)
```

El backend sigue una organización por módulos: cada recurso tiene su *router*; los módulos más grandes (`auth`, `juegos`) separan además `schemas` (validación Pydantic) y `repository` (consultas). Las reglas de tiempo y las validaciones compartidas viven en `app/core`.

Al iniciar, el backend ejecuta `asegurar_esquema()` (ver [Esquema de base de datos automático](#esquema-de-base-de-datos-automático)).

---

## 3. Estructura del repositorio

```
ControlAR/
├── app/                              # Backend (FastAPI)
│   ├── main.py                       # App, CORS, startup y registro de routers
│   ├── api/v1/
│   │   ├── auth/                     # Registro, login, perfil, cuenta y gestión de usuarios
│   │   │   ├── router.py  schemas.py  repository.py  dependencies.py
│   │   ├── juegos/                   # CRUD de juegos, búsqueda y populares
│   │   │   ├── router.py  schemas.py  repository.py
│   │   ├── categorias.py             # Listado de categorías
│   │   ├── favoritos.py              # Favoritos («me gusta»)
│   │   ├── prestamos.py              # Préstamos (admin): alta, devolución, historial
│   │   ├── historial_prestamos.py    # «Mis préstamos» del cliente
│   │   ├── reservas.py               # Reservas para eventos y entrega
│   │   ├── eventos.py                # Eventos del club
│   │   ├── pedidos.py                # Carrito → pedido → pago; ventas; webhook
│   │   ├── contacto.py               # Formulario de contacto y conversaciones
│   │   └── reportes.py               # Estadísticas de préstamos
│   ├── core/
│   │   ├── db.py                     # Motor, sesión y Base de SQLAlchemy
│   │   ├── security.py               # Hash de contraseñas y JWT
│   │   ├── validaciones.py           # Validaciones del formulario de contacto
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
│   ├── components/                   # Navbar, TarjetaJuego, CarritoSidebar, Modal, ...
│   ├── pages/                        # Una pantalla por ruta
│   ├── data/eventos.js               # Funciones para mostrar eventos
│   ├── hooks/useEventos.js           # Carga de eventos desde la API
│   ├── utils/                        # prestamos.js, validacionesContacto.js
│   └── img/                          # Imágenes y logos
├── docs/capturas/                    # Capturas usadas en este README
├── requirements.txt                  # Dependencias del backend
├── package.json  vite.config.js  index.html
├── .env.development                 # VITE_API_URL para desarrollo
├── .env.ejemplo-smtp  env.ejemplo-smtp   # Ejemplos de variables de correo
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

La URL de la API sale de `VITE_API_URL`. En desarrollo ya está definida en `.env.development` (`http://localhost:8000`). Vite la incorpora al compilar: si se cambia en Render, hay que **volver a desplegar** el Static Site.

---

## 5. Variables de entorno

### Backend (`.env`, no se sube a git)

| Variable | Obligatoria | Por defecto | Descripción |
|----------|:-----------:|-------------|-------------|
| `DATABASE_URL` | Sí | — | URL de PostgreSQL. Local: *External Database URL* de Render; dentro de Render: *Internal Database URL*. Debe empezar con `postgresql://` |
| `SECRET_KEY` | Sí | — | Clave para firmar los JWT. Sin ella la app no arranca |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | Duración del token |
| `CORS_ORIGINS` | No | — | Orígenes extra permitidos, separados por coma y sin barra final. Ya están permitidos `localhost:5173`, `127.0.0.1:5173` y el dominio **anterior** `controlarstaticsite.onrender.com` (fijo en `main.py`). Para la cuenta actual hay que agregar `https://controlar-de64.onrender.com` aquí |
| `FRONTEND_URL` | No | `http://localhost:5173` | A dónde vuelve el cliente desde Mercado Pago. Con `https://` se activa `auto_return` |
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

Los archivos `.env.ejemplo-smtp` (solo SMTP) y `env.ejemplo-smtp` (Brevo + SMTP) sirven como plantilla.

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
    EVENTO ||--o{ RESERVA : recibe
    JUEGO ||--o{ RESERVA : reservado
    RESERVA ||--o| PRESTAMO : genera
    USUARIO ||--o{ MENSAJE_CONTACTO : escribe
    MENSAJE_CONTACTO ||--o{ RESPUESTA_MENSAJE : tiene
```

| Tabla | Descripción y campos destacados |
|-------|---------------------------------|
| `usuarios` | `nombre`, `email` (único), `contrasena_hash`, `es_admin`, `activo`. La propiedad `rol` devuelve `admin` o `cliente` |
| `categorias` | `nombre` (único) |
| `juegos` | `titulo`, `editorial`, `cantidad_jugadores` (p. ej. `"2-4"`), `duracion_minutos`, `edad_minima`, `precio`, `stock`, `en_venta`, **`se_presta`** (pertenece a la ludoteca), `imagen_url` (HTTPS), `observaciones` (nota interna, solo visible para admin), `categoria_id` |
| `favoritos` | `usuario_id`, `juego_id`; único por par |
| `prestamos` | `dni`, `nombre`, `email`, `sexo`, `telefono`, `estado` (`activo`/`cerrado`), `fecha_inicio`, `fecha_cierre`, `juego_id`, `titulo_juego` (copia del título al prestar) |
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

---

## 8. Reglas de negocio

### Préstamos (ludoteca)
- Los juegos se prestan **solo durante el evento y en el lugar**. Un administrador registra el préstamo con DNI, nombre, sexo y teléfono (el email es opcional).
- Solo se pueden prestar juegos marcados como `se_presta` y que no estén ya prestados. «Prestado ahora» (`en_prestamo`) se calcula a partir de los préstamos activos.
- Al cargar un DNI, el formulario completa los datos de préstamos anteriores de esa persona.
- **Cambiar juego**: se puede cambiar el juego de un préstamo activo por otro disponible.
- **Devolver** cierra el préstamo. Si fue un error, se puede **deshacer dentro de las 48 horas**, siempre que el juego siga libre y la persona no tenga otro préstamo activo.
- Un préstamo **«sin devolver»** es uno activo retirado antes de hoy (hora de Argentina): como los juegos no salen del evento, casi seguro faltó registrar la devolución.
- No se puede eliminar un juego que tenga préstamos o reservas registrados (responde 409).
- El cliente ve «Mis préstamos» filtrando por **el email de su cuenta**; los préstamos cargados sin email no le aparecen.

### Reservas
- Se reserva para **el próximo evento que permita reservas** (con fecha exacta y hora de inicio).
- Las reservas se aceptan **hasta las 20:00 del día anterior** al evento.
- **Una reserva por persona y por evento**; un juego solo puede estar en una reserva por evento. Se puede cancelar mientras esté activa.
- La reserva se guarda **hasta 30 minutos después de la hora de inicio**; pasado ese tiempo pasa a `vencida` y el juego queda libre.
- El vencimiento se aplica al consultar (cada endpoint de reservas llama a `vencer_reservas`); no hay un proceso programado.
- Para **entregar**, el administrador pide DNI, sexo y teléfono (la cuenta no los tiene). En una sola operación se crea el préstamo y la reserva pasa a `entregada`.
- Para permitir reservas, un evento necesita fecha exacta y hora de inicio.
- No se puede eliminar un evento que tenga reservas.
- Todas las reglas de hora usan UTC-3 fijo (Argentina no tiene horario de verano).

### Compras
- El servidor **recalcula** precios y stock desde la base: nunca confía en los valores del cliente. Un juego debe estar `en_venta`, tener precio mayor a 0 y stock suficiente.
- **Mercado Pago**: se crea el pedido (`pendiente`) y una preferencia de pago; el cliente paga en Mercado Pago y vuelve a `/compra/resultado`. Esa pantalla **no confía en la URL**: el servidor vuelve a consultar el pago a Mercado Pago, verifica que corresponda al pedido y que el monto coincida, y recién ahí aprueba. El stock se descuenta **una sola vez** aunque lleguen a la vez el webhook y la vuelta del cliente.
- **Efectivo / transferencia**: el pedido queda `pendiente` sin tocar el stock y se abre WhatsApp con el detalle. El administrador lo confirma (descuenta stock, pasa a `aprobado`) o lo cancela desde **Ventas**.
- Los ítems guardan copia del título y del precio: el pedido no cambia si después se edita o borra el juego.

### Juegos populares
- Son los juegos **en venta** con más favoritos, con desempate por título. La portada muestra 2 (`/juegos/populares?limite=2`).

### Mensajes de contacto
- Cualquiera puede escribir desde **Contacto** (con al menos un email o un teléfono). Si tiene sesión iniciada, el mensaje queda vinculado a su cuenta.
- Mensajes de **visitantes**: el administrador responde **por correo** (se agrega el mensaje original citado).
- Mensajes de **clientes con cuenta activa**: se responde **dentro de la app** y el cliente lo ve en «Mis mensajes» (con aviso de respuesta nueva).
- Límites anti-spam (en memoria): 5 mensajes por hora y por IP en el formulario público, 5 conversaciones nuevas por hora y 30 respuestas por hora por usuario.
- Las reglas de validación están duplicadas a propósito en `app/core/validaciones.py` y `src/utils/validacionesContacto.js`: **si se cambia una, hay que cambiar la otra**.

### Cuentas
- «Eliminar cuenta» **desactiva** la cuenta: anonimiza nombre y email, invalida la contraseña y borra los favoritos, pero conserva préstamos, pedidos y mensajes.
- Un administrador no puede desactivarse ni quitarse el rol a sí mismo.

---

## 9. Roles y permisos

| Rol | Cómo se obtiene | Acceso |
|-----|-----------------|--------|
| Visitante | Sin sesión | Catálogo, Club, Nosotros, Contacto, login y registro |
| Cliente | Registro desde `/registro` | Lo anterior + favoritos, carrito/compras, reservas, mis préstamos, mis mensajes, cuenta |
| Administrador | `crear_admin` o desde **Usuarios** en el panel | Todo, incluido el panel `/panel/*` |

La seguridad real la aplica la API (401 sin sesión, 403 sin permisos). `RutaProtegida` en el frontend solo ordena la pantalla.

> **Rol «operador»:** el frontend ya contempla un tercer rol (voluntario que solo gestiona préstamos y reservas), pero el backend todavía **no lo emite** y los endpoints de préstamos exigen administrador. Ver [Puntos a revisar](#15-puntos-a-revisar).

---

## 10. Referencia de la API

Base: `http://localhost:8000` (local) o la URL del Web Service en Render. Documentación interactiva en `/docs`. El token se envía en `Authorization: Bearer <token>`.

Leyenda de acceso: **Público**, **Usuario** (cualquier sesión), **Admin**. Códigos de error comunes: `401` sin sesión o token vencido, `403` sin permisos, `422` datos inválidos.

### Autenticación (`/auth`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/auth/register` | Público | Crea un cliente (`nombre`, `email`, `contrasena` de 8 o más). `409` si el correo existe |
| POST | `/auth/login` | Público | Formulario `username` (el correo) y `password`. Devuelve `access_token` |
| GET | `/auth/me` | Usuario | Perfil (`id`, `nombre`, `email`, `es_admin`, `rol`) |
| POST | `/auth/cambiar-contrasena` | Usuario | Requiere la actual; la nueva, de 8 o más y distinta |
| DELETE | `/auth/me` | Usuario | Desactiva la cuenta (pide la contraseña) |
| GET | `/auth/admin/usuarios` | Admin | Lista usuarios (`?buscar=` por nombre o email) |
| PATCH | `/auth/admin/usuarios/{id}` | Admin | Cambia `es_admin` y/o `activo` (no sobre uno mismo) |

### Juegos y categorías

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/juegos/` | Público | Lista (`?query=` busca por título). Incluye `en_prestamo` y `me_gusta`. `observaciones` solo se devuelve a admins |
| GET | `/juegos/populares` | Público | Más populares de la tienda (`?limite=`, 1 a 12, por defecto 2) |
| GET | `/juegos/{id}` | Público | Detalle. `404` si no existe |
| POST | `/juegos/` | Admin | Crea (`201`). `400` si la categoría no existe |
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
| GET | `/prestamos/buscar-persona/{dni}` | Datos de la persona en préstamos anteriores (`encontrado: true/false`) |
| GET | `/prestamos/historial` | Historial paginado. Filtros: `buscar`, `estado`, `atrasados`, `desde`, `hasta`; orden: `ordenar` (`fecha`/`juego`/`cliente`/`estado`) y `direccion`; paginación: `limite` (1–100) y `desplazamiento`. Devuelve `items`, `total` y `resumen` |
| GET | `/prestamos/historial/persona` | Todos los préstamos de una persona (`?dni=` o, si no hay, `?email=`) |
| PUT | `/prestamos/{id}/juego` | Cambia el juego de un préstamo activo |
| POST | `/prestamos/{id}/devolver` | Cierra el préstamo |
| POST | `/prestamos/{id}/reabrir` | Deshace una devolución (hasta 48 h) |

### Mi cuenta

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/mi-cuenta/prestamos` | Usuario | Préstamos asociados al email de la sesión |

### Eventos (`/eventos`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/eventos/` | Público | Lista de eventos (más recientes primero) |
| POST | `/eventos/` | Admin | Crea (`201`) |
| PUT | `/eventos/{id}` | Admin | Actualiza |
| POST | `/eventos/{id}/duplicar` | Admin | Copia el evento con otra `fecha` (y `hora_inicio` opcional), sin reservas |
| DELETE | `/eventos/{id}` | Admin | `204`. `409` si tiene reservas |

### Reservas (`/reservas`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/reservas/estado` | Público | Evento reservable, si las reservas siguen abiertas, hasta cuándo se espera y qué juegos ya están reservados |
| GET | `/reservas/mias` | Usuario | Mis reservas |
| POST | `/reservas/` | Usuario | Reserva un juego (`{ "juego_id": 1 }`). `409` si no hay evento, ya cerraron, ya tenés una reserva o el juego está tomado |
| DELETE | `/reservas/{id}` | Usuario | Cancela una reserva propia y activa (`404` si es de otra persona) |
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

### Reportes

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/reportes/prestamos` | Admin | Totales (`total`, `activos`, `devueltos`, `sin_devolver`, `personas`, duración promedio), 10 juegos más prestados y movimiento por día de evento (hasta 30 días). Filtros `desde` / `hasta` por fecha de retiro |

### Raíz

`GET /` devuelve un mensaje de bienvenida.

---

## 11. Frontend

### Rutas

| Ruta | Acceso | Pantalla |
|------|--------|----------|
| `/` | Público | Redirige a `/nosotros` |
| `/nosotros` | Público | Presentación del club, preguntas frecuentes y **juegos más populares** |
| `/club` | Público | Eventos próximos y anteriores, con mapa y datos de la tarde de juegos |
| `/juegos` | Público | Catálogo: filtros, orden, paginación, favoritos, carrito y reservas |
| `/contacto` | Público | Formulario de contacto con validación en tiempo real |
| `/login`, `/registro` | Público | Sesión («Recordarme» guarda el token en `localStorage`; si no, en `sessionStorage`) |
| `/checkout`, `/compra/resultado` | Cliente / Admin | Pantallas completas de pago y resultado |
| `/favoritos`, `/mis-compras`, `/mis-mensajes` | Cliente / Admin | Listas personales |
| `/cuenta`, `/cambiar-contrasena`, `/eliminar-cuenta` | Cliente / Admin | Gestión de la cuenta |
| `/mis-prestamos`, `/mis-reservas` | Solo cliente | Historial de préstamos y reservas |
| `/panel` | Operador / Admin | Redirige a `/panel/prestamos` |
| `/panel/prestamos`, `/panel/reservas` | Operador / Admin | Gestión de préstamos y de reservas |
| `/panel/resumen` | Admin | Pantalla base del panel (todavía sin contenido) |
| `/panel/historial` | Admin | Historial; con `?dni=` o `?email=` muestra una sola persona |
| `/panel/reportes`, `/panel/eventos`, `/panel/mensajes`, `/panel/ventas`, `/panel/juegos`, `/panel/usuarios` | Admin | Secciones administrativas |

`/prestamos` y `/panel/agregar-juego` son redirecciones heredadas hacia `/panel/prestamos` y `/panel/juegos`.

### Estado global (`src/context`)

Se montan en `main.jsx` en este orden (el carrito usa los avisos y la sesión): `BrowserRouter` → `ToastProvider` → `AuthProvider` → `CarritoProvider`.

| Contexto | Responsabilidad |
|----------|-----------------|
| `AuthContext` | Usuario logueado y rol (`admin`, `operador`, `cliente`); `login`, `logout`. Al abrir la página recupera el perfil con el token guardado |
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
| `JuegosPopulares` | Sección de la portada con los más populares |
| `CarritoSidebar`, `LineaCarrito` | Carrito lateral y sus renglones |
| `FiltroFechas`, `ThOrdenable` | Filtro «desde/hasta» y encabezados de tabla ordenables |
| `Modal`, `HiloMensajes` | Ventana modal y vista de una conversación |

### Utilidades

- `src/api/api.js`: cliente HTTP único (`pedir`). Agrega el token, arma mensajes de error legibles a partir de `detail` y centraliza todos los endpoints.
- `src/utils/prestamos.js`: fechas en horario de Salta (`America/Argentina/Salta`), cálculo de «días sin devolver» y exportación a **CSV** (con BOM y `;` para abrir bien en Excel).
- `src/utils/validacionesContacto.js`: validaciones del formulario de contacto (espejo del backend).
- `src/data/eventos.js`: convierte eventos de la API al formato de las pantallas, los clasifica en próximos y anteriores, y define el aviso destacado del aporte mínimo.

### Otros detalles
- Accesibilidad: enlace «Saltar al contenido», regiones *aria-live* para avisos y manejo de foco en el carrito.
- Modo claro/oscuro desde la barra de navegación (no se guarda entre visitas).
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
- Los errores de envío dejan el detalle técnico en el log y devuelven al usuario un mensaje claro; si falla, no se modifica la base.

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
- **Variables**: `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS` (URL del Static Site, sin barra final; varias separadas por coma). Para pagos y correo: `MP_ACCESS_TOKEN`, `FRONTEND_URL`, `BACKEND_URL`, `BREVO_API_KEY`, `SMTP_FROM`, `SMTP_FROM_NAME`.

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

---

## 15. Puntos a revisar

Cosas detectadas al documentar el código que conviene resolver o aclarar:

1. **Rol operador sin soporte en el backend.** El frontend (`AuthContext`, `RutaProtegida`, `PanelLayout`, `Login`) trata el rol `operador`, pero `Usuario` solo tiene `es_admin` y todo `/prestamos` exige administrador. Hay que decidir si se implementa (campo `es_operador`, rol en `/auth/me`, permisos en préstamos y reservas) o se elimina del frontend.
4. **Código sin uso.** `src/hooks/eventos.js` es una copia idéntica de `src/data/eventos.js` y nadie la importa; `src/data/juegos.js` son datos de ejemplo que no se usan; `cors` figura en las dependencias de `package.json` (es un paquete de Node que no se usa); `requirements.txt` incluye paquetes que el código no importa (por ejemplo `sentry-sdk`).
5. **SQL en logs.** `app/core/db.py` crea el motor con `echo=True`, que imprime cada consulta SQL. Es útil para aprender, pero en producción conviene desactivarlo.
6. **Sin pruebas automatizadas.** No hay tests en el repositorio; las validaciones críticas (reservas, pagos, préstamos) se verifican solo a mano.
7. **Límites anti-spam en memoria.** Se reinician con cada despliegue y no se comparten si hay más de una instancia.
8. **Vencimiento de reservas «perezoso».** Se aplica cuando alguien consulta reservas; si nadie consulta, el estado en base puede quedar desfasado (no afecta a la lógica, que siempre recalcula primero).
9. **Datos fijos en el código.** El número de WhatsApp (`Checkout.jsx`), el origen CORS de producción anterior (`main.py`, que no incluye el Static Site nuevo: se cubre con `CORS_ORIGINS`), el aviso del aporte mínimo y su fecha límite (`src/data/eventos.js`) y los eventos iniciales (`cargar_eventos.py`) están escritos a mano.
10. **`/panel/resumen`** es una pantalla base sin funcionalidad.
11. **Los préstamos sin email no aparecen** en «Mis préstamos» del cliente, porque el cruce se hace por email. Conviene pedir el email al registrar préstamos.
12. **Tema oscuro** no se guarda entre visitas.

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
