# TTUTIS
## README general — Documentación técnica, funcional y reglas de negocio

**Producto:** TTUTIS  
**Empresa desarrolladora:** ARCANA CORP  
**Versión documental:** 1.0  
**Fecha:** Noviembre de 2026  
**Estado:** MVP en desarrollo  
**Mercado inicial:** Instituciones educativas de Jauja, Junín, Perú.

---

# 1. Descripción general

## 1.1. ¿Qué es TTUTIS?

TTUTIS es una plataforma de gestión y comunicación educativa que conecta a las instituciones educativas con sus docentes, alumnos y familias.

Su objetivo es centralizar la información escolar y facilitar las actividades administrativas, académicas y de comunicación de una institución.

TTUTIS reemplaza las funciones principales de la agenda escolar física mediante una experiencia digital complementada con un carnet escolar PVC personalizado y un código QR individual para cada alumno.

La solución está compuesta por tres plataformas:

1. **TTUTIS Admin:** administración y gestión institucional.
2. **TTUTIS Docente:** gestión de actividades académicas y escolares del personal autorizado.
3. **TTUTIS Alumno/Apoderado:** consulta de información escolar y seguimiento familiar.

Las tres plataformas utilizan un backend centralizado y comparten la información de cada institución de acuerdo con los permisos de cada usuario.

## 1.2. Objetivos del producto

- Digitalizar la comunicación entre colegios y familias.
- Organizar la información académica.
- Facilitar el control de asistencia.
- Centralizar la información de alumnos y apoderados.
- Facilitar la gestión de docentes y personal.
- Digitalizar la agenda escolar.
- Incorporar identificación escolar mediante carnets QR.
- Proporcionar información útil para la toma de decisiones.
- Reducir tareas administrativas repetitivas.
- Permitir que varias instituciones utilicen la plataforma de forma independiente.

## 1.3. Principio de desarrollo

TTUTIS se desarrolla bajo el siguiente principio:

**Construir lo necesario para operar hoy, manteniendo una estructura que permita crecer mañana sin reconstruir el producto.**

El MVP debe priorizar:

- Estabilidad.
- Seguridad.
- Facilidad de uso.
- Información confiable.
- Operaciones escolares esenciales.
- Experiencia sencilla para padres y docentes.

No se deben incorporar funcionalidades, tablas o servicios que no respondan a una necesidad real del producto.

---

# 2. Arquitectura general del producto

## 2.1. Tres plataformas, un solo sistema

TTUTIS no debe tratarse como tres productos independientes. Son tres experiencias que comparten información, usuarios, permisos y reglas de negocio.

| Plataforma | Usuarios principales | Objetivo |
|---|---|---|
| TTUTIS Admin | Administradores y directivos | Administrar la institución |
| TTUTIS Docente | Docentes y personal autorizado | Gestionar actividades escolares |
| TTUTIS Alumno/Apoderado | Alumnos y familias | Consultar y seguir la vida escolar |

## 2.2. Arquitectura centralizada

La arquitectura funcional es:

- Una plataforma web administrativa.
- Una aplicación para docentes y personal autorizado.
- Una aplicación para alumnos y apoderados.
- Un backend centralizado.
- Una base de datos PostgreSQL.
- Un sistema central de autenticación.
- Un sistema de autorización por institución, membresía, rol y permisos.

Las aplicaciones no deben mantener bases de datos institucionales independientes.

## 2.3. Backend compartido

El backend es responsable de:

- Autenticación.
- Autorización.
- Gestión de instituciones.
- Gestión de usuarios.
- Gestión académica.
- Asistencia.
- Calificaciones.
- Comunicaciones.
- Carnets y credenciales QR.
- Notificaciones.
- Pagos escolares, cuando el módulo esté habilitado.
- Auditoría de operaciones sensibles.

El backend debe ser la autoridad sobre los datos y las operaciones. Las aplicaciones cliente no deben decidir por sí solas si un usuario tiene autorización para consultar o modificar información.

---

# 3. Tecnologías y herramientas

## 3.1. Backend e infraestructura

| Tecnología | Responsabilidad |
|---|---|
| Supabase | Plataforma backend |
| PostgreSQL | Base de datos principal |
| Supabase Auth | Autenticación |
| Supabase Storage | Almacenamiento de archivos |
| Supabase Edge Functions | Operaciones de backend y procesos privilegiados |
| Row Level Security (RLS) | Protección y aislamiento de datos |
| Supabase Realtime | Actualizaciones en tiempo real cuando sean necesarias |

## 3.2. Aplicaciones

### TTUTIS Admin

- Next.js.
- JavaScript y JSX.
- Interfaz web.
- Diseño adaptable a diferentes tamaños de pantalla.
- Integración con Supabase.

**Decisión de desarrollo:** la aplicación administrativa se desarrolla sin TypeScript, utilizando JavaScript.

### TTUTIS Docente

La plataforma está destinada a dispositivos móviles y debe facilitar las operaciones diarias del personal escolar.

Stack de referencia propuesto:

- React Native.
- Expo.
- JavaScript/JSX o TypeScript, según la decisión final del proyecto.
- Integración con Supabase.
- Lectura de códigos QR mediante las capacidades del dispositivo.

### TTUTIS Alumno/Apoderado

Plataforma móvil para alumnos y familias.

Stack de referencia propuesto:

- React Native.
- Expo.
- Integración con Supabase.
- Notificaciones.
- Lectura de información escolar.

La tecnología definitiva de las aplicaciones móviles debe mantenerse documentada en sus respectivos proyectos.

## 3.3. Herramientas de desarrollo

- Visual Studio Code.
- Node.js.
- npm.
- Supabase CLI.
- Git.
- GitHub.
- PowerShell en el entorno Windows.

## 3.4. Infraestructura del proyecto

El proyecto TTUTIS utiliza un proyecto Supabase independiente.

**Project Ref:** `eeybnagdnlmiazdyvylp`

No debe confundirse con otros proyectos Supabase de ARCANA CORP.

Las claves privadas, contraseñas, tokens y secretos no deben almacenarse en el repositorio ni incluirse en este README.

---

# 4. Estructura conceptual del repositorio

La organización recomendada para el producto es:

