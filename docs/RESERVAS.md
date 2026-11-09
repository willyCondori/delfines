# Reservas e inventario

## Acceso

- Sitio: `http://127.0.0.1:8080/`.
- Gestión del hotel: `http://127.0.0.1:8080/reservas-admin.html`.
- Editor visual: `http://127.0.0.1:8080/admin.html`.
- El administrador usa la misma cuenta y sesión en ambos paneles.

## Flujo del cliente

El botón fijo Reservar habitación abre el modal en cualquier página, también en celular. Consultar un plan precarga ese tipo de habitación. El formulario pide fechas, adultos, hasta dos niños, nombres, apellidos, correo electrónico, país y teléfono. Con niños, únicamente se ofrece Apartamento Doble. Se admiten correos de Gmail y de otros proveedores.

Las reservas se crean como pendientes de verificación. La disponibilidad se consulta al elegir fechas y se valida otra vez dentro de una transacción SQLite al guardar. Las pendientes y confirmadas ocupan una unidad por cada noche; las canceladas y rechazadas liberan el cupo. No hay cobro ni procesamiento de pagos: el importe mostrado es una estimación en USD.

Tras reservar se muestra la referencia y un enlace privado. Desde ese enlace se puede consultar el estado y cancelar hasta 24 horas antes de la entrada de las 14:00, hora de Bolivia. El enlace incluye un token en el fragmento (`#token=…`), que no se envía en la URL al servidor. Se valida en el cuerpo de las solicitudes. No compartas el enlace.

## Gestión administrativa

En Reservas e inventario se verifican solicitudes y se cambian sus estados a pendiente, confirmada, rechazada o cancelada. Se pueden añadir notas privadas. Una reserva cerrada no se reactiva. Se muestran las últimas 500 solicitudes.

El inventario inicial es de 3 habitaciones por cada uno de los cinco tipos. El administrador puede editar la cantidad y la tarifa por noche. La cantidad no se puede reducir por debajo de las reservas activas coincidentes. Las tarifas ya guardadas en reservas no cambian retroactivamente. Las tarjetas originales del catálogo siguen siendo referencias; el modal consulta las tarifas vigentes del inventario.

## Configurar Gmail desde el panel

1. Ingresar en Reservas e inventario y abrir Configuración de Gmail.
2. Escribir la cuenta remitente (Gmail o Google Workspace).
3. Introducir su contraseña de aplicación, no la contraseña de acceso al administrador del sitio.
4. Activar notificaciones y guardar.

Google exige verificación en dos pasos para las contraseñas de aplicación; algunas cuentas no permiten crearlas. Ayuda oficial: https://support.google.com/accounts/answer/185833?hl=es

El servidor usa SMTP de Gmail con STARTTLS y validación del certificado. En Windows, la contraseña se protege con DPAPI para el usuario que ejecuta el servidor y se guarda fuera de la carpeta pública. No se devuelve al navegador ni se incluye en el ZIP. Para cambiar de usuario de Windows o equipo hay que volver a introducirla. Fuera de Windows se admiten las variables privadas DELFINES_SMTP_USER y DELFINES_SMTP_PASSWORD.

No necesitas reiniciar para actualizar la configuración guardada desde el panel. Los avisos de creación, confirmación y cancelación se encolan en SQLite para el cliente y `reservas@losdelfines.com.bo`. La cola se revisa cada minuto y reintenta hasta cinco veces. El panel muestra pendientes, enviados y reintentos agotados. Reintentar avisos pendientes vuelve a habilitar esos intentos. Guardar credenciales no certifica que Gmail las acepte ni que un mensaje llegue a bandeja de entrada.

## Datos, copia de seguridad y despliegue

La base está en la carpeta privada de estado, por defecto `../../work/delfines-admin/reservations.sqlite3`, relativa a la raíz del proyecto. También permanecen allí las credenciales, sesiones, configuración de Gmail y revisiones. La base contiene datos personales y mensajes en cola: restringe el acceso a esa carpeta. SQLite no cifra toda la base. Para una copia consistente detén el servidor y respalda la carpeta privada completa; después inicia de nuevo.

El ZIP del proyecto contiene el código, las páginas y el diseño publicado, pero no la base de datos ni las credenciales. Conserva una copia privada aparte. El servidor sigue orientado a demostraciones locales; un despliegue permanente necesita un entorno de producción adecuado y una URL estable.

Los enlaces privados se generan con el dominio desde el que se reserva. Si usas un dominio propio, define DELFINES_PUBLIC_URL (por ejemplo https://hotel.example) antes de iniciar el servidor. Si cambia el dominio del túnel, los enlaces antiguos dejan de apuntar al servidor actual. No se implementaron pagos, cuentas de clientes ni recuperación automática de enlaces privados perdidos: el administrador puede gestionar esas reservas.

## Pruebas

`python -m unittest discover -s tests -q`
`node tests/test_resize.cjs`

Las pruebas de reservas usan bases temporales; las de correo simulan SMTP. La prueba completa de navegador se realizó con un servidor aislado y los envíos desactivados. No se enviaron correos reales.
