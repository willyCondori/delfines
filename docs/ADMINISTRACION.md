# Administración visual de Delfines

El apartado **Administración del sitio**, al final de cada página, abre el editor dentro del mismo sitio. También puedes ingresar directamente a `admin.html`.

El editor requiere el servidor incluido: desde la raíz del proyecto ejecuta `python server.py --port 8080`. Para cargar nuevas imágenes utiliza Pillow (`python -m pip install pillow`, si aún no está instalado).

La primera ejecución genera una contraseña privada. Su ubicación se muestra en la consola, fuera de la carpeta pública: `../../work/delfines-admin/initial-access.txt`. La contraseña no se incluye en el sitio exportado. Una nueva instalación genera su propio acceso.

## Uso

1. Ingresa con la contraseña de administración.
2. Elige la página y una sección o modal en la columna izquierda.
3. En **Editar**, toca un texto, imagen, botón o fondo para ver sus controles.
4. Cambia contenido, tipografía, tamaño, colores, degradado, forma, ancho, alto y espaciado.
5. En **Mover**, arrastra el elemento; también puedes ajustar los desplazamientos horizontal y vertical con números.
6. Activa **Solo esta sección** para concentrarte en ese módulo. Alterna entre escritorio y móvil para revisar el resultado.
7. Usa **Interactuar** para probar la navegación, abrir otro plan o recorrer las galerías; vuelve a **Editar** para seleccionar sus elementos.
8. **Deshacer**, **Rehacer** y **Restaurar este elemento** permiten recuperar el diseño anterior antes de publicar.
9. **Guardar y publicar** guarda los cambios para todos los visitantes. Sin guardar, los cambios solo existen en la vista previa.
10. **Descargar sitio** genera un ZIP con la versión guardada y sus imágenes.

Los ajustes de los modales de planes se identifican por el plan seleccionado. Las fotos de cada galería y las escenas de la portada se pueden personalizar por separado.

## Persistencia y archivos

Los cambios se guardan en `data/site-settings.json` y `scripts/editor/settings.js`, sin reemplazar los HTML originales. El segundo archivo permite ver los cambios guardados incluso al abrir el sitio exportado sin servidor. Las imágenes nuevas se guardan en `assets/uploads/`.

Los cambios de diseño se aplican a todos los tamaños de pantalla; usa las vistas de escritorio y móvil para comprobarlos antes de guardar. El editor conserva las funciones originales de los botones.

Las credenciales y el historial de revisiones permanecen fuera de la carpeta pública, en la carpeta privada de estado. El servidor conserva hasta 20 revisiones y evita sobrescribir una publicación más reciente de otra sesión.

El editor necesita un navegador moderno. El acceso dura hasta dos horas o hasta cerrar sesión. El túnel seguirá disponible mientras el servidor, el túnel y la computadora estén encendidos.

La sesión usa una cookie HttpOnly y SameSite=Strict con vencimiento de dos horas. Se conserva al recargar y reiniciar el servidor. Los hashes de sesión se guardan fuera del sitio público, en sessions.json. Cerrar sesión o cambiar la contraseña invalida el acceso. Si cambia el dominio del túnel, debes ingresar nuevamente.

## Cambiar contraseña

En la barra superior pulsa **Cambiar contraseña**. Guarda o deshaz primero los cambios pendientes del diseño. Escribe la contraseña actual, la nueva (12 a 128 caracteres) y su confirmación. Al actualizar se cierran todas las sesiones y debes ingresar de nuevo. Se guarda un hash scrypt con nueva sal; nunca la contraseña nueva en texto. El archivo de acceso inicial se elimina después del primer cambio.

## Selección por elemento

Haz clic directamente sobre el texto o imagen para seleccionarlo, incluso dentro de una tarjeta. El panel muestra el tipo elegido: Texto, Imagen, Botón, Icono o Contenedor. Los controles de tipografía se muestran para textos/botones; los de fotografía, recorte y descripción para imágenes. Los contenedores conservan controles de fondo, borde, tamaño y posición.

El selector **Estructura de la sección** enumera los elementos HTML anidados. Úsalo para elegir un contenedor padre, un elemento superpuesto o un hijo preciso sin alterar los demás. Los elementos internos de un SVG se editan como un icono completo. Los elementos técnicos sin representación visual no aparecen.

## Fondos, pendientes y guías

**Quitar fondo** aplica transparencia y elimina la imagen/degradado de fondo del elemento seleccionado; no altera el fondo de sus padres.

Al abrir Cambiar contraseña con cambios sin publicar, un resumen enumera páginas, elementos y propiedades modificadas. Puedes guardar todos, descartar todos (recuperables con Deshacer mientras sigas en el editor) o seguir editando. Si el guardado falla, el resumen permanece abierto.

Las guías rosas muestran bordes y centros alineados entre elementos hermanos al seleccionar o mover. Las etiquetas indican las distancias en píxeles; «Igual» identifica separaciones uniformes con tolerancia de un píxel. No se aplican ajustes automáticos ni se publican las guías.

## Transformación directa y distribución

Selecciona un elemento y utiliza los tiradores de la vista previa: ✥ mueve, ↻ rota y ↘ cambia el tamaño. Mantén Shift para rotar en incrementos de 15° o conservar proporción al redimensionar. Los movimientos de cada gesto pueden deshacerse como una sola acción. Las transformaciones se aplican también a textos inline sin eliminar su contenido.