```text
ttutis/
│
├── apps/
│   ├── admin/
│   │   └── Aplicación web administrativa
│   │
│   ├── docente/
│   │   └── Aplicación móvil docente
│   │
│   └── family/
│       └── Aplicación móvil alumno/apoderado
│
├── packages/
│   ├── shared/
│   │   └── Utilidades y reglas compartidas
│   │
│   ├── validation/
│   │   └── Validaciones compartidas
│   │
│   └── ui/
│       └── Componentes compartidos, cuando corresponda
│
├── supabase/
│   ├── migrations/
│   │   └── Migraciones SQL
│   │
│   ├── functions/
│   │   └── Funciones Edge
│   │
│   ├── seed.sql
│   └── config.toml
│
├── docs/
│   ├── README.md
│   ├── architecture.md
│   ├── business-rules.md
│   ├── database.md
│   ├── authentication.md
│   ├── permissions.md
│   └── deployment.md
│
└── README.md
```

Esta estructura representa una organización recomendada del producto. No implica que todas estas carpetas ya existan en el repositorio actual.

---

# 5. Conceptos fundamentales del sistema

Antes de definir las funcionalidades, es necesario establecer los conceptos que comparten las tres plataformas.

## 5.1. Institución educativa

Es la entidad que contrata y utiliza TTUTIS.

Cada institución tiene:

- Identidad propia.
- Información institucional.
- Alumnos.
- Padres y apoderados.
- Docentes.
- Personal.
- Sedes.
- Años académicos.
- Grados y secciones.
- Asignaturas.
- Horarios.
- Comunicaciones.
- Registros académicos.

Los datos institucionales deben permanecer aislados de los datos de otras instituciones.

## 5.2. Sedes

Una institución puede tener una o varias sedes.

Cada sede pertenece a una institución.

Los usuarios pueden tener acceso:

- A toda la institución.
- A determinadas sedes.

El alcance depende de la membresía y de los permisos asignados.

## 5.3. Persona

Representa a una persona registrada dentro de una institución.

Ejemplos:

- Alumno.
- Padre.
- Madre.
- Apoderado.
- Docente.
- Personal administrativo.

La persona representa información personal e institucional, no necesariamente una cuenta de acceso.

## 5.4. Perfil

Representa una cuenta global de usuario asociada a la autenticación.

Un perfil puede estar relacionado con una o varias identidades personales institucionales.

Esto permite que una misma persona utilice TTUTIS en diferentes instituciones sin necesitar una cuenta global diferente para cada una.

## 5.5. Membresía institucional

Representa la relación de un perfil con una institución.

Define:

- Institución a la que pertenece.
- Estado de la relación.
- Alcance de acceso.
- Roles asignados.
- Sedes autorizadas.

Una membresía no debe confundirse con la identidad personal ni con el código de acceso.

## 5.6. Rol

Determina el conjunto de responsabilidades de un usuario.

Ejemplos:

- Administrador institucional.
- Director.
- Docente.
- Auxiliar.
- Personal autorizado para asistencia.

## 5.7. Permiso

Define una acción específica que puede realizar un usuario.

Ejemplos:

- Consultar alumnos.
- Registrar asistencia.
- Modificar asistencia.
- Publicar comunicados.
- Registrar calificaciones.
- Consultar reportes.
- Administrar carnets.

Los roles agrupan permisos, pero la autorización debe comprobar también la institución, la sede y las relaciones correspondientes.

---

# 6. TTUTIS Admin

## 6.1. Descripción

TTUTIS Admin es la plataforma web destinada a administrar la institución educativa.

Es el centro de configuración y gestión del colegio.

Desde esta plataforma se organiza la información institucional, académica, administrativa y operativa.

## 6.2. Usuarios

- Administrador institucional.
- Director.
- Personal administrativo.
- Personal autorizado según sus permisos.

## 6.3. Navegación principal

La navegación debe ser sencilla y comprensible para usuarios sin conocimientos técnicos.

### Inicio

Panel general de la institución.

Información prevista:

- Cantidad de alumnos.
- Cantidad de docentes.
- Matrículas.
- Distribución por grados y secciones.
- Resumen de asistencia.
- Actividad institucional.
- Comunicados recientes.
- Avisos importantes.

### Institución

Administración de:

- Datos generales.
- Nombre institucional.
- Logotipo.
- Información de contacto.
- Sedes.
- Configuración institucional.

### Alumnos

Administración de:

- Registro de alumnos.
- Información personal.
- Fotografía.
- Código escolar.
- Estado del alumno.
- Matrículas.
- Grado y sección.
- Historial institucional.

Funciones:

- Crear alumno.
- Editar información.
- Consultar expediente.
- Importar alumnos.
- Consultar matrícula.
- Gestionar estado.

### Apoderados

Administración de:

- Registro de padres y apoderados.
- Información de contacto.
- Relaciones familiares.
- Vinculación con alumnos.
- Verificación de vínculos.
- Permisos de consulta familiar.

Un apoderado puede estar relacionado con varios alumnos.

### Docentes y personal

Administración de:

- Registro de docentes.
- Registro de personal.
- Datos personales.
- Código de acceso institucional.
- Membresía.
- Roles.
- Permisos.
- Asignaciones académicas.

### Clases y horarios

Administración de:

- Años académicos.
- Periodos.
- Niveles.
- Grados.
- Secciones.
- Asignaturas.
- Cursos.
- Docentes.
- Horarios.

La organización académica debe permitir que cada sección tenga un horario y que los docentes estén asignados a los cursos correspondientes.

### Matrículas

Administración de:

- Alumnos matriculados.
- Año académico.
- Grado.
- Sección.
- Fecha de matrícula.
- Estado.
- Traslados.
- Retiros.
- Finalización del año académico.

### Asistencia

Consulta y administración de:

- Entradas.
- Salidas.
- Salidas temporales.
- Retornos.
- Faltas.
- Tardanzas.
- Historial.
- Incidencias.
- Correcciones autorizadas.

### Carnets

Gestión de:

- Diseño institucional.
- Información de alumnos.
- Fotografías.
- Códigos de identificación.
- Códigos QR.
- Emisión.
- Estado de credenciales.
- Reposiciones.

### Comunicaciones

Administración de:

- Comunicados.
- Avisos.
- Publicaciones institucionales.
- Destinatarios.
- Grados.
- Secciones.
- Historial de publicaciones.

### Calificaciones

