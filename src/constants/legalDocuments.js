const dataProtectionLaw = {
    label: "Ley N.° 29733 — Ley de Protección de Datos Personales",
    href: "https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/243470-29733",
};

const dataProtectionRegulation = {
    label: "Decreto Supremo N.° 016-2024-JUS — Reglamento de la Ley N.° 29733",
    href: "https://www.gob.pe/institucion/anpd/normas-legales/6554453-16-2024-jus",
};

export const legalDocuments = [
    {
        id: "terms",
        title: "Términos y condiciones de uso",
        summary: "Reglas para el acceso y uso de TTUTIS Admin.",
        sections: [
            {
                title: "1. Alcance del servicio",
                paragraphs: [
                    "TTUTIS Admin es una herramienta de gestión institucional para centros educativos que contratan o reciben autorización para utilizar la plataforma. Sus funciones disponibles dependen del plan, configuración y permisos asignados a cada institución.",
                    "Estos términos regulan el acceso de administradores y personal autorizado. La relación entre la institución, sus estudiantes y sus familias se complementa con las condiciones y avisos que la propia institución debe comunicar.",
                ],
            },
            {
                title: "2. Cuentas y seguridad",
                paragraphs: [
                    "Cada persona debe utilizar su propia cuenta, mantener sus credenciales en reserva y cerrar sesión en equipos compartidos. Las acciones realizadas con una cuenta se atribuyen a su titular, salvo que se comunique y verifique un acceso no autorizado.",
                    "La institución administra las membresías, roles y permisos de sus usuarios. Debe retirar los accesos cuando una persona deje de estar autorizada y revisar periódicamente las cuentas activas.",
                ],
            },
            {
                title: "3. Uso aceptable",
                bullets: [
                    "Utilizar la plataforma únicamente para fines educativos y administrativos autorizados.",
                    "No acceder a datos de otra institución ni intentar evadir los controles de acceso.",
                    "No cargar información ilícita, engañosa o que no se esté autorizado a tratar.",
                    "No interferir con la seguridad, disponibilidad o funcionamiento de TTUTIS.",
                    "Verificar la exactitud de los datos antes de registrar pagos, asistencia, calificaciones o comunicaciones.",
                ],
            },
            {
                title: "4. Información institucional",
                paragraphs: [
                    "La institución es responsable de definir qué información escolar incorpora, quién puede consultarla y con qué finalidad. También debe contar con las autorizaciones, bases legales y avisos que correspondan, especialmente cuando trate datos de menores de edad.",
                    "ARCANA CORP brinda la plataforma y sus servicios asociados de acuerdo con las condiciones comerciales y de tratamiento de datos aplicables a la institución.",
                ],
            },
            {
                title: "5. Propiedad intelectual",
                paragraphs: [
                    "TTUTIS, su software, diseño, marcas y documentación pertenecen a ARCANA CORP S.A.C., RUC 20612123901. El acceso no transfiere propiedad ni concede una licencia pública. El uso se limita a las personas e instituciones expresamente autorizadas.",
                ],
            },
            {
                title: "6. Disponibilidad y cambios",
                paragraphs: [
                    "Las funciones pueden actualizarse, mantenerse o variar para proteger la seguridad y mejorar el servicio. Se informarán los cambios relevantes a través de los canales disponibles. Ningún servicio tecnológico se garantiza sin interrupciones; el soporte y los compromisos de disponibilidad se rigen por el acuerdo aplicable con la institución.",
                ],
            },
            {
                title: "7. Suspensión y consultas",
                paragraphs: [
                    "El acceso puede suspenderse cuando la cuenta pierda autorización, exista una amenaza de seguridad o el uso incumpla las condiciones aplicables. Las consultas sobre el acceso institucional deben dirigirse al administrador de la institución o al canal oficial de soporte TTUTIS.",
                ],
            },
        ],
        references: [dataProtectionLaw, dataProtectionRegulation],
    },
    {
        id: "privacy",
        title: "Política de privacidad",
        summary: "Información sobre los datos tratados al utilizar TTUTIS.",
        sections: [
            {
                title: "1. Responsable y contexto del tratamiento",
                paragraphs: [
                    "ARCANA CORP S.A.C. (RUC 20612123901) desarrolla y opera TTUTIS. En la gestión de expedientes escolares, la institución usuaria define los fines y la información que incorpora; los roles y responsabilidades de cada parte se precisan en el contrato y en los acuerdos de tratamiento aplicables.",
                    "Para administrar una cuenta, proteger la plataforma y prestar soporte, ARCANA puede tratar datos de cuenta y seguridad conforme a la relación de servicio correspondiente.",
                ],
            },
            {
                title: "2. Datos que pueden tratarse",
                bullets: [
                    "Datos de cuenta: nombre, correo, credenciales protegidas, rol y membresías institucionales.",
                    "Datos de uso y seguridad: actividad necesaria para autenticación, control de acceso, soporte y prevención de usos no autorizados.",
                    "Datos escolares que administra la institución: matrícula, asistencia, aulas, pagos, calificaciones y comunicaciones.",
                    "Datos de contacto y relaciones familiares que la institución registra para prestar sus servicios educativos.",
                ],
            },
            {
                title: "3. Finalidades",
                bullets: [
                    "Crear y proteger cuentas, autenticar usuarios y aplicar los permisos institucionales.",
                    "Permitir que la institución gestione sus actividades educativas y administrativas.",
                    "Enviar mensajes operativos, como invitaciones de acceso y avisos relacionados con la cuenta.",
                    "Atender solicitudes de soporte, mantener la seguridad y diagnosticar errores.",
                    "Cumplir obligaciones legales y contractuales aplicables.",
                ],
            },
            {
                title: "4. Proveedores y transferencias",
                paragraphs: [
                    "TTUTIS utiliza Supabase para servicios de autenticación y base de datos, y Resend para el envío de invitaciones por correo. La ubicación de los servicios, las condiciones de transferencia y los proveedores vigentes dependen de la configuración y los contratos aplicables; ARCANA debe mantener esa información actualizada en el aviso institucional correspondiente.",
                    "Los datos no se venden. El acceso por proveedores se limita a prestar, proteger o mantener los servicios contratados, sujeto a los acuerdos aplicables.",
                ],
            },
            {
                title: "5. Conservación y seguridad",
                paragraphs: [
                    "Los datos se conservan durante el tiempo necesario para prestar el servicio, cumplir obligaciones y mantener los registros escolares que corresponden a la institución. Los plazos concretos deben definirse en los acuerdos con la institución y las reglas aplicables.",
                    "TTUTIS aplica controles de acceso por usuario, rol e institución. Ningún sistema puede prometer seguridad absoluta; las consultas o sospechas de acceso no autorizado deben reportarse inmediatamente al administrador institucional y al soporte oficial.",
                ],
            },
            {
                title: "6. Derechos y solicitudes",
                paragraphs: [
                    "Las solicitudes sobre información escolar —por ejemplo, acceso, rectificación, cancelación u oposición— deben dirigirse primero a la institución que administra esos datos. Las solicitudes relacionadas con una cuenta TTUTIS pueden canalizarse mediante el administrador institucional o el canal oficial de soporte. La institución y ARCANA atenderán cada solicitud según sus funciones y las normas aplicables.",
                    "Cuando los datos correspondan a menores, la institución debe gestionar las solicitudes de sus representantes de acuerdo con la normativa aplicable y sus procedimientos de verificación.",
                ],
            },
            {
                title: "7. Datos de contacto pendientes de completar",
                paragraphs: [
                    "Antes de publicar esta política como versión definitiva, ARCANA debe añadir un correo de privacidad, domicilio o canal formal de atención, y confirmar la ubicación de los datos, plazos de conservación, proveedores vigentes y procedimiento para solicitudes de derechos.",
                ],
            },
        ],
        references: [dataProtectionLaw, dataProtectionRegulation],
    },
    {
        id: "data",
        title: "Política de tratamiento de datos",
        summary: "Criterios de acceso, uso, conservación y cuidado de la información escolar.",
        sections: [
            {
                title: "1. Principios de tratamiento",
                bullets: [
                    "Usar los datos para una finalidad educativa o administrativa autorizada.",
                    "Solicitar y mantener únicamente información adecuada para esa finalidad.",
                    "Limitar el acceso al mínimo necesario según el rol y la institución.",
                    "Mantener la información razonablemente exacta y corregirla cuando corresponda.",
                    "Proteger especialmente los datos de niñas, niños y adolescentes.",
                ],
            },
            {
                title: "2. Responsabilidades de la institución",
                bullets: [
                    "Definir la finalidad y las personas autorizadas para tratar cada dato escolar.",
                    "Informar a estudiantes y familias sobre el tratamiento de sus datos y el uso de TTUTIS.",
                    "Revisar y retirar permisos cuando cambie la relación de una persona con la institución.",
                    "Verificar los datos antes de registrar pagos, observaciones, asistencia o información académica.",
                    "Atender las solicitudes de titulares y representantes relacionadas con sus registros escolares.",
                ],
            },
            {
                title: "3. Responsabilidades de las personas usuarias",
                bullets: [
                    "No compartir credenciales ni consultar expedientes fuera de sus funciones.",
                    "Usar los datos únicamente para prestar servicios educativos autorizados.",
                    "Reportar errores, pérdida de credenciales o posibles incidentes de seguridad.",
                    "No descargar, divulgar o conservar copias fuera de los procedimientos institucionales.",
                ],
            },
            {
                title: "4. Menores de edad y datos sensibles",
                paragraphs: [
                    "Los registros de estudiantes pueden incluir datos personales de menores, familiares, asistencia, desempeño académico y pagos. Deben tratarse con especial reserva. La institución debe verificar que las autorizaciones, avisos y permisos de acceso correspondan a cada finalidad y a la relación familiar registrada.",
                ],
            },
            {
                title: "5. Conservación, exportación y eliminación",
                paragraphs: [
                    "La institución define los plazos de conservación de sus registros según sus obligaciones y acuerdos de servicio. Las solicitudes de exportación, rectificación o eliminación deben ser verificadas por la institución antes de ejecutarse para preservar la integridad académica, financiera y legal de los registros.",
                ],
            },
            {
                title: "6. Incidentes",
                paragraphs: [
                    "Ante la sospecha de acceso, pérdida o divulgación no autorizada, el usuario debe avisar de inmediato al administrador de la institución y al soporte TTUTIS. La evaluación, documentación y notificación del incidente se realizarán conforme a las obligaciones y plazos aplicables a cada parte.",
                ],
            },
        ],
        references: [dataProtectionLaw, dataProtectionRegulation],
    },
    {
        id: "cookies",
        title: "Cookies y tecnologías de sesión",
        summary: "Uso de almacenamiento necesario para mantener la sesión iniciada.",
        sections: [
            {
                title: "Uso esencial",
                paragraphs: [
                    "TTUTIS utiliza tecnologías de sesión para autenticar a las personas, mantener el acceso seguro y recordar el estado de inicio de sesión. Si se bloquean, algunas funciones protegidas pueden dejar de funcionar.",
                    "Esta pantalla no declara el uso de herramientas publicitarias o analíticas. Si se incorporan en el futuro, este aviso debe actualizarse para identificarlas y explicar sus controles.",
                ],
            },
        ],
        references: [],
    },
    {
        id: "license",
        title: "Licencia y propiedad del software",
        summary: "Titularidad y límites de uso de TTUTIS.",
        sections: [
            {
                title: "Titularidad",
                paragraphs: [
                    "TTUTIS Admin, su software, diseño, marca, estructura, contenidos y documentación son propiedad de ARCANA CORP S.A.C., RUC 20612123901 (ARCANA CORP).",
                    "El acceso a la plataforma no concede una licencia pública ni transfiere derechos de propiedad intelectual. Solo pueden utilizarla la compañía y las personas o instituciones expresamente autorizadas por ARCANA CORP.",
                ],
            },
            {
                title: "Usos no autorizados",
                bullets: [
                    "Copiar, modificar, adaptar, publicar o distribuir el software sin autorización escrita.",
                    "Sublicenciar, vender, ceder o explotar la plataforma como servicio para terceros.",
                    "Crear obras derivadas o intentar obtener el código o componentes protegidos sin autorización.",
                ],
            },
        ],
        references: [],
    },
];
