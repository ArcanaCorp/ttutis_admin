const MAX_FILE_BYTES = 5 * 1024 * 1024;

const normalizeText = value => String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeHeader = value => normalizeText(value).replace(/[\s-]+/g, "_");

function readSheet(workbook, utils, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return utils.sheet_to_json(sheet, { defval: "", raw: false })
        .filter(row => Object.values(row).some(value => String(value ?? "").trim()));
}

function mapSheetRows(rows, sheetName, fieldMap, errors) {
    return rows.map((row, index) => {
        const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? "").trim()]));
        const result = Object.fromEntries(Object.entries(fieldMap).map(([field, aliases]) => {
            const key = aliases.find(alias => Object.hasOwn(values, alias));
            return [field, key ? values[key] : ""];
        }));
        return { ...result, __row: index + 2, __sheet: sheetName };
    });
}

function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function parsePeopleWorkbook(file) {
    if (!file) return { data: null, error: new Error("Selecciona un archivo Excel.") };
    if (!file.name.toLowerCase().endsWith(".xlsx")) return { data: null, error: new Error("El archivo debe tener formato .xlsx.") };
    if (file.size > MAX_FILE_BYTES) return { data: null, error: new Error("El archivo supera el límite de 5 MB.") };

    try {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(await file.arrayBuffer());
        const errors = [];
        const students = mapSheetRows(readSheet(workbook, XLSX.utils, "Alumnos"), "Alumnos", {
            student_code: ["codigo_alumno", "student_code"],
            first_names: ["nombres", "first_names"],
            last_names: ["apellidos", "last_names"],
            document_type: ["tipo_documento", "document_type"],
            document_number: ["numero_documento", "document_number"],
            birth_date: ["fecha_nacimiento", "birth_date"],
            phone: ["telefono", "phone"],
            email: ["correo_alumno", "email"],
            admission_date: ["fecha_ingreso", "admission_date"],
        }, errors);
        const teachers = mapSheetRows(readSheet(workbook, XLSX.utils, "Docentes"), "Docentes", {
            full_name: ["nombre_completo", "full_name"],
            email: ["correo", "email"],
        }, errors).map(person => ({ ...person, role: "TEACHER" }));
        const assistants = mapSheetRows(readSheet(workbook, XLSX.utils, "Auxiliares"), "Auxiliares", {
            full_name: ["nombre_completo", "full_name"],
            email: ["correo", "email"],
        }, errors).map(person => ({ ...person, role: "ASSISTANT" }));
        const guardians = mapSheetRows(readSheet(workbook, XLSX.utils, "Apoderados"), "Apoderados", {
            full_name: ["nombre_completo", "full_name"],
            email: ["correo", "email"],
        }, errors);
        const links = mapSheetRows(readSheet(workbook, XLSX.utils, "Vinculos"), "Vinculos", {
            student_code: ["codigo_alumno", "student_code"],
            guardian_email: ["correo_apoderado", "guardian_email"],
            relationship: ["parentesco", "relationship"],
        }, errors);

        const checkRequired = (rows, fields) => rows.forEach(row => {
            fields.forEach(field => {
                if (!row[field]) errors.push(`${row.__sheet}, fila ${row.__row}: falta ${field}.`);
            });
        });
        checkRequired(students, ["student_code", "first_names", "last_names", "email"]);
        checkRequired(teachers, ["full_name", "email"]);
        checkRequired(assistants, ["full_name", "email"]);
        checkRequired(guardians, ["full_name", "email"]);
        checkRequired(links, ["student_code", "guardian_email", "relationship"]);
        if (students.length + teachers.length + assistants.length + guardians.length > 500) errors.push("La carga admite hasta 500 personas entre todas las hojas.");
        if (links.length > 1000) errors.push("La hoja Vinculos admite hasta 1,000 relaciones.");

        const studentCodes = new Set();
        students.forEach(student => {
            if (student.student_code && studentCodes.has(student.student_code.toLowerCase())) {
                errors.push(`Alumnos, fila ${student.__row}: código duplicado ${student.student_code}.`);
            }
            studentCodes.add(student.student_code.toLowerCase());
            ["birth_date", "admission_date"].forEach(field => {
                if (student[field] && !validateDate(student[field])) {
                    errors.push(`Alumnos, fila ${student.__row}: ${field} debe ser una fecha válida con formato AAAA-MM-DD.`);
                }
            });
            if (student.email && !validateEmail(student.email)) errors.push(`Alumnos, fila ${student.__row}: correo no válido.`);
        });
        [...teachers, ...assistants, ...guardians].forEach(person => {
            if (person.email && !validateEmail(person.email)) errors.push(`${person.__sheet}, fila ${person.__row}: correo no válido.`);
        });

        const guardianEmails = new Set(guardians.map(guardian => guardian.email.toLowerCase()));
        if (guardianEmails.size !== guardians.length) errors.push("Apoderados: cada persona debe aparecer una sola vez; agrega sus relaciones en la hoja Vínculos.");
        const linksSeen = new Set();
        links.forEach(link => {
            if (link.student_code && !studentCodes.has(link.student_code.toLowerCase())) {
                errors.push(`Vínculos, fila ${link.__row}: no existe el alumno ${link.student_code}.`);
            }
            if (link.guardian_email && !guardianEmails.has(link.guardian_email.toLowerCase())) {
                errors.push(`Vínculos, fila ${link.__row}: no existe el apoderado ${link.guardian_email}.`);
            }
            const key = `${link.student_code.toLowerCase()}|${link.guardian_email.toLowerCase()}`;
            if (linksSeen.has(key)) errors.push(`Vínculos, fila ${link.__row}: el vínculo está duplicado.`);
            linksSeen.add(key);
        });

        if (!students.length && !teachers.length && !assistants.length && !guardians.length) {
            errors.push("El libro no contiene personas. Usa las hojas Alumnos, Docentes, Auxiliares y Apoderados.");
        }
        if (errors.length) return { data: null, error: new Error(errors.slice(0, 30).join("\n")) };

        const stripMeta = ({ __row, __sheet, ...person }) => person;
        const guardianLinks = new Map();
        links.forEach(link => {
            const email = link.guardian_email.toLowerCase();
            const current = guardianLinks.get(email) ?? [];
            current.push({ student_code: link.student_code, relationship: link.relationship });
            guardianLinks.set(email, current);
        });

        return {
            data: {
                students: students.map(stripMeta),
                staff: [...teachers, ...assistants].map(stripMeta),
                guardians: guardians.map(guardian => ({
                    ...stripMeta(guardian),
                    links: guardianLinks.get(guardian.email.toLowerCase()) ?? [],
                })),
            },
            error: null,
        };
    } catch (error) {
        return { data: null, error: new Error(error.message || "No se pudo leer el archivo Excel.") };
    }
}

