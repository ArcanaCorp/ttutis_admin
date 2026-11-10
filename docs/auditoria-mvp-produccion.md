# Auditoría de preparación para producción — TTUTIS Admin

**Fecha:** 10 de noviembre de 2026  
**Alcance:** revisión del código disponible en el repositorio para el MVP de administración escolar, con una referencia de al menos 800 alumnos por institución.

## Resultado ejecutivo

La aplicación compila para producción y supera la revisión estática de estilo y errores. Las rutas principales de autenticación, administración, pagos, comunicaciones, soporte, auditoría y dispositivos están presentes. Se añadió una migración con índices para acelerar las búsquedas más frecuentes por institución.

**Estado: preparación parcial; todavía no se debe declarar capacidad de 800 alumnos certificada ni considerar cerrado el lanzamiento.** La revisión fue del código local. No se conectó a la base de producción, no se comprobó qué migraciones están aplicadas allí y no se ejecutó una prueba de carga con datos representativos. Además, algunas pantallas descargan historiales completos que crecen con el uso.

## Comprobaciones realizadas

- La compilación optimizada de Next.js terminó correctamente y generó las rutas de la aplicación y de sus servicios.
- La revisión ESLint terminó sin errores después de corregir el estado de carga del listado de soporte.
- La revisión de cambios no detectó errores de formato de parche.
- Se revisaron los flujos de sesión, el acceso institucional de servicios, los permisos definidos en las migraciones, el almacenamiento privado de capturas, el registro de actividad, las suscripciones en tiempo real y las consultas principales.
- No se ejecutaron pruebas automatizadas ni simulaciones de tráfico. El proyecto no declara un comando de pruebas automatizadas.

## Hallazgos que deben cerrarse antes del lanzamiento

### Prioridad alta — comprobar y aplicar el esquema de producción

El código depende de tablas, columnas, permisos, almacenamiento y publicaciones de tiempo real que se incorporan mediante migraciones. El repositorio no permite comprobar cuáles existen en el proyecto Supabase conectado a producción. Una diferencia entre ambos estados puede producir errores de permisos o columnas inexistentes, como los ya observados durante el desarrollo.

La migración nueva de índices está en [20261110170000_institution_query_indexes.sql](../supabase/migrations/20261110170000_institution_query_indexes.sql). Antes del lanzamiento se debe aplicar junto con las demás migraciones pendientes y comprobar desde Supabase que finalicen sin errores. No se ejecutó ninguna migración contra la base remota durante esta auditoría.

### Prioridad alta — validar el volumen de datos y la carga

La carga institucional pagina los resultados, pero sigue reuniendo todas las filas en el navegador. El panel y las pantallas académicas incluyen registros que aumentan con el tiempo, en particular asistencia, comunicaciones, matrículas y obligaciones de pago. El tiempo y la memoria pueden crecer mucho más por el historial que por tener 800 alumnos.

La nueva migración añade índices para búsquedas por institución, año, estado y fecha en las tablas más consultadas. Esto reduce trabajo de búsqueda en la base, pero no reduce el tamaño de los historiales que se descargan ni certifica la capacidad. Antes de producción hace falta probar con datos equivalentes a 800 alumnos, varios años escolares, historial de asistencia y obligaciones de pago, además de usuarios administrativos trabajando al mismo tiempo. También se recomienda paginar historiales y limitar los resúmenes a periodos relevantes.

### Prioridad alta — reducir las recargas causadas por tiempo real

Los cambios generan avisos de actualización por fila; las pantallas institucionales responden volviendo a consultar varios conjuntos de datos. Con altas de asistencia o cargas masivas, esos avisos pueden provocar trabajo repetido para cada administrador conectado. Debe revisarse el comportamiento con tráfico concurrente y evitar recargar historiales completos para cambios que afectan un solo registro o una sola pantalla.

La disponibilidad efectiva de tiempo real también depende de que las tablas y permisos correspondientes estén publicados y habilitados en el proyecto Supabase de producción. Eso no se pudo verificar desde el repositorio.

### Prioridad media — completar la cobertura de auditoría

El registro cubre cambios de filas en las tablas públicas existentes al instalar la migración y algunos eventos de cuenta. No equivale todavía a un registro exhaustivo de toda actividad: no queda evidencia de intentos fallidos de inicio de sesión, y los cambios de archivos en almacenamiento no pasan por los disparadores de tablas públicas. Las tablas que se creen después tampoco reciben automáticamente los disparadores.

Antes de afirmar que se audita toda la actividad, se deben definir los eventos de seguridad que se conservarán, instrumentar los intentos fallidos y las operaciones de archivos, y añadir los disparadores necesarios cuando se creen nuevas tablas. También se debe establecer cuánto tiempo se conservan los registros y quién puede consultarlos.

### Prioridad media — limitar abuso de operaciones sensibles

No se encontró una capa de limitación de frecuencia en las rutas revisadas. Las operaciones de invitación y correo, creación de tickets y generación masiva de obligaciones deberían tener límites y controles adecuados para evitar reintentos o uso abusivo. La autorización por sesión y membresía sí se valida en las rutas administrativas revisadas, pero no reemplaza esos límites operativos.

### Prioridad media — confirmar el alcance de la gestión de dispositivos

La pantalla permite activar o desactivar registros de dispositivo. Desactivar un registro no cierra sesiones que ya estaban abiertas; la interfaz lo informa. Si el requisito de seguridad es expulsar inmediatamente a un dispositivo, falta vincular esta acción con revocación de sesión y comprobar ese comportamiento de extremo a extremo.

## Cambios realizados durante esta auditoría

- Corregido el error de ESLint en el estado de carga de tickets de soporte, conservando la indicación de carga al abrir y actualizar la pestaña.
- Añadida una migración idempotente con índices para consultas de alumnos, membresías, vínculos familiares, años, aulas, matrículas, asistencia, comunicaciones, horarios, reglas y pagos.

## Secuencia recomendada para habilitar producción

1. Confirmar el estado de cada migración y aplicarlas en el proyecto Supabase de producción, incluida la nueva migración de índices.
2. Verificar acceso por perfiles y roles, políticas de seguridad, almacenamiento privado y suscripciones en tiempo real con cuentas de prueba distintas.
3. Ejecutar una prueba de carga representativa para 800 alumnos y varios administradores concurrentes; registrar tiempos de respuesta, errores, uso de base de datos y tamaño de respuestas.
4. Limitar los historiales descargados y revisar las recargas de tiempo real que causan actualizaciones masivas.
5. Cerrar los huecos de auditoría y añadir límites de frecuencia para operaciones sensibles.
6. Hacer una prueba funcional guiada de alta, edición, invitación, pagos, comunicación, soporte, cambio de contraseña y cierre de cuenta antes de habilitar usuarios reales.

## Conclusión

El MVP tiene una base funcional y la compilación está lista. La capacidad para 800 alumnos es plausible con los índices añadidos, pero no está demostrada: los historiales completos, las recargas en tiempo real, el estado remoto de las migraciones y la carga concurrente siguen pendientes de validación. El lanzamiento debe quedar condicionado a esas comprobaciones.
