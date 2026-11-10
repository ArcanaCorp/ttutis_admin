# TTutis Admin

TTutis Admin es el panel web de administración para instituciones educativas. Reúne en un solo espacio la información del colegio, su comunidad, la organización del año escolar y la consulta de actividad académica y administrativa.

Este documento explica el producto tal como se encuentra en el repositorio: qué ofrece, cómo se presenta, qué información administra y cuáles son los límites actuales de cada sección. La aplicación está desarrollada en JavaScript y JSX. Se conserva ese enfoque y no se convierte el proyecto a TypeScript.

## Propósito y usuarios

El panel está orientado principalmente a administradores escolares con una membresía activa en una institución. La aplicación también contempla los perfiles de docentes, auxiliares, alumnos y apoderados dentro de la comunidad institucional. El acceso a las funciones de administración depende del rol y del estado de la membresía.

La información se organiza por institución. Al iniciar sesión, el panel carga el perfil de la persona, sus membresías y las instituciones asociadas. Si una cuenta tiene más de una institución, la aplicación contempla seleccionar la membresía activa para determinar el contexto de trabajo.

## Identidad visual y experiencia

La interfaz utiliza una identidad clara, sobria y orientada a la lectura: fondo blanco y gris muy claro, texto oscuro, bordes discretos y amarillo como color principal de énfasis. Los estados de éxito, advertencia, error e información tienen colores propios. La tipografía de la interfaz es Outfit.

El sistema visual está organizado alrededor de estilos compartidos para colores, tipografía, espaciado, tamaños, bordes, radios, sombras, animaciones y distribución. Sobre esa base se repiten tarjetas, botones, campos de entrada, ventanas modales, encabezados y estados de carga. Esto permite que las distintas secciones mantengan una apariencia reconocible.

La navegación principal es lateral y da acceso a Inicio, Mi colegio, Año escolar, Personas, Clases y horarios, Asistencia, Comunicaciones, Pagos y Configuración. Las pantallas muestran indicadores, tablas o listas, filtros de búsqueda, mensajes vacíos y avisos cuando hay problemas al cargar información. El panel está en español y presenta fechas y moneda con convenciones peruanas.

## Acceso y configuración inicial

La entrada al sistema permite iniciar sesión con correo y contraseña. También existe un flujo para crear una cuenta de administrador y completar la configuración inicial del colegio. Esa configuración registra los datos institucionales y establece la membresía de administración.

Las páginas privadas solicitan una sesión válida. Si no hay una sesión activa, la persona es enviada a la pantalla de acceso y, después de autenticarse, puede volver a la página que intentaba abrir. La autenticación y las sesiones son gestionadas por Supabase.

## Secciones del panel

### Inicio

Presenta un resumen del colegio y de la actividad disponible: estudiantes, membresías, aulas, matrículas, año escolar, movimientos de asistencia, comunicaciones y cargos. También destaca actividad reciente y registros del día cuando existen datos. Los indicadores se calculan a partir de los registros cargados para la institución.

### Mi colegio

Permite consultar y editar la información institucional, como razón social, nombre comercial, identificador, datos de contacto, sitio web, descripción, zona horaria y moneda. Los administradores activos pueden actualizar estos datos y cargar, reemplazar o retirar el logo del colegio. El logo admite imágenes PNG, JPG o WebP de hasta 2 MB.

### Año escolar

Permite consultar años escolares, aulas y matrículas, y crear años académicos y aulas. Las aulas pueden registrarse individualmente o cargarse desde una hoja de cálculo. También se puede asociar a un alumno con un aula dentro de un año escolar. Estas acciones de creación están reservadas a administradores con membresía activa.

La importación de aulas procesa la primera hoja del archivo y valida sus campos antes de guardar. Se admiten archivos Excel de hasta 5 MB y 500 filas. La estructura y los formatos aceptados se explican en la [guía de carga de aulas](docs/carga-masiva-aulas.md).

### Personas

Reúne alumnos, docentes, auxiliares y apoderados, con búsqueda y datos vinculados a la institución. El registro puede hacerse persona por persona o mediante una plantilla Excel. Al registrar alumnos, se guardan sus datos y membresía; también se pueden registrar trabajadores y establecer vínculos de apoderado con alumnos.

El flujo de invitación usa el correo de acceso para que cada persona active su cuenta. Si la cuenta ya existe, se reutiliza. Los vínculos con apoderados pueden quedar pendientes de confirmación. La carga masiva admite hasta 500 personas, 1,000 vínculos y archivos de hasta 5 MB. Los requisitos y las hojas esperadas se encuentran en la [guía de registro de personas](docs/carga-masiva-personas.md).

