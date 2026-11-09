# Verificación final del sistema

Comprobación realizada el 31 de octubre de 2026. Servidor local activo en http://127.0.0.1:8080. No se apagó ni suspendió la PC.

## Pruebas automáticas

- 17 pruebas correctas: autenticación, cambio de contraseña, revocación y persistencia de sesiones, protección de archivos privados, solicitudes entre sitios, límites de intentos, publicación, carruseles, creación de páginas, inventario, reservas, cancelación y correo simulado.
- Ocho direcciones de redimensionamiento: ancho y alto, proporción bloqueada, centros de bordes opuestos y escala visible.
- 58 rutas de páginas y recursos HTTP correctas, respetando las rutas base de las páginas internas.
- Sintaxis de los 11 archivos JavaScript correcta.
- SQLite: PRAGMA integrity_check = ok.

## Comprobaciones en el navegador

- Diez páginas públicas revisadas en escritorio y en móvil de 390 × 844: sin imágenes rotas detectadas ni desbordamiento horizontal del documento.
- Reservas: botón flotante, apertura del formulario, habitación preseleccionada desde su tarjeta y filtro de dos niños que deja únicamente Apartamento Doble.
- Administración de reservas accesible con sesión recuperada: cinco tipos de habitación, tres unidades por tipo y configuración de Gmail disponible.
- Foto de habitación, tarjeta de las chicas y sello amarillo son divs hermanos separados; el texto de la tarjeta y el nombre Delfines del pie se seleccionan de forma independiente.
- Tipografía comprobada a 24 px, degradado del texto y fondo transparente aplicados en la vista previa. Controles específicos de imagen y biblioteca de imágenes comprobados.
- Carrusel de dos imágenes creado desde el panel de una imagen y deshecho correctamente.
- Inspector identifica el efecto hover original de la tarjeta. Animación Pulso y activación hover comprobadas; fuera del elemento permanece sin animación activa.
- Aviso de cambios pendientes enumera el texto modificado antes de cambiar la contraseña y ofrece continuar, descartar todos o guardar todos.
- Rotación de 12 grados y desplazamiento horizontal de 15 px comprobados y deshechos.
- Sin errores de consola registrados durante la comprobación final.

## Redimensionamiento real

Portada antes del arrastre: x=654,297, y=111, ancho=546,703 y alto=500 px dentro del iframe.

- Tirador derecho, arrastre de 30 px: ancho=576,766, alto=527,5; x permanece en 654,297 y el centro vertical en 361 px. El borde se desplaza lateralmente sin bajar el conjunto.
- Tirador inferior, arrastre de 30 px: alto=530, ancho=579,5; y permanece en 111 y se mantiene el centro horizontal.
- Campo de ancho numérico: 580 px produce un ancho visible de 580 px. Se corrigió también este camino para impedir que el grid comprima el contenedor.

## Correcciones durante esta revisión

- El tamaño numérico de contenedores fija las dimensiones base antes de aplicar la escala, igual que los tiradores.
- El formulario inicial ya no ofrece tres o cuatro niños ni cantidades de adultos superiores a las admitidas por el inventario actual.

## Datos y límites de la comprobación

Las modificaciones visuales de prueba se deshicieron; la publicación permanece en revisión 14. No se cambiaron las credenciales ni se crearon reservas de prueba en la base de datos real.

Las pruebas de creación, cancelación, inventario concurrente y correo se ejecutan en un estado temporal aislado. Gmail real sigue sin configurar; no se enviaron correos reales y su entrega no queda certificada hasta configurar la cuenta y comprobarla.

La copia consistente de SQLite y el respaldo privado están en work/shutdown-backup, fuera del sitio y del ZIP. La configuración publicada y los datos permanecen en disco al cerrar. Un apagado detiene el servidor y cualquier túnel.

Evidencias: outputs/verificacion-editor-portada.png y outputs/verificacion-editor-texto.png.
