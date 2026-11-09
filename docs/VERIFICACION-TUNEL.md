# Corrección de errores 502 del túnel

Se reprodujo la carga con 30 solicitudes simultáneas por HTTPS a Cloudflare: 19 errores 502 entre 60 solicitudes.

Se aumentó la cola de conexiones entrantes del servidor a 128 y se reinició el proceso. Se mantiene la escucha exclusiva en 127.0.0.1 y la autenticación existente. El servidor se inició en segundo plano con registros en work/server.stdout.log y work/server.stderr.log.

Después del cambio: tres rondas de 60 solicitudes por el túnel, 180 respuestas 200 y cero errores. Nueva carga en el navegador del túnel sin errores de consola registrados, sin imágenes principales rotas y con el modal de reserva cargando los cinco tipos de habitación desde la API. Las 17 pruebas del sistema pasan.

URL comprobada: https://rarely-cloudy-equity-acquired.trycloudflare.com/
