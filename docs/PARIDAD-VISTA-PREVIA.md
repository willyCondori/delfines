# Correspondencia entre editor y página pública

El editor usaba un ancho CSS fijo de 1280 px; la página pública de la referencia estaba en una ventana más ancha. Por eso las unidades vw, las columnas, los saltos de línea y las proporciones no coincidían.

Ahora Escritorio usa innerWidth e innerHeight de la ventana real. El lienzo se reduce solo mediante una transformación uniforme para caber entre los paneles. El ancho CSS dentro del iframe no cambia al ajustar esa escala. Se muestran las dimensiones CSS y el porcentaje de visualización. También se agregaron tamaños predefinidos, ancho/alto personalizados y vista al 100 %, 75 % y 50 %. Al 100 % puede desplazarse horizontalmente por el lienzo sin reestructurar el diseño.

Se eliminaron diferencias exclusivas de la edición: el acceso de administración y el botón flotante de reservas ya no se ocultan. El acceso a administración no abre otro editor dentro de la vista previa. Las reservas de prueba siguen sin poder enviarse desde el editor.

## Verificación por el túnel

Se compararon el sitio público y el iframe con las mismas dimensiones de pantalla: escritorio 1680 × 950 y móvil 390 × 844. Los diez elementos medidos fueron cabecera, título, descripción, acciones, foto, tarjeta pequeña, sello, formulario de consulta, contacto y pie. Coincidieron posiciones documentales, ancho, alto y tamaño tipográfico; diferencias medidas: 0 px. El botón flotante de reservas también coincide en sus medidas (203,15625 × 52 px en la comprobación de escritorio).

La medición se conserva en outputs/paridad-editor-geometria.json. Capturas en outputs/editor-vista-real.png y outputs/sitio-vista-real.png. No se publicaron cambios de contenido durante la comprobación; la revisión del usuario permaneció en 20.

Las 19 pruebas Python y las pruebas JavaScript de viewport y tiradores pasan. Las rutas de recursos y la sintaxis JavaScript se verificaron. Los borradores sin publicar pueden diferir del sitio publicado por diseño; para comparar el resultado guardado, usar una revisión guardada y las mismas dimensiones CSS en ambas ventanas. Solo esta sección aísla el módulo deliberadamente.