Consulta y administración de:

- Asignaturas.
- Periodos.
- Calificaciones.
- Escalas de evaluación.
- Publicación de resultados.
- Reportes académicos.

### Reportes

Información institucional:

- Alumnos.
- Matrículas.
- Asistencia.
- Calificaciones.
- Docentes.
- Secciones.
- Actividad escolar.

### Configuración

Administración de:

- Usuarios.
- Roles.
- Permisos.
- Sedes.
- Periodos académicos.
- Escalas de calificación.
- Configuraciones institucionales.

### Pagos escolares (opcional)

Si el colegio contrata este módulo:

- Conceptos de pago.
- Obligaciones.
- Estados de pago.
- Historial.
- Reportes.

---

# 7. TTUTIS Docente

## 7.1. Descripción

TTUTIS Docente es la plataforma móvil para docentes y personal autorizado.

Su objetivo es facilitar las tareas diarias de los trabajadores de la institución sin obligarlos a utilizar la plataforma administrativa completa.

La experiencia debe ser directa, sencilla y orientada a las acciones frecuentes.

## 7.2. Navegación principal

### Inicio

- Resumen de actividades.
- Horario del día.
- Cursos asignados.
- Notificaciones.
- Accesos rápidos.

### Mi horario

- Horario semanal.
- Cursos.
- Secciones.
- Horas de clase.
- Distribución diaria.

### Mis cursos

- Cursos asignados.
- Secciones correspondientes.
- Listas de alumnos.
- Información académica.

### Alumnos

- Listado de alumnos de las secciones autorizadas.
- Consulta de información permitida.
- Fotografía.
- Código escolar.
- Grado y sección.

### Asistencia

- Selección de sección.
- Listado de alumnos.
- Registro de asistencia.
- Registro de faltas.
- Registro de tardanzas.
- Consulta de historial, según permisos.

### Calificaciones

- Selección de curso.
- Selección de sección.
- Selección de periodo.
- Registro de calificaciones.
- Consulta de resultados.
- Actualización de notas, según permisos.

### Observaciones

- Registro de observaciones.
- Consulta de observaciones realizadas.
- Seguimiento de situaciones escolares.

### Comunicados

- Consulta de comunicados institucionales.
- Publicación de avisos cuando esté autorizado.
- Comunicación dirigida a secciones o grupos permitidos.

### Escáner QR

Herramienta para leer carnets de alumnos cuando el usuario tenga autorización para realizar operaciones de identificación o asistencia.

### Perfil

- Datos personales.
- Institución.
- Rol.
- Código de acceso.
- Información de la cuenta.

## 7.3. Reglas del docente

1. Solo puede consultar los alumnos de sus asignaciones o de su alcance autorizado.
2. No puede modificar información institucional general sin permiso.
3. Solo puede registrar calificaciones en los cursos y periodos autorizados.
4. Solo puede registrar o modificar asistencia dentro de su alcance.
5. No puede consultar información privada de familias sin autorización.
6. No puede publicar comunicados institucionales si no tiene el permiso correspondiente.
7. Las acciones sensibles deben quedar registradas.

## 7.4. Personal autorizado para asistencia

El sistema puede permitir que auxiliares u otros trabajadores registren movimientos de alumnos mediante el escáner QR.

La autorización no depende de que el usuario sea docente.

Debe existir un permiso específico para realizar esta actividad.

---

# 8. TTUTIS Alumno/Apoderado

## 8.1. Descripción

Es la plataforma móvil destinada a alumnos y sus familias.

Centraliza la agenda virtual y la consulta de información escolar.

La aplicación debe ofrecer una experiencia sencilla y comprensible para usuarios con diferentes niveles de familiaridad tecnológica.

## 8.2. Perfil alumno

### Inicio

- Resumen escolar.
- Comunicados recientes.
- Notificaciones.
- Información importante.

### Mi horario

- Horario semanal.
- Cursos.
- Horarios por día.

### Mis cursos

- Asignaturas.
- Información de cursos.
- Docentes correspondientes, cuando esté permitido.

### Mi asistencia

- Asistencias.
- Faltas.
- Tardanzas.
- Entradas.
- Salidas.
- Salidas temporales.
- Retornos.

### Mis calificaciones

- Calificaciones por asignatura.
- Resultados por periodo.
- Historial disponible.

### Comunicados

- Comunicados institucionales.
- Avisos dirigidos al alumno.
- Información escolar.

### Notificaciones

- Avisos de asistencia.
- Publicación de notas.
- Nuevos comunicados.
- Información relevante.

### Mi perfil

- Datos personales.
- Fotografía.
- Código escolar.
- Grado.
- Sección.
- Institución.

## 8.3. Perfil apoderado

### Inicio familiar

- Resumen de hijos vinculados.
- Notificaciones.
- Avisos recientes.
- Información importante.

### Selector de hijos

Una cuenta de apoderado puede tener uno o varios hijos.

El usuario puede seleccionar al hijo cuya información desea consultar.

### Asistencia

- Entradas.
- Salidas.
- Tardanzas.
- Faltas.
- Salidas temporales.
- Retornos.

### Horarios

- Horario semanal.
- Cursos.
- Sección.
- Distribución de clases.

### Calificaciones

- Notas por asignatura.
- Resultados por periodo.
- Historial publicado.

### Comunicados

- Información institucional.
- Avisos de docentes autorizados.
- Comunicados dirigidos a la familia.

### Observaciones

- Observaciones registradas.
- Información sobre situaciones escolares.
- Seguimiento disponible.

### Citaciones

- Motivo.
- Fecha.
- Hora.
- Información de la reunión.
- Estado, cuando exista gestión de confirmación.

### Pagos escolares (opcional)

- Conceptos.
- Obligaciones.
- Estados.
- Historial.

### Perfil familiar

- Información de contacto.
- Hijos vinculados.
- Instituciones relacionadas.
- Datos de la cuenta.

## 8.4. Reglas del apoderado

1. Solo puede consultar alumnos vinculados y verificados.
2. Puede tener varios hijos asociados a su cuenta.
3. La información de cada hijo debe mantenerse separada.
4. Los permisos de consulta pueden variar por relación familiar.
5. Un apoderado no puede modificar calificaciones.
6. Un apoderado no puede registrar asistencia por cuenta propia.
7. Un apoderado no puede acceder a información de otros alumnos.
8. Los datos familiares deben ser verificados por la institución.
9. Las notificaciones deben dirigirse únicamente a los destinatarios autorizados.

