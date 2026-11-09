# Delfines Apart Hotel

## Estructura

- `index.html`: página de inicio.
- `admin.html`: acceso al administrador visual.
- `pages/`: habitaciones, servicios, nosotros, galería, blog, contacto y artículos.
- `css/`: hojas de estilo del sitio y del administrador.
- `scripts/`: JavaScript del sitio, planes y editor visual.
- `assets/`: imágenes, fuentes y archivos subidos.
- `data/`: configuración publicada del sitio.
- `docs/`: documentación de uso y administración.
- `server.py`: punto de entrada del servidor.
- `backend/`: servidor separado en módulos.
- `requirements.txt`: dependencia para procesar imágenes.

## Iniciar

Desde esta carpeta: `python server.py --port 8080`.
Abre http://127.0.0.1:8080/ y http://127.0.0.1:8080/admin.html.
Las direcciones antiguas de las páginas siguen funcionando mediante redirecciones.
Las credenciales permanecen fuera del proyecto público.
Consulta `docs/ADMINISTRACION.md` para usar el editor.

Detalles de responsabilidades y flujo de edición: `docs/ARQUITECTURA.md`.

## Verificación

Ejecuta `python -m unittest discover -s tests -v` desde la raíz del proyecto.

## Reservas

Panel del hotel: http://127.0.0.1:8080/reservas-admin.html. Incluye inventario, aprobación de reservas y configuración de Gmail. La base SQLite y las credenciales quedan fuera del sitio público. Consulta `docs/RESERVAS.md`.
