# Componentes y edición gráfica

Cada texto, imagen, botón y tarjeta puede seleccionarse en la vista previa o en Estructura de la sección. Los textos mezclados con iconos dentro de botones disponen de una pieza delfines-text propia, sin cambiar los índices de los spans originales. Los contenedores de diseño permanecen para conservar el flujo responsive; las piezas se editan individualmente.

El panel izquierdo permite agregar texto, título, imagen, botón/enlace, tarjeta y sección. Se crean en el borrador, dentro de la sección seleccionada; sin selección se agregan al contenido principal. Las secciones nuevas se agregan al contenido principal. El panel derecho permite borrar la pieza seleccionada; el borrado se representa con display:none y puede deshacerse o restaurarse. Guardar y publicar conserva estos cambios en la configuración del sitio. La creación no acepta HTML ni scripts.

Alto mínimo de la página en el panel izquierdo amplía el contenido principal. Cero vuelve al alto automático. La altura mínima no recorta el contenido existente.

Los tiradores laterales cambian solo el ancho y los verticales solo el alto por defecto. Mantener proporción y Escalar contenido son opciones explícitas, desactivadas inicialmente. Los tiradores siguen el rectángulo real durante animaciones y cambios de tamaño. La composición de portada permite que una foto cambie de ancho sin desplazar las piezas vecinas por el ancho mínimo implícito del grid.

Verificación real por HTTPS a través del túnel: foto de habitación de 453,703 × 475 px; arrastre derecho de 40 px produce 494 × 475 px, arrastre inferior de 40 px produce 494 × 515 px; reducción horizontal y vertical produce 454 × 475 px. La tarjeta vecina conserva posición y dimensiones. Se deshicieron los cambios de prueba; revisión publicada 17 conservada.

Probados los seis tipos de componente, el borrado, Deshacer y el alto de página a 14000 px. Las 18 pruebas del sistema pasan, incluido el guardado de componentes y rechazo de etiquetas ejecutables. Sin errores de consola registrados en la comprobación final.


## Mejoras de flujo y tonos

Se agregaron búsqueda y filtros de piezas, ruta de contenedores seleccionable, selección del contenedor padre, duplicación de textos/imágenes/botones, bloqueo persistente de movimiento y tamaño y atajos de teclado. El bloqueo también impide transformar hijos desde el gráfico y desactiva los campos de tamaño/posición; selecciona el contenedor bloqueado desde la ruta para desbloquearlo. El bloqueo es una ayuda de edición, no un permiso de seguridad.

Atajos con el foco fuera de campos de texto: Ctrl+Z para deshacer, Ctrl+Shift+Z o Ctrl+Y para rehacer, Ctrl+D para duplicar pieza, Supr para borrar y flechas para mover 1 px (Shift: 10 px). La escritura dentro de campos conserva sus atajos normales.

Verificados en el túnel: filtro por foto, bloqueo con campos desactivados y cero tiradores, duplicación del título y movimiento de 1 px con la flecha. Se deshicieron las modificaciones de prueba; revisión publicada 17 conservada. Las 19 pruebas automáticas pasan, incluida persistencia y validación del bloqueo.

El sitio combina superficies blancas y tintes suaves con degradados del nuevo azul en portada, tarjetas, reservas, contacto y pie. Se corrigieron contrastes heredados de texto blanco y dorado sobre las nuevas zonas claras. Vista móvil de 390 px sin desbordamiento horizontal del documento. Evidencias en outputs/delfines-blancos-degradados.png y outputs/editor-busqueda-bloqueo.png.
