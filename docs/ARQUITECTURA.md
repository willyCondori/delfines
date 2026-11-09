# Arquitectura

## Interfaz
- `index.html` y `pages/`: contenido y estructura del hotel.
- `scripts/site/`: comportamiento del sitio y catálogo de planes.
- `scripts/admin/editor.js`: interfaz de administración, borrador, historial y vista previa.
- `scripts/editor/bridge.js`: aplica ajustes y comunica la selección con el administrador.
- `scripts/editor/settings.js`: copia pública generada de la configuración.
- `css/site/`, `css/admin/`, `css/editor/`: estilos separados por responsabilidad.

## Servidor
- `server.py`: inicia la aplicación; conserva el comando habitual.
- `backend/runtime.py`: opciones de inicio y carga de credenciales privadas.
- `backend/context.py`: rutas, constantes y estado compartido del proceso.
- `backend/storage.py`: validación y persistencia de ajustes.
- `backend/http.py`: rutas HTTP, sesiones, carga de imágenes y exportación.

## Flujo de edición
El administrador modifica un borrador y lo muestra mediante el bridge en un iframe.
Guardar envía el borrador a `/api/admin/config`. El servidor valida y escribe
`data/site-settings.json` y `scripts/editor/settings.js`. El bridge aplica esos
ajustes sobre los HTML originales. Los identificadores de página se conservan
para mantener compatibles las personalizaciones existentes.

Las credenciales y revisiones privadas permanecen fuera del árbol del sitio.
Los archivos Python no se sirven por HTTP. Las URL de páginas anteriores redirigen
a `pages/`. No se requiere un proceso de compilación del frontend.

## Reservas y contenido

`backend/bookings.py` administra SQLite y las transacciones de inventario; `notifications.py` procesa la cola; `mail_settings.py` protege las credenciales SMTP con DPAPI en Windows; `content.py` crea páginas y enumera la biblioteca de imágenes. `scripts/site/reservations.js` implementa el modal, y `scripts/admin/reservations.js` el panel del hotel. `scripts/editor/resize.js` contiene la geometría comprobable de los ocho tiradores.
