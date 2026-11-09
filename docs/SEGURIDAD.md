# Revisión y mejoras de seguridad

Se revisaron el servidor Python sin framework y el frontend JavaScript. Se aplicaron las correcciones autorizadas, conservando la configuración publicada y las credenciales existentes.

## Hallazgos corregidos

1. **Media — restricciones inconsistentes entre GET y HEAD.** HEAD heredaba la implementación de archivos estáticos sin la validación de GET, exponiendo metadatos de archivos no públicos. Ambas rutas ahora pasan por `send_head` y una lista de carpetas públicas. También se rechazan archivos ocultos, enlaces simbólicos y listados de directorios. Evidencia: `backend/http.py:32`.
2. **Media — protección incompleta del acceso.** Los intentos se comprobaban sin bloqueo entre hilos y el éxito reiniciaba el contador. Ahora el límite se actualiza bajo bloqueo, no se reinicia con cada éxito y se acota la longitud de contraseña. Las sesiones expiran a las dos horas, tienen un máximo de 100 y se eliminan las vencidas al autenticar. Evidencia: `backend/http.py`, métodos `authenticated` y `do_POST`.
3. **Media — token persistido en sessionStorage.** Ahora se usa una cookie HttpOnly y SameSite=Strict (Secure bajo HTTPS del proxy), y se elimina el valor legado. Se persisten solo hashes de tokens en el estado privado. El reinicio conserva sesiones no vencidas. Las mutaciones con cookie exigen además una cabecera específica y validación de origen. Evidencia: `scripts/admin/editor.js:3`.
4. **Media — faltaban restricciones del navegador.** CSP limita scripts al mismo origen, prohíbe objetos y restringe quién puede incrustar el sitio; se añaden SAMEORIGIN y Permissions-Policy. La vista previa usa un archivo externo para inicializarse, sin scripts inline. Se permiten estilos inline porque el editor modifica estilos en tiempo real. Evidencia: `backend/http.py:29`, `scripts/editor/preview.js`.
5. **Media — solicitudes y archivos sin todos los límites necesarios.** Se requiere JSON objeto, se rechaza Transfer-Encoding, se limita el cuerpo por ruta y se establece un timeout de conexión. La verificación de origen cubre también login. Las imágenes se limitan explícitamente a 24 megapíxeles, además del límite de peso y la conversión a WebP existente. Evidencia: `backend/http.py:49`, `backend/http.py:77`.
6. **Media — configuración privada ubicable dentro del sitio.** El inicio ahora rechaza una carpeta de estado dentro del árbol público. La exportación autenticada omite enlaces simbólicos y archivos ocultos. Los enlaces editables rechazan caracteres de control. Evidencia: `backend/runtime.py:16`, `backend/storage.py:48`.

## Validación

- Ocho pruebas automatizadas: autenticación y revocación, bloqueo GET/HEAD, origen y JSON, límite de acceso y cabeceras, persistencia, validación de ajustes. La prueba de sesión también verifica la exportación.
- 49 rutas y redirección de páginas verificadas.
- Inicio de sesión y vista previa de Inicio/Habitaciones comprobados en navegador, sin errores de consola detectados. No se publicaron cambios de contenido durante estas pruebas.

## Límites pendientes

El servidor sigue basado en `http.server`, orientado a desarrollo y demostraciones. No equivale a un despliegue de producción endurecido: Python recomienda no usarlo como servidor de producción. No se implementaron MFA, usuarios con roles, aislamiento del editor en otro origen, monitorización externa ni protección contra DDoS. El límite de login se aplica a la dirección del peer; detrás del túnel puede compartirse entre visitantes. No se confía en cabeceras de IP arbitrarias.

La contraseña se puede cambiar desde el administrador. El endpoint exige sesión y contraseña actual, valida confirmación y longitud, reemplaza el hash atómicamente e invalida todas las sesiones. Tras el cambio elimina el archivo de acceso inicial. Las pruebas usan credenciales temporales y no cambian el acceso real. No se realizó una auditoría de dependencias.

## Referencias

- Python: https://docs.python.org/3/library/http.server.html
- MDN, Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy

## Reservas y Gmail

La base SQLite, los datos del cliente, los eventos de gestión y la cola de correos permanecen en el estado privado. Los endpoints administrativos de reservas, inventario y Gmail exigen sesión, control de origen y cabecera de administración. El acceso del cliente se limita a su token aleatorio; el identificador público por sí solo no permite consultar o cancelar una reserva. La cancelación se valida en el servidor con un límite de 24 horas antes de la entrada. El inventario se bloquea con BEGIN IMMEDIATE para evitar sobreventas concurrentes.

Las credenciales de Gmail guardadas desde el panel se cifran con Windows DPAPI, se mantienen fuera del sitio y no se devuelven al navegador. Los correos en cola contienen información personal y enlaces privados; protege las copias de la base. SQLite no cifra la base completa. Las pruebas usan datos ficticios y SMTP simulado, y se verificó que tres habitaciones no aceptan una cuarta reserva concurrente.

El flujo es de solicitudes pendientes de verificación, sin pagos. No sustituye un sistema de producción con protección de red, recuperación operativa y revisión de privacidad para huéspedes reales. Las credenciales SMTP deben configurarse por el propietario de la cuenta.