export async function registerPeople(payload) {
    const response = await fetch("/api/dashboard/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudo registrar a las personas.");
    return result;
}

export async function downloadPeopleWorkbook(filename = "plantilla-personas.xlsx", sample = false) {
    const { utils, writeFileXLSX } = await import("xlsx");
    const workbook = utils.book_new();
    const sheets = {
        Alumnos: ["codigo_alumno", "nombres", "apellidos", "tipo_documento", "numero_documento", "fecha_nacimiento", "telefono", "correo_alumno", "fecha_ingreso"],
        Docentes: ["nombre_completo", "correo"],
        Auxiliares: ["nombre_completo", "correo"],
        Apoderados: ["nombre_completo", "correo"],
        Vinculos: ["codigo_alumno", "correo_apoderado", "parentesco"],
    };
    Object.entries(sheets).forEach(([sheetName, headers]) => {
        const rows = sample
            ? sampleRows[sheetName].map((row, index) => sheetName === "Alumnos"
                ? [...row.slice(0, 7), `alumno${String(index + 1).padStart(2, "0")}@example.com`, row[8]]
                : row)
            : [];
        const worksheet = utils.aoa_to_sheet([headers, ...rows]);
        worksheet["!cols"] = headers.map(header => ({ wch: Math.min(Math.max(header.length + 4, 16), 32) }));
        utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    utils.book_append_sheet(workbook, utils.aoa_to_sheet([
        ["Hoja", "Regla"],
        ["Alumnos", "Código, nombres, apellidos y correo obligatorios. Se envía invitación de acceso."],
        ["Docentes", "Nombre y correo obligatorios. Se envía invitación de acceso."],
        ["Auxiliares", "Nombre y correo obligatorios. Se envía invitación de acceso."],
        ["Apoderados", "Nombre y correo obligatorios. Se envía invitación de acceso."],
        ["Vinculos", "Relaciona el código del alumno con el correo exacto del apoderado y el parentesco."],
        ["Fechas", "Formato AAAA-MM-DD, por ejemplo 2015-04-18."],
        ["Límites", "Hasta 500 personas en total, 1,000 vínculos y 5 MB. No usar correos ficticios para enviar invitaciones reales."],
    ]), "Referencia");
    writeFileXLSX(workbook, filename);
}

const sampleRows = {
    Alumnos: [
        ["ALU-2027-001", "Lucía", "Rojas Salazar", "DNI", "70000001", "2015-03-12", "", "", "2027-03-01"],
        ["ALU-2027-002", "Mateo", "Vargas León", "DNI", "70000002", "2015-07-24", "", "", "2027-03-01"],
        ["ALU-2027-003", "Valentina", "Paredes Ruiz", "DNI", "70000003", "2015-01-09", "", "", "2027-03-01"],
        ["ALU-2027-004", "Thiago", "Castro Flores", "DNI", "70000004", "2015-11-30", "", "", "2027-03-01"],
        ["ALU-2027-005", "Camila", "Mendoza Torres", "DNI", "70000005", "2015-05-16", "", "", "2027-03-01"],
        ["ALU-2027-006", "Joaquín", "Herrera Díaz", "DNI", "70000006", "2015-09-03", "", "", "2027-03-01"],
        ["ALU-2027-007", "Mía", "Flores Romero", "DNI", "70000007", "2015-02-21", "", "", "2027-03-01"],
        ["ALU-2027-008", "Santiago", "Cruz Medina", "DNI", "70000008", "2015-12-05", "", "", "2027-03-01"],
        ["ALU-2027-009", "Emma", "Silva Navarro", "DNI", "70000009", "2015-06-14", "", "", "2027-03-01"],
        ["ALU-2027-010", "Gabriel", "Ortiz Rivas", "DNI", "70000010", "2015-08-28", "", "", "2027-03-01"],
        ["ALU-2027-011", "Antonella", "Reyes Vega", "DNI", "70000011", "2015-04-07", "", "", "2027-03-01"],
        ["ALU-2027-012", "Benjamín", "Campos Luna", "DNI", "70000012", "2015-10-19", "", "", "2027-03-01"],
        ["ALU-2027-013", "Zoe", "Ramos Cabrera", "DNI", "70000013", "2015-01-27", "", "", "2027-03-01"],
        ["ALU-2027-014", "Nicolás", "Chávez Peña", "DNI", "70000014", "2015-07-02", "", "", "2027-03-01"],
        ["ALU-2027-015", "Amanda", "Díaz Soto", "DNI", "70000015", "2015-03-25", "", "", "2027-03-01"],
        ["ALU-2027-016", "Liam", "Espinoza Gil", "DNI", "70000016", "2015-11-11", "", "", "2027-03-01"],
        ["ALU-2027-017", "Ariana", "Morales Paz", "DNI", "70000017", "2015-05-31", "", "", "2027-03-01"],
        ["ALU-2027-018", "Diego", "Acosta Ríos", "DNI", "70000018", "2015-09-17", "", "", "2027-03-01"],
        ["ALU-2027-019", "Isabella", "Gutiérrez Solís", "DNI", "70000019", "2015-02-10", "", "", "2027-03-01"],
        ["ALU-2027-020", "Adrián", "Vásquez Núñez", "DNI", "70000020", "2015-12-22", "", "", "2027-03-01"],
    ],
    Docentes: [
        ["María Fernanda Salas", "docente01@example.com"],
        ["Carlos Alberto Peña", "docente02@example.com"],
        ["Rosa Elena Ponce", "docente03@example.com"],
        ["Javier Alonso Torres", "docente04@example.com"],
    ],
    Auxiliares: [["Patricia Milagros Díaz", "auxiliar01@example.com"], ["Luis Enrique Rojas", "auxiliar02@example.com"]],
    Apoderados: Array.from({ length: 20 }, (_, index) => [`Apoderado de ${String(index + 1).padStart(2, "0")}`, `apoderado${String(index + 1).padStart(2, "0")}@example.com`]),
    Vinculos: Array.from({ length: 20 }, (_, index) => [`ALU-2027-${String(index + 1).padStart(3, "0")}`, `apoderado${String(index + 1).padStart(2, "0")}@example.com`, "Madre/Padre" ]),
};
