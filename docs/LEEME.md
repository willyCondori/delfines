# Delfines Apart Hotel — sitio completo local

Abre index.html con doble clic. HTML, CSS, JavaScript, imágenes y fuentes funcionan localmente sin instalación ni compilación.

Páginas: inicio, habitaciones, servicios, nosotros, galería con filtros, blog, tres entradas resumidas y contacto. La navegación conecta archivos HTML independientes.

Interacciones: galería con miniaturas y teclado, explorador de ambientes, filtros de fotos, preguntas desplegables, menú móvil y consulta de estadía con validación de fechas. El formulario de contacto permite revisar el mensaje y preparar un correo.

Los formularios preparan mensajes en la aplicación de correo del visitante; no los envían desde el sitio y no confirman reservas ni disponibilidad. Teléfono, correo, Maps y enlaces a las publicaciones originales usan servicios externos.

La página de habitaciones incluye los cinco planes del catálogo original con fotos, precios desde, capacidad publicada, camas, inclusiones, comodidades y horarios. Cada botón Más información abre un modal. Elegir un plan lo agrega a la consulta por correo. Se conserva el símbolo $ publicado por Wix; el hotel debe confirmar moneda, tarifa final y disponibilidad. No se inventaron tarifas ni capacidades.

Contenido y fotografías de referencia: https://grupooficorp.wixsite.com/delfineslapaz. Los artículos locales son versiones resumidas y adaptadas con enlace a la publicación original.

Estilos: styles.css (base), experience.css (dirección visual), refinements.css (modales), site.css (páginas interiores y navegación). app.js contiene las interacciones compartidas. assets/ incluye los recursos locales.

Para servir el sitio con administración: python server.py --port 8080 desde esta carpeta y abrir http://localhost:8080. Consulta ADMINISTRACION.md para el editor visual y los datos de acceso.

Fuentes DM Sans y Libre Caslon Display bajo SIL Open Font License; licencias en assets/.

Las fichas de los planes incluyen galerías originales con 18 fotos en total (4, 4, 3, 2 y 5 fotos respectivamente), controles por flechas, miniaturas y teclado. El modal se adapta a móvil y las comodidades son desplegables.

Administración: el apartado al final de cada página abre un editor protegido con vista previa, selección de elementos, tipografía, colores, degradados, imágenes, formas, tamaño, desplazamiento, deshacer y publicación persistente. Los datos privados de acceso no se exportan.
