# Nombre del Proyecto: ControlAR

## Descripción
Gestión de préstamos y venta de juegos de mesa modernos.

## Integrantes
| Nombre           | Usuario GitHub 
|------------------|----------------
| Albaro Rodo      | @albarorodo1234-oss
| Silvia Duran     | @1silviaduran 
| Estefania Mercado| @Estefania-Mercado-tec
| Lidia Areco      | @Florare83    

## Instrucciones de uso
1. Clonar el repositorio
2. Crear entorno virtual: `python -m venv venv`
3. Activar entorno virtual
4. Instalar dependencias: `pip install -r requirements.txt`
5. Levantar el servidor: `fastapi dev app/main.py`

## Endpoints
| Método | Ruta         | Código de estado | Descripción           |
|--------|--------------|-------------------|------------------------|
| GET    | /items       | 200               | Lista todos los items |
| POST   | /items       | 201               | Crea un item          |
| GET    | /items/{id}  | 200 / 404         | Obtiene un item       |
| PUT    | /items/{id}  | 200 / 404         | Actualiza un item      |
| DELETE | /items/{id}  | 204 / 404         | Elimina un item        |


## 🧪 Pruebas de Funcionamiento de la API (Swagger UI)

A continuación, se documentan las pruebas de control de calidad realizadas sobre los endpoints interactivos en `/docs`.

### a) Creación de un Producto Válido (Status 201)
Al enviar un cuerpo JSON estructurado con una categoría persistente, el sistema responde satisfactoriamente registrando el nuevo producto.
![Crear Producto Válido](./docs/capturas/01_crear_valido.png)

### b) Validación de Categoría Inexistente (Status 400)
El endpoint de creación intercepta peticiones que intenten registrar productos bajo categorías que no existen en la simulación de la base de datos.
![Categoría Inexistente](./docs/capturas/02_crear_categoria_inexistente.png)

### c) Validación de Esquema con Pydantic (Status 422)
Pydantic valida de forma automática los tipos de datos y restricciones antes de procesar la lógica de negocio. En este caso, rechaza un precio negativo.
![Precio Inválido](./docs/capturas/03_crear_precio_invalido.png)

### d) Listado de Productos con Filtros Combinados (Status 200)
Comprobación del correcto funcionamiento de la búsqueda case-insensitive por término y filtro de categoría simultáneos.
![Filtrar Productos](./docs/capturas/04_filtrar_productos.png)

### e) Actualización Parcial del Producto - PUT (Status 200)
Validación de la lógica `exclude_unset` en el repositorio, la cual permite cambiar únicamente el precio de un producto sin afectar al resto de atributos no enviados.
![Actualizar Parcial](./docs/capturas/05_actualizar_parcial.png)

### f) Ciclo de Eliminación Completo (Status 204 y 404)
Demostración de consistencia lógica: la primera eliminación devuelve una respuesta exitosa sin contenido y los intentos posteriores son interceptados con un error de recurso no encontrado.
![Eliminar Producto](./docs/capturas/06_eliminar_producto.png) 

### conclusión: con todo esto podemos asegurar el funcionamiento de la api en nuestra página web 