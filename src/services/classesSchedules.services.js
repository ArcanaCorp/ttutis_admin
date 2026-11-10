import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

export const CLASS_SCHEDULES_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const CLASS_SCHEDULES_MAX_ROWS = 500;

const tables = {
    classroom: "classrooms",
    subject: "subjects",
    assignment: "course_assignments",
    schedule: "schedules",
};

export async function createAcademicRecords(institutionId, kind, values) {
    if (!institutionId || !tables[kind]) return { data: null, error: new Error("No se pudo identificar el tipo de registro o la institución.") };
    return createClient().from(tables[kind]).insert(values.map(value => ({ ...value, institution_id: institutionId }))).select("*");
}

export async function updateAcademicRecord(institutionId, kind, id, values) {
    if (!institutionId || !tables[kind] || !id) return { data: null, error: new Error("No se pudo identificar el registro que deseas actualizar.") };
    return createClient().from(tables[kind]).update(values).eq("id", id).eq("institution_id", institutionId).select("*").single();
}

export async function removeAcademicRecord(institutionId, kind, id) {
    if (!institutionId || !tables[kind] || !id) return { error: new Error("No se pudo identificar el registro que deseas eliminar.") };
    return createClient().from(tables[kind]).delete().eq("id", id).eq("institution_id", institutionId);
}

const normalize = value => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE").replace(/[\s-]+/g, "_");
const cellText = value => String(value ?? "").trim();