Los contenedores incluyen distribución en bloque, flexible o cuadrícula, dirección, ajuste de filas, columnas, alineación y separación. El orden se aplica a hijos de un contenedor flexible o de cuadrícula. Los fondos elegidos prevalecen sobre las reglas originales del tema; selecciona el contenedor padre si quieres cambiar todo el fondo de una sección. Las capas decorativas o imágenes superpuestas siguen siendo elementos independientes.

Estas herramientas reorganizan los elementos existentes. No agregan páginas ni convierten el sitio en un editor de HTML arbitrario. Los ajustes son compartidos por escritorio y móvil: revisa ambas vistas antes de publicar.

## Degradados de texto

Selecciona un texto o botón y activa **Degradado del texto** en Contenido y tipografía. Elige los dos colores y el ángulo. Desactívalo para volver al color sólido. Aplicar un fondo sólido o degradado de fondo sobre el mismo elemento desactiva el recorte de texto; selecciona su contenedor para personalizar el fondo por separado.

## Animaciones

Selecciona un elemento y abre Animación. Elige aparición, zoom suave, pulso, brillo o enfoque; configura duración, retraso, repeticiones y ritmo. Probar animación reinicia el efecto seleccionado. Sin animación desactiva el efecto. Las animaciones publicadas respetan movimiento reducido. Los tiradores se reducen en elementos pequeños y se disponen fuera de la selección para no superponerse.

## Carruseles, cambios compartidos y móvil

- **+ Crear carrusel** abre el formulario de título, imágenes, textos, reproducción automática e intervalo. Se inserta después de la sección seleccionada, o al final del contenido si no hay una sección elegida. Las rutas se escriben una por línea: `assets/hero.webp | Texto de la imagen`. Admite 2 a 20 fotos. Usa Interactuar para recorrerlo; en celular se desplaza con el dedo. Selecciona un elemento del carrusel para abrir Editar este carrusel, cambiar sus imágenes o eliminarlo del borrador. Puedes deshacer todo antes de publicar.
- **Aplicar este elemento a todas las páginas** copia sus ajustes al elemento con el mismo selector. En particular, el nombre del pie tiene el selector estable `.footer-title`. Los cambios globales aparecen en el resumen de pendientes; después puedes personalizar una página de manera individual. Guarda y publica para aplicarlos a visitantes.
- Los contenidos, colores e imágenes de escritorio se comparten con móvil. En pantallas de hasta 680 px, los anchos personalizados se limitan al contenedor, las imágenes recuperan altura automática, las tipografías grandes se acotan y las cuadrículas se reorganizan. Los desplazamientos manuales de escritorio se restablecen a cero en celular para evitar desbordamientos. No es una copia exacta de las coordenadas del escritorio: revisa siempre ambas vistas.
- El texto Delfines al final de cada página es seleccionable de forma independiente.
- El botón flotante abre `https://wa.me/59176562122`, sin enviar mensajes automáticamente.

## Tamaño desde cualquier borde

Los elementos medianos y grandes disponen de ocho tiradores, en los cuatro lados y esquinas. **Mantener proporción** está activado de forma predeterminada; conserva la relación de ancho y alto al arrastrar. Desactívalo para editar cada dimensión libremente. El borde opuesto se mantiene en su posición en elementos sin rotar; en elementos rotados las guías usan el rectángulo visible. Los elementos pequeños conservan controles compactos para evitar superposiciones.

## Ajustes nuevos del editor

- **Alineación automática** centra un elemento en su contenedor o alinea sus hermanos visibles en fila/columna; también iguala espacios horizontales o verticales. Los cambios quedan en el borrador y se pueden deshacer.
- **+ Crear página** solicita nombre y ruta, y permite agregarla al menú de todas las páginas. La creación de archivo es inmediata; el diseño posterior se publica con Guardar y publicar. El panel muestra un enlace como `pages/promociones.html`: cópialo en Destino al seleccionar un botón o enlace. Las páginas nuevas aparecen en el selector al iniciar sesión. No se sobrescriben rutas existentes.
- Los carruseles nuevos se gestionan **desde Imagen en el panel derecho**. Agregar imágenes / crear carrusel abre la biblioteca; al elegir una foto adicional la imagen seleccionada se convierte en carrusel en el mismo espacio. Subir fotos al carrusel permite seleccionar varios archivos. Elegir de imágenes usadas reemplaza una sola foto. Selecciona una foto del carrusel y usa Editar este carrusel para cambiar la lista, los textos o la reproducción.
- El inspector informa los efectos hover originales, incluso los que provienen de un contenedor. Las animaciones añadidas se activan al cargar, al pasar el ratón o al hacer clic. El efecto original se conserva; Sin animación añadida significa que no se añade otro efecto.
- **Escalar contenido de la tarjeta** mantiene la proporción y escala imagen, texto, bordes y espacios como un grupo. Si lo desactivas, los tiradores cambian las dimensiones del contenedor; desactiva también Mantener proporción para modificar ancho y alto de forma independiente. Los tiradores verticales afectan al alto y los horizontales al ancho. La geometría mantiene fijo el borde opuesto y corrige los anclajes absolutos de las tarjetas.
- El pie incluye los enlaces de Instagram y TikTok proporcionados por el propietario, más WhatsApp. El enlace de correo en Contacto abre la aplicación de correo mediante mailto; el dispositivo debe tener un manejador de correo configurado.

La gestión de reservas y la configuración de Gmail están separadas en `reservas-admin.html`. Consulta `RESERVAS.md`.