---

# 9. Autenticación y acceso

## 9.1. Principio general

TTUTIS diferencia tres conceptos:

- Identidad: quién es la persona.
- Autenticación: demostrar que tiene acceso a una cuenta.
- Autorización: determinar qué puede consultar o realizar.

Tener un código válido no significa tener autorización para acceder a cualquier información.

## 9.2. Métodos de inicio de sesión

| Perfil | Identificador |
|---|---|
| Alumno | Código institucional |
| Docente | Código institucional |
| Personal | Código institucional |
| Apoderado | Código global |
| Administrador institucional | Correo electrónico |

Todos utilizan contraseña.

## 9.3. Códigos de acceso

Formato definido:

`^[A-Z][0-9]{8}$`

Ejemplos ilustrativos:

- S78529630
- N52639025
- A70506930
- J71025896

Reglas:

1. El código debe ser único.
2. Debe generarse aleatoriamente.
3. No debe derivarse del DNI.
4. No debe contener información personal inferible.
5. No debe reutilizarse después de revocarse.
6. Debe tener un estado.
7. Debe poder revocarse.
8. El código no sustituye la autorización.

## 9.4. Tipos de códigos

### Código institucional

Se asigna a usuarios cuyo acceso está relacionado con una institución.

Ejemplos:

- Alumno.
- Docente.
- Personal.

Una persona que trabaja o estudia en diferentes instituciones puede tener códigos institucionales distintos asociados a su perfil global.

### Código global

Se asigna a un apoderado y no está limitado a una institución.

Permite que una misma cuenta pueda relacionarse con hijos de diferentes instituciones, siempre que los vínculos estén autorizados.

## 9.5. Contraseñas

- Las contraseñas deben ser administradas por Supabase Auth.
- No deben almacenarse en tablas propias.
- No deben aparecer en registros de actividad.
- Las contraseñas provisionales deben ser seguras.
- Se debe exigir su cambio en el primer acceso cuando se provisionen como temporales.
- Debe existir recuperación segura de acceso.

## 9.6. Resolución de códigos

Supabase Auth no permite iniciar sesión directamente con un código escolar personalizado.

Por ello, el inicio de sesión mediante código requiere un proceso backend:

1. El usuario proporciona código y contraseña.
2. El backend busca el código activo.
3. Resuelve el código a la identidad Auth correspondiente.
4. Verifica que el acceso esté habilitado.
5. Realiza la autenticación mediante Supabase Auth.
6. Devuelve la sesión de autenticación.
7. La aplicación obtiene los datos permitidos según sus permisos.

El proceso debe ejecutarse en backend y protegerse contra enumeración de códigos, intentos automatizados y abuso.

No se deben exponer correos internos de Auth ni claves privilegiadas al frontend.

## 9.7. Provisionamiento de usuarios

Las cuentas iniciales serán creadas por ARCANA o por operadores TTUTIS autorizados.

El proceso contempla:

1. Crear el usuario en Auth.
2. Crear o asociar el perfil.
3. Asociar la identidad personal cuando corresponda.
4. Crear membresía institucional si aplica.
5. Asignar roles y permisos.
6. Generar el código de acceso.
7. Preparar credenciales provisionales.
8. Enviar la información de acceso mediante un canal autorizado.

La Edge Function `provision-user` está iniciada como plantilla, pero su lógica de negocio, autorización y pruebas todavía deben completarse.

## 9.8. Importación masiva

El colegio podrá registrar alumnos y docentes manualmente o mediante archivos CSV/Excel.

Flujo obligatorio:

1. Cargar archivo.
2. Revisar datos.
3. Validar campos.
4. Identificar errores.
5. Mostrar un resumen.
6. Confirmar importación.
7. Crear registros.
8. Preparar cuentas cuando corresponda.
9. Enviar credenciales mediante un proceso controlado.

No se deben enviar credenciales automáticamente por el simple hecho de cargar un archivo.

El envío inicial prioriza correo electrónico. WhatsApp queda fuera del alcance inicial.

---

# 10. Modelo de datos y dominio

## 10.1. Principios

La base de datos debe mantener:

- Identidad global de usuarios.
- Información personal institucional.
- Separación por institución.
- Relaciones familiares.
- Matrículas.
- Asignaciones académicas.
- Registros de asistencia.
- Calificaciones.
- Comunicaciones.
- Identificación QR.
- Control de permisos.

Las tablas institucionales deben incluir su relación con la institución cuando corresponda.

Las relaciones entre entidades institucionales deben validar que pertenezcan a la misma institución.

## 10.2. Identidad y usuarios

Entidades principales:

- `profiles`
- `people`
- `profile_person_links`
- `user_access_codes`
- `institution_memberships`
- `membership_campuses`
- `membership_role_assignments`
- `roles`
- `permissions`
- `role_permissions`

Responsabilidades:

- `profiles`: cuenta global vinculada a Auth.
- `people`: identidad personal dentro de una institución.
- `profile_person_links`: vinculación entre cuenta global e identidad personal.
- `user_access_codes`: códigos de acceso.
- `institution_memberships`: relación del perfil con la institución.
- `membership_campuses`: sedes autorizadas.
- `membership_role_assignments`: roles de la membresía.
- `roles`: roles institucionales.
- `permissions`: permisos disponibles.
- `role_permissions`: permisos asociados a roles.

## 10.3. Alumnos y familias

Entidades principales:

- `students`
- `student_guardians`

Responsabilidades:

- `students`: registro escolar del alumno.
- `student_guardians`: relación entre alumno y apoderado.

La relación familiar contempla permisos específicos:

- Consultar asistencia.
- Consultar calificaciones.
- Consultar observaciones.
- Recibir notificaciones.

El vínculo familiar debe contar con un estado y un proceso de verificación.

## 10.4. Organización académica

Entidades del dominio:

- Años académicos.
- Periodos académicos.
- Grados.
- Secciones.
- Asignaturas.
- Cursos ofrecidos.
- Asignaciones docentes.
- Horarios.
- Matrículas.

El modelo debe permitir organizar el horario de una sección y asignar docentes a las actividades académicas correspondientes.

## 10.5. Matrículas