### Clases y horarios

Permite explorar aulas por año escolar y nivel, además de consultar cursos asignados, profesores y bloques de horario que ya estén registrados. Incluye vistas de aulas, cursos y horarios, con búsqueda y filtros.

En el estado actual del repositorio, la pantalla muestra controles de creación o edición, pero no se encontró una operación conectada para guardar asignaciones de cursos, profesores ni horarios desde esta sección. La gestión efectiva de esos registros requiere trabajo adicional.

### Asistencia

Muestra los movimientos de asistencia registrados, con búsqueda y filtro por tipo. Presenta ingresos, salidas e ingresos únicos, y puede identificar registros provenientes de QR, captura manual o sistema cuando esos datos están disponibles.

Esta pantalla consulta movimientos existentes. No se encontró en ella un flujo para marcar asistencia, registrar una entrada o salida, ni generar un código QR.

### Comunicaciones

Presenta anuncios, actualizaciones académicas, novedades de convivencia, citaciones, informes, recomendaciones y notificaciones existentes. Permite buscar por texto y filtrar por tipo.

La sección es de consulta: no se encontró un formulario conectado para redactar o publicar nuevas comunicaciones desde el panel.

### Pagos

Permite consultar cargos por alumno, concepto, periodo, vencimiento, importe y estado. Resume importes pagados, pendientes y vencidos, y permite buscar y filtrar los registros.

La pantalla no registra pagos ni crea cargos; muestra la información existente en el sistema.

### Configuración

Presenta datos generales del colegio, zona horaria, moneda, estado institucional y un resumen de las membresías del equipo. En el estado actual es principalmente una pantalla informativa; los cambios de datos institucionales se realizan en Mi colegio.

## Datos y Supabase

Supabase proporciona la autenticación, la base de datos y el almacenamiento del logo institucional. La aplicación organiza la información alrededor de instituciones y relaciona cada persona con una membresía y un rol. Entre los registros contemplados están perfiles, instituciones, estudiantes, vínculos con apoderados, años académicos, aulas, matrículas, asignaciones de cursos, horarios, asistencia, comunicaciones, cargos y dispositivos de usuario.

Las pantallas consultan datos asociados a la institución activa. El acceso a los datos se apoya en la sesión de la persona y en las reglas de seguridad definidas en Supabase. Las acciones administrativas verifican que exista una membresía ADMIN activa. La creación de cuentas e invitaciones se realiza desde operaciones del servidor; las credenciales privilegiadas deben mantenerse fuera del navegador.

La aplicación distingue entre datos persistidos en Supabase y operaciones disponibles en la interfaz. Que el modelo de datos contemple una función —por ejemplo, pagos o horarios— no significa que todas las acciones para administrarla ya estén implementadas.

## Documentación de operación

La carpeta [docs](docs/README.md) contiene guías de carga masiva y enlaces a plantillas y ejemplos de Excel para aulas y personas. Los datos de los archivos de ejemplo son ficticios y deben reemplazarse antes de una carga real.

## Alcance de esta auditoría

Esta documentación se elaboró mediante la revisión del código de las pantallas, componentes visuales, servicios de datos, modelo de información, rutas de acceso y cambios de base de datos presentes en el repositorio. Describe el comportamiento comprobable en esos archivos; no implica una auditoría de seguridad externa, de la configuración desplegada de Supabase ni de datos de producción.

## Licencia y titularidad

**© ARCANA CORP S.A.C. — RUC 20612123901. Todos los derechos reservados.**

Este software, su diseño, contenidos, estructura, marca y documentación son propiedad de **ARCANA CORP S.A.C. (ARCANA CORP)**. Su uso queda limitado a la compañía y a las personas expresamente autorizadas por ella. Queda prohibido a terceros copiar, modificar, adaptar, publicar, distribuir, sublicenciar, vender, ceder, ofrecer como servicio o crear obras derivadas de este software, total o parcialmente, sin autorización previa y por escrito de ARCANA CORP S.A.C.

Ninguna disposición de este aviso concede derechos de propiedad o una licencia pública. El acceso al repositorio o a una copia del software no transfiere esos derechos. La titularidad y los derechos reservados corresponden exclusivamente a **ARCANA CORP S.A.C., RUC 20612123901 (ARCANA CORP)**.