export async function readAcademicWorkbook(file, kind, context) {
    if (["classroom", "assignment", "schedule"].includes(kind) && !context.academicYearId) throw new Error("Selecciona o crea un año escolar antes de importar estos registros.");
    if (!file) throw new Error("Selecciona un archivo Excel.");
    if (!/\.xlsx?$/i.test(file.name)) throw new Error("El archivo debe tener formato .xlsx o .xls.");
    if (file.size > CLASS_SCHEDULES_MAX_FILE_SIZE) throw new Error("El archivo no puede superar los 5 MB.");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("El archivo no contiene una hoja con datos.");
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    if (!rows.length) throw new Error("Agrega al menos una fila de datos debajo de los encabezados.");
    if (rows.length > CLASS_SCHEDULES_MAX_ROWS) throw new Error(`El límite es ${CLASS_SCHEDULES_MAX_ROWS} filas por archivo.`);

    const errors = [];
    const mapped = rows.map((row, index) => {
        const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalize(key), cellText(value)]));
        const val = (...keys) => keys.map(normalize).map(key => normalized[key]).find(value => value !== undefined) ?? "";
        const line = index + 2;
        const fail = message => errors.push(`Fila ${line}: ${message}`);
        const classroom = context.classrooms.find(item => item.academic_year_id === context.academicYearId && normalize(`${item.grade_label} ${item.section_name}`) === normalize(`${val("grado")} ${val("seccion")}`));
        if (kind === "classroom") {
            const levels = { inicial: "INITIAL", primaria: "PRIMARY", secundaria: "SECONDARY", otro: "OTHER", initial: "INITIAL", primary: "PRIMARY", secondary: "SECONDARY", other: "OTHER" };
            const level = levels[normalize(val("nivel", "level"))];
            const grade = val("grado", "grade_label");
            const section = val("seccion", "section_name");
            const capacityText = val("capacidad", "capacity");
            const capacity = capacityText ? Number(capacityText) : null;
            const orderText = val("orden_grado", "grade_order");
            if (orderText && (!Number.isInteger(Number(orderText)) || Number(orderText) < 1)) fail("el orden del grado debe ser un entero mayor que cero.");
            if (!level) fail("indica un nivel válido: Inicial, Primaria, Secundaria u Otro.");
            if (!grade || !section) fail("grado y sección son obligatorios.");
            if (capacityText && (!Number.isInteger(capacity) || capacity < 1)) fail("la capacidad debe ser un entero mayor que cero.");
            return { academic_year_id: context.academicYearId, level, grade_label: grade, section_name: section, grade_order: val("orden_grado", "grade_order") ? Number(val("orden_grado", "grade_order")) : null, capacity, status: normalize(val("estado", "status")) === "inactivo" ? "INACTIVE" : "ACTIVE" };
        }
        if (kind === "subject") {
            const name = val("curso", "nombre", "nombre_curso", "name");
            if (!name) fail("el nombre del curso es obligatorio.");
            return { name, code: val("codigo", "code") || null, description: val("descripcion", "description") || null, status: "ACTIVE" };
        }
        if (kind === "assignment") {
            const subjectName = val("curso", "nombre_curso", "asignatura");
            const teacherEmail = val("correo_docente", "email_docente", "docente").toLowerCase();
            const subject = context.subjects.find(item => normalize(item.name) === normalize(subjectName));
            const teacher = context.memberships.find(item => item.role === "TEACHER" && normalize(item.email) === normalize(teacherEmail));
            if (!classroom) fail("el aula no existe en el año seleccionado; usa su grado y sección exactos.");
            if (!subject) fail(`el curso “${subjectName || ""}” no existe; créalo primero en la pestaña Cursos.`);
            if (!teacher) fail(`no se encontró un docente activo con el correo “${teacherEmail || ""}”.`);
            return { academic_year_id: context.academicYearId, classroom_id: classroom?.id, subject_id: subject?.id, teacher_membership_id: teacher?.id, status: "ACTIVE" };
        }
        const subjectName = val("curso", "nombre_curso", "asignatura");
        const teacherEmail = val("correo_docente", "email_docente", "docente").toLowerCase();
        const subject = context.subjects.find(item => normalize(item.name) === normalize(subjectName));
        const teacher = context.memberships.find(item => item.role === "TEACHER" && normalize(item.email) === normalize(teacherEmail));
        const assignment = context.assignments.find(item => item.classroom_id === classroom?.id && item.subject_id === subject?.id && item.teacher_membership_id === teacher?.id && item.academic_year_id === context.academicYearId);
        const weekdayNames = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 7 };
        const weekday = Number(val("dia_numero", "weekday")) || weekdayNames[normalize(val("dia", "dia_semana"))];
        const start = val("hora_inicio", "inicio", "start_time");
        const end = val("hora_fin", "fin", "end_time");
        const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
        if (!classroom) fail("el aula no existe en el año seleccionado; usa su grado y sección exactos.");
        if (!subject || !teacher || !assignment) fail("el curso debe estar asignado a ese docente y aula antes de programar el horario.");
        if (!weekday || weekday < 1 || weekday > 7) fail("indica un día válido de lunes a domingo.");
        if (!timePattern.test(start) || !timePattern.test(end) || start >= end) fail("indica horas válidas en formato HH:MM y asegúrate de que el fin sea posterior al inicio.");
        return { course_assignment_id: assignment?.id, weekday, start_time: start.length === 5 ? `${start}:00` : start, end_time: end.length === 5 ? `${end}:00` : end, classroom_label: val("aula", "ambiente", "classroom_label") || `${classroom?.grade_label || ""} ${classroom?.section_name || ""}`.trim(), status: "ACTIVE" };
    });

    if (kind === "classroom") {
        const seen = new Set(context.classrooms.map(item => `${item.academic_year_id}|${item.level}|${normalize(item.grade_label)}|${normalize(item.section_name)}`));
        mapped.forEach((row, index) => {
            const key = `${context.academicYearId}|${row.level}|${normalize(row.grade_label)}|${normalize(row.section_name)}`;
            if (seen.has(key)) errors.push(`Fila ${index + 2}: el aula ya existe o está repetida en el archivo.`);
            seen.add(key);
        });
    }
    if (kind === "assignment") {
        const seen = new Set(context.assignments.map(row => `${row.classroom_id}|${row.subject_id}|${row.academic_year_id}`));
        mapped.forEach((row, index) => {
            const key = `${row.classroom_id}|${row.subject_id}|${row.academic_year_id}`;
            if (seen.has(key)) errors.push(`Fila ${index + 2}: la asignación ya existe o está repetida en el archivo.`);
            seen.add(key);
        });
    }
    if (kind === "subject") {
        const seen = new Set(context.subjects.map(item => normalize(item.name)));
        mapped.forEach((row, index) => {
            const key = normalize(row.name);
            if (seen.has(key)) errors.push(`Fila ${index + 2}: el curso ya existe o está repetido en el archivo.`);
            seen.add(key);
        });
    }
    if (kind === "schedule") {
        const seen = new Set();
        const schedules = context.existingSchedules || [];
        mapped.forEach((row, index) => {
            const assignment = context.assignments.find(item => item.id === row.course_assignment_id);
            const key = `${assignment?.classroom_id}|${row.weekday}|${row.start_time}|${row.end_time}`;
            const duplicate = seen.has(key);
            seen.add(key);
            const priorImports = mapped.slice(0, index);
            const overlap = [...schedules, ...priorImports].some(existing => {
                if (existing.status !== "ACTIVE" || existing.weekday !== row.weekday) return false;
                const existingAssignment = context.assignments.find(item => item.id === existing.course_assignment_id);
                const sameClass = assignment?.classroom_id && assignment.classroom_id === existingAssignment?.classroom_id;
                const sameTeacher = assignment?.teacher_membership_id && assignment.teacher_membership_id === existingAssignment?.teacher_membership_id;
                return (sameClass || sameTeacher) && existing.start_time < row.end_time && existing.end_time > row.start_time;
            });
            if (duplicate || overlap) errors.push(`Fila ${index + 2}: el horario se cruza con otro bloque existente o del mismo archivo.`);
        });
    }
    if (errors.length) throw new Error(errors.slice(0, 12).join("\n") + (errors.length > 12 ? `\nY ${errors.length - 12} errores más.` : ""));
    return mapped;
}

const templates = {
    classroom: { name: "plantilla-aulas.xlsx", headers: ["nivel", "grado", "seccion", "orden_grado", "capacidad", "estado"], sample: ["Primaria", "1.º", "A", 1, 30, "ACTIVE"] },
    subject: { name: "plantilla-cursos.xlsx", headers: ["curso", "codigo", "descripcion"], sample: ["Comunicación", "COM", "Curso de comunicación"] },
    assignment: { name: "plantilla-asignaciones.xlsx", headers: ["grado", "seccion", "curso", "correo_docente"], sample: ["1.º", "A", "Comunicación", "docente@colegio.edu.pe"] },
    schedule: { name: "plantilla-horarios.xlsx", headers: ["grado", "seccion", "curso", "correo_docente", "dia", "hora_inicio", "hora_fin", "aula"], sample: ["1.º", "A", "Comunicación", "docente@colegio.edu.pe", "Lunes", "08:00", "09:00", "Aula 1"] },
};

export function downloadAcademicTemplate(kind) {
    const template = templates[kind];
    if (!template) return;
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([template.headers, template.sample]);
    worksheet["!cols"] = template.headers.map(header => ({ wch: Math.max(header.length + 4, 18) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Carga");
    XLSX.writeFile(workbook, template.name);
}