La matrícula relaciona:

- Institución.
- Año académico.
- Alumno.
- Sección.
- Fechas.
- Estado.

Debe existir como máximo una matrícula activa por alumno y año académico.

Los cambios de sección, traslados y retiros deben conservar el historial correspondiente.

## 10.6. Asistencia

El dominio de asistencia contempla:

- Eventos.
- Registros por alumno.
- Dispositivos autorizados, cuando corresponda.
- Ajustes.
- Responsables de registro.
- Revisiones.

Los tipos de movimiento definidos son:

- `ENTRY`: ingreso.
- `EXIT`: salida.
- `TEMP_EXIT`: salida temporal.
- `RETURN`: retorno.

Los nombres de las tablas físicas y sus relaciones deben verificarse contra las migraciones vigentes antes de crear o modificar estructuras.

## 10.7. Calificaciones

El modelo debe contemplar:

- Alumno.
- Asignatura.
- Curso.
- Periodo.
- Calificación.
- Responsable del registro.
- Fecha.
- Estado de publicación.

Las escalas de evaluación deben poder configurarse por institución.

## 10.8. Comunicaciones

El dominio de comunicaciones contempla:

- Comunicados.
- Autor.
- Institución.
- Destinatarios.
- Grados.
- Secciones.
- Fecha de publicación.
- Estado.
- Historial.

La segmentación debe impedir que un usuario consulte comunicaciones fuera de su alcance.

## 10.9. Carnets y QR

El dominio debe permitir:

- Identificar al alumno.
- Emitir credenciales.
- Asociar QR.
- Registrar estado.
- Revocar credenciales.
- Gestionar reposiciones.

El QR debe contener un token opaco, aleatorio y no información personal del alumno.

No debe contener DNI, nombres, apellidos, fecha de nacimiento ni datos privados.

## 10.10. Pagos escolares

Módulo opcional.

Debe mantenerse separado de los cobros que ARCANA realiza al colegio por el servicio TTUTIS.

Los pagos escolares pertenecen a la relación económica entre el colegio y las familias.

La facturación del SaaS pertenece a la relación comercial entre ARCANA y el colegio.

---

# 11. Reglas de negocio generales

## 11.1. Aislamiento institucional

1. Cada institución administra su propia información.
2. Un usuario no puede acceder a datos de otra institución sin una relación autorizada.
3. Las consultas deben considerar el contexto institucional.
4. Las relaciones entre entidades deben validar la institución.
5. La aplicación no debe confiar en un `institution_id` enviado por el cliente sin comprobar la autorización.

## 11.2. Usuarios globales

1. Un perfil representa una cuenta global.
2. Una cuenta puede relacionarse con varias identidades personales.
3. Un perfil puede tener membresías en varias instituciones.
4. Cada membresía puede tener diferentes roles.
5. El usuario debe acceder únicamente a los datos autorizados.

## 11.3. Estados

Los estados deben utilizar valores controlados.

Ejemplos:

- Activo.
- Inactivo.
- Pendiente.
- Suspendido.
- Revocado.
- Verificado.
- Rechazado.

No se deben utilizar textos libres para representar estados que controlan operaciones importantes.

## 11.4. Eliminación

La información académica y administrativa debe conservar trazabilidad.

No se deben eliminar registros históricos de asistencia, calificaciones o matrículas de forma que se pierda la historia institucional.

Cuando corresponda, se utilizarán estados de inactividad, retiro, revocación o eliminación lógica.

---

# 12. Reglas de negocio académicas

## 12.1. Año académico

Cada institución administra sus propios años académicos.

Un año académico puede tener:

- Fecha de inicio.
- Fecha de finalización.
- Estado.
- Periodos de evaluación.

Los periodos deben pertenecer al año académico correspondiente.

## 12.2. Grados y secciones

Una sección pertenece a un grado y una institución.

Los alumnos se matriculan en una sección para un año académico determinado.

## 12.3. Asignaturas y cursos

Una asignatura representa una materia académica.

La oferta de cursos organiza esa asignatura dentro de un año, grado o sección según el modelo académico definido.

## 12.4. Docentes

Un docente puede tener diferentes asignaciones académicas.

Solo puede consultar y gestionar los cursos y secciones autorizados.

## 12.5. Horarios

El horario corresponde a una sección.

Debe contemplar:

- Día.
- Hora de inicio.
- Hora de finalización.
- Curso o asignatura.
- Docente asignado.
- Sección.

No se deben permitir conflictos de horarios sin una regla explícita que los autorice.

## 12.6. Matrículas

- Un alumno debe pertenecer a una institución.
- La matrícula corresponde a un año académico.
- Debe tener una sección válida.
- No puede existir más de una matrícula activa del mismo alumno en el mismo año académico.
- Los cambios deben conservar el historial.
- El estado de matrícula determina la participación escolar correspondiente.

## 12.7. Calificaciones

- Solo usuarios autorizados pueden registrar calificaciones.
- El registro debe corresponder a un alumno, curso y periodo válidos.
- La escala depende de la institución.
- Los padres y alumnos solo consultan resultados publicados y autorizados.
- Las modificaciones posteriores deben ser trazables.
- No se deben permitir notas fuera de los límites de la escala configurada.

---

# 13. Reglas de negocio de asistencia

## 13.1. Tipos de eventos

| Código | Descripción |
|---|---|
| ENTRY | Ingreso al colegio |
| EXIT | Salida del colegio |
| TEMP_EXIT | Salida temporal |
| RETURN | Retorno al colegio |

## 13.2. Registro

1. Solo usuarios o dispositivos autorizados pueden registrar eventos.
2. El alumno debe estar identificado.
3. El registro debe pertenecer a la institución correcta.
4. El evento debe registrar fecha y hora.
5. Debe identificarse al responsable o dispositivo que lo registró.
6. El backend valida la operación antes de confirmar el registro.
7. Los registros deben conservar su historial.

## 13.3. Secuencia de movimientos

La lógica debe considerar el último estado válido del alumno.

Ejemplo:

`ENTRY → TEMP_EXIT → RETURN → EXIT`

No se debe aceptar una secuencia incoherente sin una autorización o corrección explícita.

Las reglas exactas de secuencia y las excepciones deben configurarse y validarse antes de producción.

## 13.4. Notificaciones

