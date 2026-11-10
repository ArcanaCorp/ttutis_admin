# Registro de personas y cuentas

En **Personas → Registrar persona** se puede registrar una persona de manera manual o importar varias desde Excel.

## Registro manual

- **Alumno:** crea el perfil de alumno, su membresía de institución y envía una invitación a su correo. Si se agrega un apoderado, también crea su cuenta e inicia el vínculo con el alumno.
- **Docente y auxiliar:** crea una membresía con el rol correspondiente y envía una invitación al correo.
- **Apoderado:** crea o reutiliza su cuenta e inicia un vínculo pendiente con el alumno seleccionado.

Las invitaciones usan el enlace de activación de Supabase Auth; cada destinatario define su contraseña. El correo del alumno, docente, auxiliar y apoderado debe ser real y accesible. Las cuentas que ya existen se reutilizan y no reciben una segunda invitación.

## Excel

La carga utiliza cinco hojas. La fila 1 debe contener los encabezados de la plantilla. El límite es 500 personas en total, 1,000 vínculos y 5 MB por archivo.

| Hoja | Columnas |
| --- | --- |
| `Alumnos` | `codigo_alumno`, `nombres`, `apellidos`, `tipo_documento`, `numero_documento`, `fecha_nacimiento`, `telefono`, `correo_alumno`, `fecha_ingreso` |
| `Docentes` | `nombre_completo`, `correo` |
| `Auxiliares` | `nombre_completo`, `correo` |
| `Apoderados` | `nombre_completo`, `correo` |
| `Vinculos` | `codigo_alumno`, `correo_apoderado`, `parentesco` |

Los códigos de alumno deben ser únicos en la institución y se usan para vincular apoderados. Cada apoderado aparece una sola vez en su hoja; puede relacionarse con varios alumnos agregando filas en `Vinculos`. El parentesco queda como vínculo pendiente de confirmación.

Las fechas deben escribirse como texto `AAAA-MM-DD`. Los datos de documento y teléfono son opcionales. Los correos sí son obligatorios para crear todas las cuentas de acceso.

## Configuración necesaria para enviar invitaciones

La ruta de registro verifica una membresía ADMIN activa y usa Supabase Auth Admin únicamente en el servidor. Configura `SUPABASE_SERVICE_ROLE_KEY` como variable privada del servidor junto con `NEXT_PUBLIC_SUPABASE_URL`; nunca agregues la clave de servicio a variables `NEXT_PUBLIC_*` ni la incluyas en el navegador.

También debe estar configurado el envío de correo de Supabase Auth. Sin la clave de servidor, la pantalla informa el requisito y no deja registros incompletos.

## Archivos de ejemplo

- `plantilla-carga-personas.xlsx`: estructura vacía con las cinco hojas y la hoja `Referencia`.
- `ejemplo-carga-personas.xlsx`: 20 alumnos, 4 docentes, 2 auxiliares, 20 apoderados y 20 vínculos, todos ficticios.

Los correos `@example.com` del ejemplo son marcadores y no reciben invitaciones. Sustitúyelos por correos válidos antes de importar. La matrícula y asignación de aula se realiza después desde **Año escolar**, porque requiere escoger un año y un aula reales de la institución.
