# Carga masiva de clases y horarios

La sección **Clases y horarios** permite registrar aulas, cursos, asignaciones de docentes y horarios tanto de forma manual como mediante Excel. Las acciones de gestión están disponibles para una cuenta con una membresía ADMIN activa en la institución.

## Reglas generales

- El año escolar seleccionado determina las aulas y asignaciones disponibles.
- Se admite `.xlsx` y `.xls` de hasta 5 MB y 500 filas de datos.
- Cada archivo procesa su primera hoja; la fila 1 debe tener los encabezados indicados.
- El sistema valida el archivo completo antes de guardar. Si alguna fila tiene errores, corrige el archivo y vuelve a importarlo; no se guardan filas parciales.
- Las importaciones son de altas nuevas. Para corregir registros existentes, usa la edición manual.
- Descarga la plantilla desde el mismo modal para obtener los encabezados actualizados.

## Aulas

Columnas: `nivel`, `grado`, `seccion`, `orden_grado`, `capacidad`, `estado`.

`nivel` acepta Inicial, Primaria, Secundaria u Otro (también sus valores equivalentes en inglés). Grado y sección son obligatorios. Orden y capacidad son enteros positivos opcionales. El estado puede ser `ACTIVE` o `INACTIVE`; si se deja vacío se usa `ACTIVE`. El año y la institución se asignan desde la pantalla.

## Cursos

Columnas: `curso`, `codigo`, `descripcion`.

El nombre del curso es obligatorio. Código y descripción son opcionales. No se aceptan nombres repetidos en la institución ni dentro del archivo.

## Asignaciones de cursos y docentes

Columnas: `grado`, `seccion`, `curso`, `correo_docente`.

El grado y la sección deben coincidir con un aula del año seleccionado. El curso debe existir en el catálogo y el correo debe corresponder a un docente activo de la institución. Para evitar duplicados, cada curso puede asignarse una sola vez a un aula en el mismo año escolar.

## Horarios

Columnas: `grado`, `seccion`, `curso`, `correo_docente`, `dia`, `hora_inicio`, `hora_fin`, `aula`.

El aula y la asignación del curso al docente deben existir previamente. El día acepta lunes a domingo. Las horas usan formato de 24 horas `HH:MM`; la hora final debe ser posterior a la inicial. Se rechazan cruces con bloques existentes del mismo docente o aula, y entre filas del propio archivo. El campo `aula` es opcional; si se deja vacío, se usa el nombre del grado y sección.

## Edición y eliminación

Cada registro ofrece acciones para editarlo o eliminarlo. No se permite eliminar un aula con matrículas, un curso con asignaciones ni una asignación que todavía tenga horarios. Elimine primero los registros relacionados desde la pantalla. Si la base de datos restringe una eliminación por una relación adicional, el panel mostrará el error devuelto y conservará el registro.