Después de validar un movimiento, el sistema podrá notificar a los apoderados autorizados.

La notificación debe:

- Corresponder al alumno correcto.
- Respetar los permisos familiares.
- Informar el tipo de movimiento.
- Indicar fecha y hora.
- Evitar duplicados cuando el mismo evento se procese más de una vez.

## 13.5. Correcciones

Una corrección debe:

- Ser realizada por un usuario autorizado.
- Tener un motivo.
- Identificar al responsable.
- Conservar el registro original o su trazabilidad.
- Registrar fecha de modificación.

---

# 14. Reglas de negocio familiares

## 14.1. Relación apoderado-alumno

Un alumno puede tener uno o varios apoderados.

Un apoderado puede estar relacionado con uno o varios alumnos.

Cada relación tiene un estado:

- `PENDING`
- `ACTIVE`
- `REJECTED`
- `REVOKED`

## 14.2. Verificación

Un vínculo familiar no debe considerarse autorizado únicamente porque alguien lo solicite.

Debe existir un proceso de verificación institucional.

## 14.3. Permisos familiares

Cada relación puede controlar:

- Consulta de asistencia.
- Consulta de calificaciones.
- Consulta de observaciones.
- Recepción de notificaciones.

Los permisos deben verificarse tanto en las consultas como en las notificaciones.

## 14.4. Varias instituciones

Una cuenta global de apoderado puede estar relacionada con alumnos de diferentes instituciones.

La información debe mantenerse separada por institución y por alumno.

---

# 15. Reglas de negocio de carnets

## 15.1. Identificación

Cada carnet representa una credencial de identificación escolar.

Debe incluir información suficiente para identificar al alumno sin exponer datos personales innecesarios.

## 15.2. QR

El QR utiliza un token aleatorio y opaco.

El sistema resuelve el token en backend y verifica:

- Que exista.
- Que esté activo.
- Que no esté revocado.
- Que corresponda a un alumno.
- Que pertenezca a la institución correspondiente.
- Que el usuario que lo escanea tenga permiso para la operación solicitada.

## 15.3. Reposición

Cuando se pierde un carnet:

1. Se registra la solicitud.
2. Se invalida la credencial anterior.
3. Se genera un nuevo token.
4. Se prepara el nuevo carnet.
5. Se registra la emisión.
6. El nuevo carnet queda activo.

El QR anterior no debe seguir siendo válido para operaciones nuevas.

## 15.4. Diseño

El carnet contempla:

- PVC.
- Dimensiones aproximadas de 54 × 86 mm.
- Espesor de referencia de 0.76 mm.
- Diseño institucional personalizado.
- Fotografía.
- Nombres y apellidos.
- Código escolar.
- Grado y sección.
- QR en la parte posterior.

El costo de impresión estimado inicialmente es S/ 1 por unidad para un lote de 1,000 unidades. Es un supuesto comercial sujeto a cotización y validación de producción.

---

# 16. Reglas de comunicaciones y notificaciones

## 16.1. Comunicados

Un comunicado debe definir:

- Autor.
- Institución.
- Contenido.
- Fecha.
- Estado.
- Destinatarios.
- Alcance.

## 16.2. Destinatarios

Se puede dirigir información a:

- Toda la institución.
- Una sede.
- Un grado.
- Una sección.
- Docentes.
- Alumnos.
- Apoderados.

La segmentación debe respetar las autorizaciones.

## 16.3. Notificaciones

Las notificaciones pueden originarse por:

- Asistencia.
- Calificaciones.
- Comunicados.
- Citaciones.
- Observaciones.
- Otras actividades institucionales.

No toda modificación de datos debe generar una notificación.

La institución debe poder controlar qué eventos son relevantes para los usuarios.

## 16.4. Correo electrónico

El correo se utilizará inicialmente para:

- Enviar accesos.
- Comunicar credenciales provisionales.
- Recuperación de cuenta, mediante el flujo correspondiente.
- Comunicaciones institucionales cuando el servicio esté habilitado.

El envío debe realizarse mediante un proveedor transaccional apropiado, evitando el uso de correo personal como sistema masivo.

WhatsApp no forma parte del alcance inicial.

---

# 17. Módulo de pagos escolares

## 17.1. Naturaleza

El módulo de pagos escolares es opcional.

No debe ser requisito para utilizar las funciones principales de TTUTIS.

## 17.2. Funciones previstas

- Conceptos de pago.
- Obligaciones.
- Estados.
- Historial.
- Consultas por alumno.
- Reportes institucionales.

## 17.3. Separación comercial

Existen dos relaciones económicas diferentes:

**Colegio → Familia**

Pagos por conceptos escolares definidos por el colegio.

**Colegio → ARCANA CORP**

Pago por el uso de TTUTIS y los servicios contratados.

No deben mezclarse sus registros, estados ni reportes.

---

# 18. Seguridad y privacidad

## 18.1. Principios

- Mínimo privilegio.
- Aislamiento institucional.
- Validación en backend.
- Protección de información personal.
- Trazabilidad de operaciones.
- Acceso únicamente autorizado.
- Gestión segura de credenciales.

## 18.2. Row Level Security

Las tablas que contienen información institucional deben contar con políticas RLS apropiadas.

No es suficiente habilitar RLS: deben existir políticas que permitan únicamente las operaciones autorizadas.

Se debe verificar:

- SELECT.
- INSERT.
- UPDATE.
- DELETE.

Las políticas deben considerar institución, perfil, membresía, rol, permisos, sede y relaciones correspondientes.

## 18.3. Service Role

La clave `service_role`:

- No debe incluirse en frontend.
- No debe enviarse a aplicaciones móviles.
- No debe incluirse en repositorios.
- Solo debe utilizarse en entornos backend protegidos.

## 18.4. Datos personales

La plataforma administra información de menores de edad.

Se debe aplicar especial cuidado a:

- DNI.
- Fotografías.
- Información de contacto.
- Calificaciones.
- Asistencia.
- Relaciones familiares.
- Observaciones.
- Información académica.

El QR no debe revelar directamente estos datos.

El tratamiento de información debe cumplir las obligaciones de protección de datos personales aplicables en Perú, incluyendo las reglas específicas para información de menores.

## 18.5. Auditoría

Deben registrarse las operaciones sensibles:

- Cambios de roles.
- Modificaciones de matrícula.
- Correcciones de asistencia.
- Modificaciones de calificaciones.
- Emisión y revocación de carnets.
- Cambios de relaciones familiares.
- Acciones administrativas relevantes.

La auditoría debe permitir conocer quién realizó una operación y cuándo.

---

# 19. Modelo de permisos

La autorización debe resolverse mediante la combinación de:

1. Perfil.
2. Membresía.
3. Institución.
4. Sede.
5. Rol.
6. Permiso.
7. Relación con el recurso solicitado.

Ejemplo:

Un docente no puede consultar cualquier alumno simplemente por tener el rol DOCENTE.

También debe existir una asignación que lo relacione con el curso o sección correspondiente.

Un apoderado no puede consultar cualquier alumno por tener el rol APODERADO.

Debe existir una relación familiar verificada y permisos de consulta vigentes.

Un administrador de una institución no debe poder consultar automáticamente los datos de otra institución.

---

# 20. Modelo comercial relacionado con el producto

## 20.1. Oferta

TTUTIS se comercializa como una solución compuesta por:

- Carnet PVC personalizado.
- Aplicación escolar.
- Agenda virtual.
- Seguimiento familiar.
- Herramientas institucionales.

## 20.2. Precio

La tarifa por alumno, la participación económica del colegio y las condiciones de reposición deben definirse comercialmente.

Como referencia de análisis inicial:

- Agenda física tradicional: S/ 10–15.
- Impresión de carnet: costo estimado S/ 1.
- Software: referencia inicial de S/ 1 por alumno al mes.
- Precio de paquete: escenarios preliminares de S/ 12 y S/ 15 anuales.

Estos importes no constituyen una tarifa final aprobada.

## 20.3. Reposición

La reposición puede ser cobrada por el colegio bajo una tarifa definida.

Debe contemplar el costo de impresión, gestión y entrega, además de la participación que se acuerde.

---

# 21. Estado actual del proyecto

Esta sección distingue el trabajo existente de las funcionalidades planificadas.

## 21.1. Infraestructura y base de datos

Estado conocido:

- Proyecto Supabase TTUTIS creado y vinculado mediante CLI.
- Proyecto independiente de otros productos de ARCANA.
- Esquema institucional y de usuarios existente.
- Entidades de perfiles y personas.
- Códigos de acceso.
- Membresías.
- Roles y permisos.
- Entidades de alumnos y matrículas.
- Relaciones familiares.
- Información académica y asistencia en el modelo de datos.

## 21.2. Datos de demostración

Se prepararon datos ficticios para una institución de prueba:

- Institución: Colegio Demo TTUTIS.
- Sede: Sede Principal.
- Año académico de demostración: 2027.
- Cinco grados de secundaria.
- Veinte secciones.
- Diez asignaturas.
- Doscientas ofertas de cursos.
- Diez docentes ficticios.
- Ochocientos alumnos.
- Ochocientos apoderados ficticios.
- Ochocientas relaciones familiares pendientes de verificación.

Los datos de demostración no representan cuentas reales ni información de un colegio operativo.

Los correos `.invalid` utilizados en los datos ficticios no son direcciones válidas de envío.

## 21.3. Autenticación

- Supabase Auth forma parte de la arquitectura.
- Se definió el uso de códigos institucionales y globales.
- Se definió el acceso administrativo por correo.
- El proceso de login por código requiere implementación backend.
- La Edge Function `provision-user` fue creada como plantilla.
- Su autorización y lógica de provisión todavía deben completarse.
- No se debe considerar terminado el proceso de creación de usuarios.

## 21.4. Roles y permisos

La estructura de roles y permisos existe en el modelo conocido.

La carga definitiva de roles, asignación de permisos y validación de políticas debe completarse y probarse.

La existencia de tablas no demuestra que las funciones de autorización estén terminadas.

## 21.5. Aplicaciones

Las tres plataformas constituyen el alcance funcional del producto:

- TTUTIS Admin.
- TTUTIS Docente.
- TTUTIS Alumno/Apoderado.

Su grado de implementación debe verificarse individualmente en los respectivos repositorios.

## 21.6. Funciones pendientes de completar

- Provisionamiento seguro de usuarios.
- Autenticación por código.
- Roles y permisos definitivos.
- Políticas RLS verificadas.
- Flujo de importación y envío de credenciales.
- Vinculación y verificación de apoderados.
- Emisión y reposición de carnets.
- Validación del QR.
- Notificaciones de asistencia.
- Pruebas integrales de las tres plataformas.
- Preparación para producción.

---

# 22. Alcance del MVP

El MVP debe concentrarse en las operaciones necesarias para poner en marcha un colegio piloto.

## Prioridad 1 — Esencial

- Institución.
- Usuarios.
- Alumnos.
- Apoderados.
- Docentes.
- Grados y secciones.
- Asignaturas.
- Horarios.
- Matrículas.
- Asistencia.
- Calificaciones.
- Comunicados.
- Carnets QR.
- Perfiles y permisos.
- Notificaciones principales.

## Prioridad 2 — Complementaria

- Reportes avanzados.
- Gestión ampliada de observaciones.
- Citaciones con seguimiento.
- Personalización avanzada.
- Herramientas adicionales para dirección.

## Prioridad 3 — Opcional

- Pagos escolares.
- Reportes avanzados adicionales.
- Integraciones externas.
- Automatizaciones adicionales.

La prioridad de implementación debe basarse en las necesidades del colegio piloto y no en la cantidad de funcionalidades que puedan añadirse.

---

# 23. Pruebas y criterios de aceptación

Antes de considerar TTUTIS listo para producción, se deben validar los siguientes escenarios.

## 23.1. Instituciones

- Un colegio puede acceder a su información.
- Un colegio no puede consultar información de otro.
- Las sedes respetan el alcance de acceso.
- Los administradores solo realizan operaciones autorizadas.

## 23.2. Usuarios

- Se puede crear un perfil.
- Se puede vincular una identidad personal.
- Se puede crear una membresía.
- Se puede asignar un rol.
- Se puede revocar un código.
- Se puede bloquear una cuenta.
- Un usuario no autorizado no puede ingresar.

## 23.3. Familias

- Un apoderado puede tener varios hijos.
- Solo puede consultar hijos vinculados y verificados.
- Los permisos familiares se respetan.
- Los vínculos revocados dejan de permitir acceso.

## 23.4. Alumnos

- El alumno consulta su propio horario.
- El alumno consulta sus propias calificaciones publicadas.
- El alumno consulta su propia asistencia.
- No puede consultar información de otros alumnos.

## 23.5. Docentes

- El docente consulta sus asignaciones.
- Solo gestiona sus cursos autorizados.
- No modifica información fuera de sus permisos.
- Las operaciones sensibles quedan registradas.

## 23.6. Asistencia

- El QR identifica al alumno.
- Se validan credenciales.
- Se verifica la autorización del operador.
- Los eventos se registran correctamente.
- Se respeta la secuencia de movimientos.
- Las notificaciones llegan a los apoderados autorizados.
- Las correcciones conservan trazabilidad.

## 23.7. Carnets

- Cada alumno tiene una credencial propia.
- El QR no revela datos personales.
- El QR revocado deja de funcionar.
- La reposición genera una credencial nueva.
- El carnet pertenece a la institución correcta.

## 23.8. Seguridad

- Las políticas RLS están probadas.
- No se expone `service_role`.
- No se almacenan contraseñas propias.
- Las funciones privilegiadas validan autorización.
- Los datos de un colegio no son accesibles desde otro.
- Los intentos de acceso indebidos son controlados.

---

# 24. Despliegue y operación

## 24.1. Entornos

Se recomienda separar:

- Desarrollo.
- Pruebas.
- Producción.

No se deben utilizar datos reales de alumnos en pruebas sin las medidas de protección correspondientes.

## 24.2. Variables de entorno

Ejemplos de nombres de variables para las aplicaciones:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Las claves privadas deben configurarse únicamente en los entornos backend correspondientes.

No se deben subir archivos `.env` con secretos a Git.

## 24.3. Supabase CLI

El proyecto ya fue vinculado mediante Supabase CLI.

Comandos de referencia:

```powershell
npx supabase login

npx supabase projects list

npx supabase link --project-ref eeybnagdnlmiazdyvylp
```

Las migraciones deben mantenerse versionadas y aplicarse de forma controlada.

No ejecutar cambios destructivos directamente en producción.

## 24.4. Edge Functions

Las funciones Edge deben encargarse de operaciones que requieren validación o privilegios de backend.

Ejemplos:

- Provisionamiento de usuarios.
- Inicio de sesión mediante código.
- Emisión de credenciales.
- Operaciones sensibles sobre carnets.
- Procesos de notificación.

Cada función debe validar:

- Identidad.
- Autorización.
- Datos recibidos.
- Institución.
- Estado del recurso.
- Resultado de la operación.

## 24.5. Copias de seguridad

La operación de producción debe contar con una estrategia de respaldo y recuperación de datos.

La frecuencia, retención y pruebas de restauración deben definirse antes de la puesta en marcha.

---

# 25. Reglas de desarrollo y mantenimiento

1. No crear tablas duplicadas para resolver el mismo problema.
2. Revisar el esquema vigente antes de proponer migraciones.
3. No asumir que una tabla existente representa una funcionalidad terminada.
4. No asumir que RLS está correctamente configurado por estar habilitado.
5. Mantener las reglas sensibles en backend.
6. No confiar en datos de autorización enviados por el frontend.
7. Mantener las relaciones institucionales.
8. Utilizar nombres y estados consistentes.
9. Registrar cambios importantes.
10. Evitar microservicios en el MVP.
11. Mantener un backend centralizado y modular.
12. No introducir infraestructura adicional sin una necesidad demostrable.
13. No modificar datos de producción para realizar pruebas.
14. Mantener separados los datos reales y los datos demo.
15. Toda nueva funcionalidad debe tener reglas de negocio y criterios de aceptación.

---

# 26. Glosario

| Término | Significado |
|---|---|
| Institución | Colegio que utiliza TTUTIS |
| Sede | Local perteneciente a una institución |
| Persona | Identidad personal dentro de una institución |
| Perfil | Cuenta global de usuario |
| Membresía | Relación de un perfil con una institución |
| Rol | Conjunto de responsabilidades |
| Permiso | Acción autorizada |
| Alumno | Estudiante registrado |
| Apoderado | Persona autorizada para representar o acompañar al alumno |
| Matrícula | Relación del alumno con un año académico y sección |
| Periodo | División del año académico |
| Asignatura | Materia escolar |
| Curso | Oferta académica organizada |
| Asistencia | Registro de movimientos o presencia del alumno |
| Comunicado | Información publicada por el colegio |
| Carnet | Identificación física del alumno |
| QR | Código de identificación asociado a una credencial |
| Reposición | Emisión de un nuevo carnet |
| RLS | Seguridad de acceso a nivel de filas |
| Edge Function | Función ejecutada en backend |

---

# 27. Decisiones que requieren aprobación

Este documento consolida las decisiones conocidas, pero los siguientes puntos deben quedar aprobados antes de producción:

- Catálogo definitivo de roles y permisos.
- Política de acceso por sede.
- Secuencia exacta de movimientos de asistencia.
- Reglas para correcciones de asistencia.
- Escalas de calificación por institución.
- Flujo final de recuperación de contraseña.
- Proceso de verificación familiar.
- Política de conservación de información.
- Diseño y proceso de impresión de carnets.
- Proveedor de correo transaccional.
- Servicio de notificaciones móviles.
- Precio comercial definitivo.
- Política de soporte y disponibilidad.
- Funciones exactas incluidas en el lanzamiento.

---

# 28. Visión final

TTUTIS busca convertirse en la plataforma digital que conecta a toda una comunidad educativa.

Con TTUTIS Admin, el colegio administra su institución.

Con TTUTIS Docente, los docentes y el personal autorizado gestionan sus actividades.

Con TTUTIS Alumno/Apoderado, los estudiantes y sus familias consultan la información escolar y mantienen una comunicación más cercana con el colegio.

Las tres plataformas comparten un solo sistema, una misma fuente de información y reglas de seguridad consistentes.

El producto no debe convertirse en un conjunto de herramientas aisladas. Debe funcionar como una solución educativa integrada, sencilla para sus usuarios y preparada para crecer a múltiples instituciones.

**TTUTIS — Tu colegio, más conectado.**

Desarrollado por **ARCANA CORP**.