
'use client';

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
import Pagination from "@/components/ui/Pagination";
import usePagination from "@/hooks/usePagination";
import { useSchoolYearData } from "@/hooks/useInstitutionData";

import {
    CalendarDays,
    GraduationCap,
    School,
    Users,
    ChevronRight,
    CalendarCheck,
    Clock3,
    CheckCircle2,
    AlertCircle,
    BookOpen,
    Layers3,
    Download,
    FileSpreadsheet,
} from "lucide-react";

const normalizeSpreadsheetText = value => String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const classroomKey = classroom => [classroom.level, classroom.grade_label, classroom.section_name]
    .map(normalizeSpreadsheetText)
    .join("|");

export default function Page() {
    const {
        data = {},
        loading,
        error,
        refresh,
        canManage,
        createAcademicYear,
        createClassroom,
        createClassrooms,
        createEnrollment,
    } = useSchoolYearData();
    const {
        academic_years = [],
        enrollments = [],
        classrooms = [],
        students = [],
    } = data;

    // ========================================
    // HELPERS
    // ========================================

    const formatDate = (value) => {
        if (!value) return "Sin fecha";

        const date = new Date(value);

        if (isNaN(date.getTime())) return "Sin fecha";

        return date.toLocaleDateString("es-PE", {
            // SQL DATE values have no timezone; UTC prevents shifting them to the prior day.
            timeZone: "UTC",
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const getYearStatus = (status) => {
        const statuses = {
            ACTIVE: {
                label: "En curso",
                className: "text-green-700 bg-green-50",
            },
            PLANNED: {
                label: "Planificado",
                className: "text-blue-700 bg-blue-50",
            },
            CLOSED: {
                label: "Finalizado",
                className: "text-gray-600 bg-gray-100",
            },
        };

        return statuses[status] || {
            label: status || "Sin estado",
            className: "text-gray-600 bg-gray-100",
        };
    };

    const getEnrollmentStatus = (status) => {
        const statuses = {
            ACTIVE: "Activa",
            TRANSFERRED: "Trasladada",
            COMPLETED: "Completada",
        };

        return statuses[status] || status || "Sin estado";
    };

    // ========================================
    // AÑO SELECCIONADO
    // ========================================

    const activeYear = academic_years.find(
        year => year.status === "ACTIVE"
    );

    const [selectedYearId, setSelectedYearId] = useState("");
    const [activeModal, setActiveModal] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [notice, setNotice] = useState("");
    const [classroomMode, setClassroomMode] = useState("single");
    const [bulkClassroomFileName, setBulkClassroomFileName] = useState("");
    const [bulkClassroomRows, setBulkClassroomRows] = useState([]);
    const [bulkClassroomErrors, setBulkClassroomErrors] = useState([]);
    const [yearForm, setYearForm] = useState({ name: "", starts_on: "", ends_on: "", status: "PLANNED" });
    const [classroomForm, setClassroomForm] = useState({ level: "PRIMARY", grade_label: "", grade_order: "", section_name: "", capacity: "", status: "ACTIVE" });
    const [enrollmentForm, setEnrollmentForm] = useState({ student_id: "", classroom_id: "", enrolled_at: "", status: "ACTIVE" });
    const [enrollmentStudentSearch, setEnrollmentStudentSearch] = useState("");

    const selectedYear = academic_years.find(
        year => year.id === selectedYearId
    ) || activeYear || academic_years[0];

    // ========================================
    // DATOS DEL AÑO SELECCIONADO
    // ========================================

    const yearEnrollments = useMemo(() => {
        if (!selectedYear) return [];

        return enrollments.filter(
            enrollment =>
                enrollment.academic_year_id === selectedYear.id
        );
    }, [enrollments, selectedYear]);

    const yearClassrooms = useMemo(() => {
        if (!selectedYear) return [];

        return classrooms.filter(classroom => {
            return classroom.academic_year_id === selectedYear.id;
        });
    }, [classrooms, selectedYear]);

    // ========================================
    // ESTADÍSTICAS
    // ========================================

    const activeEnrollments = yearEnrollments.filter(item => item.status === "ACTIVE");

    const transferredEnrollments = yearEnrollments.filter(item => item.status === "TRANSFERRED");

    const inactiveEnrollments = yearEnrollments.filter(item => item.status === "INACTIVE");

    const completedEnrollments = yearEnrollments.filter(item => item.status === "COMPLETED");

    const activeClassrooms = yearClassrooms.filter(classroom => classroom.status === "ACTIVE");

    const availableClassrooms = yearClassrooms.filter(classroom => classroom.status === "ACTIVE");
    const availableStudents = selectedYear ? students.filter(student =>
        student.status === "ACTIVE" && !yearEnrollments.some(enrollment =>
            enrollment.student_id === student.id && enrollment.status === "ACTIVE"
        )
    ) : [];
    const yearPagination = usePagination(academic_years, 12);
    const classroomPagination = usePagination(yearClassrooms, 25);
    const filteredAvailableStudents = availableStudents.filter(student =>
        `${student.first_names || ""} ${student.last_names || ""} ${student.student_code || ""}`
            .toLocaleLowerCase("es-PE")
            .includes(enrollmentStudentSearch.trim().toLocaleLowerCase("es-PE")),
    );
    const availableStudentPagination = usePagination(filteredAvailableStudents, 25);
    const availableStudentOptions = availableStudentPagination.items.some(
        student => student.id === enrollmentForm.student_id,
    )
        ? availableStudentPagination.items
        : [
            ...availableStudents.filter(student => student.id === enrollmentForm.student_id),
            ...availableStudentPagination.items,
        ];

    const totalStudents = students.filter(
        student => student.status === "ACTIVE"
    ).length;

    const stats = [
        {
            key: "years",
            label: "Años académicos",
            value: academic_years.length,
            description: "Años registrados",
            icon: CalendarDays,
            iconVariant: "primary",
        },
        {
            key: "enrollments",
            label: "Matrículas",
            value: activeEnrollments.length,
            description: "Matrículas activas",
            icon: GraduationCap,
            iconVariant: "info",
        },
        {
            key: "classrooms",
            label: "Aulas activas",
            value: activeClassrooms.length,
            description: "Aulas organizadas",
            icon: School,
            iconVariant: "success",
        },
        {
            key: "students",
            label: "Alumnos",
            value: totalStudents,
            description: "Alumnos activos",
            icon: Users,
            iconVariant: "danger",
        },
    ];

    // ========================================
    // AULAS Y ALUMNOS
    // ========================================

    const getClassroomName = (classroom) => {
        return [classroom.grade_label, classroom.section_name].filter(Boolean).join(" - ") || "Aula sin nombre";
    };

    const getClassroomStudents = (classroom) => {
        return activeEnrollments.filter(enrollment => enrollment.classroom_id === classroom.id).length;
    };

    const getClassroomGrade = (classroom) => {

        const level = {
            'PRIMARY': 'Primaria',
            'SECONDARY': 'Secundaria',
        }

        return level[classroom.level] || "Sin nivel";
    };

    const getClassroomSection = (classroom) => {
        return classroom.section_name || "Sin sección";
    };

    const closeModal = () => {
        if (saving) return;
        setActiveModal(null);
        setFormError("");
    };

    const openYearModal = () => {
        setYearForm({ name: "", starts_on: "", ends_on: "", status: "PLANNED" });
        setFormError("");
        setNotice("");
        setActiveModal("year");
    };

    const openClassroomModal = () => {
        setClassroomForm({ level: "PRIMARY", grade_label: "", grade_order: "", section_name: "", capacity: "", status: "ACTIVE" });
        setClassroomMode("single");
        setBulkClassroomFileName("");
        setBulkClassroomRows([]);
        setBulkClassroomErrors([]);
        setFormError("");
        setNotice("");
        setActiveModal("classroom");
    };

    const openEnrollmentModal = () => {
        setEnrollmentForm({
            student_id: availableStudents[0]?.id || "",
            classroom_id: availableClassrooms[0]?.id || "",
            enrolled_at: selectedYear?.starts_on || "",
            status: "ACTIVE",
        });
        setFormError("");
        setNotice("");
        setActiveModal("enrollment");
    };

    const handleCreateYear = async event => {
        event.preventDefault();
        setFormError("");
        if (yearForm.starts_on > yearForm.ends_on) {
            setFormError("La fecha de inicio debe ser anterior o igual a la fecha de fin.");
            return;
        }
        const limaDateParts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Lima",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(new Date());
        const limaToday = ["year", "month", "day"]
            .map(part => limaDateParts.find(item => item.type === part)?.value)
            .join("-");
        const includesToday = yearForm.starts_on <= limaToday && yearForm.ends_on >= limaToday;
        if (yearForm.starts_on > limaToday && yearForm.status !== "PLANNED") {
            setFormError("Un año que empieza más adelante debe quedar como Planificado.");
            return;
        }
        if (includesToday && activeYear) {
            setFormError("Ya existe un año escolar en curso. Ajusta las fechas para que este periodo quede planificado o finalizado.");
            return;
        }
        if (includesToday && yearForm.status !== "ACTIVE") {
            setFormError("Las fechas incluyen hoy; selecciona En curso para este periodo.");
            return;
        }
        if (yearForm.ends_on < limaToday && yearForm.status !== "CLOSED") {
            setFormError("El periodo ya terminó; selecciona el estado Finalizado.");
            return;
        }
        if (yearForm.status === "ACTIVE" && activeYear) {
            setFormError("Ya hay un año escolar activo. Crea este año como planificado.");
            return;
        }

        setSaving(true);
        try {
            const { data: createdYear, error: createError } = await createAcademicYear({
                name: yearForm.name.trim(),
                starts_on: yearForm.starts_on,
                ends_on: yearForm.ends_on,
                status: yearForm.status,
            });
            if (createError) throw createError;
            setSelectedYearId(createdYear.id);
            setNotice(`Se creó el año académico ${createdYear.name}.`);
            setActiveModal(null);
        } catch (createError) {
            setFormError(createError.message || "No se pudo crear el año académico.");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateClassroom = async event => {
        event.preventDefault();
        setFormError("");
        if (!selectedYear) {
            setFormError("Primero crea o selecciona un año académico.");
            return;
        }

        const gradeOrder = classroomForm.grade_order.trim() ? Number(classroomForm.grade_order) : null;
        const capacity = classroomForm.capacity.trim() ? Number(classroomForm.capacity) : null;
        if (gradeOrder !== null && (!Number.isInteger(gradeOrder) || gradeOrder < 1)) {
            setFormError("El orden del grado debe ser un entero mayor que cero.");
            return;
        }
        if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
            setFormError("La capacidad debe ser un entero mayor que cero.");
            return;
        }

        setSaving(true);
        try {
            const { error: createError } = await createClassroom({
                academic_year_id: selectedYear.id,
                level: classroomForm.level,
                grade_label: classroomForm.grade_label.trim(),
                grade_order: gradeOrder,
                section_name: classroomForm.section_name.trim(),
                capacity,
                status: classroomForm.status,
            });
            if (createError) throw createError;
            setNotice(`Se creó el aula ${classroomForm.grade_label.trim()} ${classroomForm.section_name.trim()}.`);
            setActiveModal(null);
        } catch (createError) {
            setFormError(createError.message || "No se pudo crear el aula.");
        } finally {
            setSaving(false);
        }
    };

    const handleClassroomWorkbook = async event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        setFormError("");
        setBulkClassroomFileName(file?.name || "");
        setBulkClassroomRows([]);
        setBulkClassroomErrors([]);
        if (!file) return;
        if (!file.name.toLowerCase().endsWith(".xlsx")) {
            setBulkClassroomErrors(["Selecciona un archivo .xlsx de Excel."]);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setBulkClassroomErrors(["El archivo supera el límite de 5 MB."]);
            return;
        }

        try {
            const { read, utils } = await import("xlsx");
            const workbook = read(await file.arrayBuffer());
            const firstSheetName = workbook.SheetNames[0];
            if (!firstSheetName) throw new Error("El archivo no contiene hojas de cálculo.");
            const records = utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: "", raw: false });
            if (records.length > 500) {
                setBulkClassroomErrors(["El archivo puede contener como máximo 500 aulas por importación."]);
                return;
            }

            const levelValues = {
                inicial: "INITIAL",
                initial: "INITIAL",
                primaria: "PRIMARY",
                primary: "PRIMARY",
                secundaria: "SECONDARY",
                secondary: "SECONDARY",
                otro: "OTHER",
                other: "OTHER",
            };
            const statusValues = { activa: "ACTIVE", active: "ACTIVE", inactiva: "INACTIVE", inactive: "INACTIVE" };
            const acceptedKeys = {
                level: ["nivel", "level"],
                grade: ["grado", "grade", "grade_label"],
                section: ["seccion", "section", "section_name"],
                gradeOrder: ["orden_grado", "orden", "grade_order"],
                capacity: ["capacidad", "capacity"],
                status: ["estado", "status"],
            };
            const existingKeys = new Set(yearClassrooms.map(classroomKey));
            const uploadedKeys = new Set();
            const rows = [];
            const errors = [];

            records.forEach((record, index) => {
                const cells = Object.fromEntries(Object.entries(record).map(([key, value]) => [normalizeSpreadsheetText(key).replace(/[\s-]+/g, "_"), value]));
                if (Object.values(cells).every(value => String(value ?? "").trim() === "")) return;
                const readCell = field => {
                    const key = acceptedKeys[field].find(alias => Object.hasOwn(cells, alias));
                    return key ? String(cells[key] ?? "").trim() : "";
                };
                const level = levelValues[normalizeSpreadsheetText(readCell("level"))];
                const gradeLabel = readCell("grade");
                const sectionName = readCell("section");
                const gradeOrderValue = readCell("gradeOrder");
                const capacityValue = readCell("capacity");
                const statusValue = normalizeSpreadsheetText(readCell("status") || "activa");
                const rowErrors = [];
                if (!level) rowErrors.push("nivel inválido o vacío");
                if (!gradeLabel) rowErrors.push("grado vacío");
                if (!sectionName) rowErrors.push("sección vacía");
                const gradeOrder = gradeOrderValue ? Number(gradeOrderValue) : null;
                const capacity = capacityValue ? Number(capacityValue) : null;
                if (gradeOrderValue && (!Number.isInteger(gradeOrder) || gradeOrder < 1)) rowErrors.push("orden_grado debe ser un entero mayor que cero");
                if (capacityValue && (!Number.isInteger(capacity) || capacity < 1)) rowErrors.push("capacidad debe ser un entero mayor que cero");
                const status = statusValues[statusValue];
                if (!status) rowErrors.push("estado debe ser ACTIVA o INACTIVA");
                const parsedRow = { level, grade_label: gradeLabel, grade_order: gradeOrder, section_name: sectionName, capacity, status };
                if (!rowErrors.length) {
                    const key = classroomKey(parsedRow);
                    if (existingKeys.has(key)) rowErrors.push("el aula ya existe en este año escolar");
                    if (uploadedKeys.has(key)) rowErrors.push("aula duplicada dentro del archivo");
                    uploadedKeys.add(key);
                }
                if (rowErrors.length) errors.push(`Fila ${index + 2}: ${rowErrors.join("; ")}.`);
                else rows.push(parsedRow);
            });

            if (!records.length) errors.push("La primera hoja no tiene filas para importar.");
            if (!rows.length && !errors.length) errors.push("No se encontraron aulas válidas para importar.");
            setBulkClassroomRows(rows);
            setBulkClassroomErrors(errors);
        } catch (parseError) {
            setBulkClassroomErrors([parseError.message || "No se pudo leer el archivo Excel."]);
        }
    };

    const handleDownloadClassroomTemplate = async () => {
        try {
            const { utils, writeFileXLSX } = await import("xlsx");
            const workbook = utils.book_new();
            const classroomsSheet = utils.aoa_to_sheet([[
                "nivel", "grado", "seccion", "orden_grado", "capacidad", "estado",
            ]]);
            classroomsSheet["!cols"] = [
                { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
            ];
            utils.book_append_sheet(workbook, classroomsSheet, "Aulas");
            const referenceSheet = utils.aoa_to_sheet([
                ["Campo", "Valores o formato"],
                ["nivel", "INITIAL, PRIMARY, SECONDARY u OTHER"],
                ["grado", "Texto: 1.º, 2.º, 3 años, etc."],
                ["seccion", "Texto: A, B, C, etc."],
                ["orden_grado", "Entero mayor que cero; opcional"],
                ["capacidad", "Entero mayor que cero; opcional"],
                ["estado", "ACTIVE o INACTIVE; opcional, por defecto ACTIVE"],
            ]);
            utils.book_append_sheet(workbook, referenceSheet, "Referencia");
            writeFileXLSX(workbook, "plantilla-aulas.xlsx");
        } catch (templateError) {
            setFormError(templateError.message || "No se pudo generar la plantilla Excel.");
        }
    };

    const handleImportClassrooms = async () => {
        setFormError("");
        if (!selectedYear) {
            setFormError("Primero crea o selecciona un año académico.");
            return;
        }
        if (!bulkClassroomRows.length || bulkClassroomErrors.length) {
            setFormError("Corrige los errores del archivo antes de importar.");
            return;
        }

        setSaving(true);
        try {
            const { error: importError } = await createClassrooms(selectedYear.id, bulkClassroomRows);
            if (importError) throw importError;
            setNotice(`Se importaron ${bulkClassroomRows.length} aulas en ${selectedYear.name}.`);
            setActiveModal(null);
        } catch (importError) {
            setFormError(importError.message || "No se pudieron importar las aulas.");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateEnrollment = async event => {
        event.preventDefault();
        setFormError("");
        if (!selectedYear || !availableClassrooms.some(classroom => classroom.id === enrollmentForm.classroom_id)) {
            setFormError("Selecciona un aula activa del año escolar seleccionado.");
            return;
        }
        if (!availableStudents.some(student => student.id === enrollmentForm.student_id)) {
            setFormError("Selecciona un alumno activo que aún no tenga matrícula activa en este año.");
            return;
        }

        setSaving(true);
        try {
            const { error: createError } = await createEnrollment({
                academic_year_id: selectedYear.id,
                classroom_id: enrollmentForm.classroom_id,
                student_id: enrollmentForm.student_id,
                enrolled_at: enrollmentForm.enrolled_at,
                status: enrollmentForm.status,
            });
            if (createError) throw createError;
            setNotice("Se creó la matrícula correctamente.");
            setActiveModal(null);
        } catch (createError) {
            setFormError(createError.message || "No se pudo crear la matrícula.");
        } finally {
            setSaving(false);
        }
    };

    // ========================================
    // RENDER
    // ========================================

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            <PageHeader
                title="Año escolar"
                description="Administra los años académicos, matrículas y aulas."
                actions={(
                    <Button variant="outline" icon={CalendarDays} onClick={openYearModal} disabled={!canManage || loading}>
                        Nuevo año escolar
                    </Button>
                )}
            />
            {notice && <p className="border radius-md bg-success p-md text-sm text-success" role="status">{notice}</p>}

            {/* STATS */}

            <section className="grid grid-cols-4 gap-md">
                {stats.map(stat => (
                    <Card
                        key={stat.key}
                        variant="statIcon"
                        title={stat.label}
                        value={stat.value}
                        description={stat.description}
                        icon={stat.icon}
                        iconVariant={stat.iconVariant}
                        size="md"
                    />
                ))}
            </section>

            {/* ACTIVE YEAR */}

            <Card
                variant="default"
                title="Año escolar seleccionado"
                subtitle="Resumen de la organización académica"
                icon={CalendarCheck}
                iconVariant="primary"
            >
                {selectedYear ? (
                    <div className="flex flex-col gap-lg">
                        <div className="flex flex-wrap items-start justify-between gap-md">
                            <div>
                                <h2 className="text-3xl font-semibold">
                                    {selectedYear.name}
                                </h2>

                                <p className="text-sm text-gray-500 mt-xs">
                                    {formatDate(selectedYear.starts_on)}
                                    {" - "}
                                    {formatDate(selectedYear.ends_on)}
                                </p>
                            </div>

                            <span className={`text-xs font-medium px-md py-sm rounded-full ${getYearStatus(selectedYear.status).className}`}>
                                {getYearStatus(selectedYear.status).label}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-md">

                            <div className="rounded-lg bg-gray-50 p-md">
                                <div className="flex items-center gap-sm text-gray-500 mb-sm">
                                    <GraduationCap size={17} />
                                    <span className="text-sm">
                                        Matrículas activas
                                    </span>
                                </div>

                                <p className="text-2xl font-semibold">
                                    {activeEnrollments.length}
                                </p>
                            </div>

                            <div className="rounded-lg bg-gray-50 p-md">
                                <div className="flex items-center gap-sm text-gray-500 mb-sm">
                                    <School size={17} />
                                    <span className="text-sm">
                                        Aulas activas
                                    </span>
                                </div>

                                <p className="text-2xl font-semibold">
                                    {activeClassrooms.length}
                                </p>
                            </div>

                            <div className="rounded-lg bg-gray-50 p-md">
                                <div className="flex items-center gap-sm text-gray-500 mb-sm">
                                    <Users size={17} />
                                    <span className="text-sm">
                                        Alumnos matriculados
                                    </span>
                                </div>

                                <p className="text-2xl font-semibold">
                                    {activeEnrollments.length}
                                </p>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="py-xl text-center">
                        <CalendarDays
                            size={32}
                            className="mx-auto text-gray-400 mb-md"
                        />

                        <p className="font-medium">
                            No hay años académicos registrados
                        </p>

                        <p className="text-sm text-gray-500 mt-xs">
                            Registra un año escolar para comenzar a organizar tu institución.
                        </p>
                    </div>
                )}
            </Card>

            {/* ACADEMIC YEARS */}

            <section>
                <div className="flex items-center justify-between gap-md mb-md">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Años académicos
                        </h2>

                        <p className="text-sm text-gray-500">
                            Historial y planificación de años escolares.
                        </p>
                    </div>

                    <span className="text-sm text-gray-500">
                        {academic_years.length} registrados
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-md">

                    {academic_years.length > 0 ? (
                        yearPagination.items.map(year => {
                            const status = getYearStatus(year.status);

                            const isSelected = selectedYear?.id === year.id;

                            return (
                                <div
                                    key={year.id}
                                    onClick={() => setSelectedYearId(year.id)}
                                    className={`border rounded-xl p-lg cursor-pointer transition-colors ${
                                        isSelected
                                            ? "border-primary bg-primary/5"
                                            : "hover:bg-gray-50"
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-md">

                                        <div className="flex items-center gap-sm">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                <CalendarDays size={20} />
                                            </div>

                                            <div>
                                                <p className="font-semibold">
                                                    {year.name}
                                                </p>

                                                <p className="text-xs text-gray-500">
                                                    {formatDate(year.starts_on)}
                                                    {" - "}
                                                    {formatDate(year.ends_on)}
                                                </p>
                                            </div>
                                        </div>

                                        <span className={`text-xs px-sm py-xs rounded-full ${status.className}`}>
                                            {status.label}
                                        </span>

                                    </div>

                                    <div className="flex justify-between items-center mt-lg pt-md border-t">
                                        <span className="text-sm text-gray-500">
                                            {enrollments.filter(
                                                enrollment =>
                                                    enrollment.academic_year_id === year.id &&
                                                    enrollment.status === "ACTIVE"
                                            ).length} matrículas activas
                                        </span>

                                        <ChevronRight
                                            size={18}
                                            className="text-gray-400"
                                        />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full border rounded-xl p-xl text-center text-sm text-gray-500">
                            No hay años académicos registrados.
                        </div>
                    )}

                </div>
                <Pagination {...yearPagination} onPageChange={yearPagination.setPage} />
            </section>

            {/* ENROLLMENT STATUS */}

            <section className="grid grid-cols-2 gap-md">

                <Card
                    variant="default"
                    title="Estado de matrículas"
                    subtitle={selectedYear ? `Resumen de ${selectedYear.name}` : "Selecciona un año académico"}
                    icon={GraduationCap}
                    iconVariant="info"
                >
                    <div className="flex flex-col gap-md">
                        <div className="flex flex-wrap items-center justify-between gap-sm">
                            <p className="text-sm text-secondary">
                                {availableStudents.length
                                    ? `${availableStudents.length} alumnos disponibles para matricular.`
                                    : "No hay alumnos disponibles para matricular en este año."}
                            </p>
                            <Button
                                variant="outline"
                                icon={GraduationCap}
                                onClick={openEnrollmentModal}
                                disabled={!canManage || !selectedYear || !availableClassrooms.length || !availableStudents.length}
                            >
                                Nueva matrícula
                            </Button>
                        </div>

                        {[
                            {
                                label: "Activas",
                                value: activeEnrollments.length,
                                icon: CheckCircle2,
                            },
                            {
                                label: "Trasladadas",
                                value: transferredEnrollments.length,
                                icon: GraduationCap,
                            },
                            {
                                label: "Inactivas",
                                value: inactiveEnrollments.length,
                                icon: AlertCircle,
                            },
                            {
                                label: "Completadas",
                                value: completedEnrollments.length,
                                icon: CheckCircle2,
                            },
                        ].map(item => {
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.label}
                                    className="flex items-center justify-between gap-md"
                                >
                                    <div className="flex items-center gap-sm">
                                        <Icon size={18} className="text-gray-500" />

                                        <span className="text-sm">
                                            {item.label}
                                        </span>
                                    </div>

                                    <span className="font-semibold">
                                        {item.value}
                                    </span>
                                </div>
                            );
                        })}

                    </div>
                </Card>

                {/* CLASSROOMS */}

                <Card
                    variant="default"
                    title="Organización de aulas"
                    subtitle="Distribución de grados y secciones"
                    icon={Layers3}
                    iconVariant="success"
                >
                    <div className="flex flex-col gap-md">

                        <div className="grid grid-cols-2 gap-md">
                            <div className="rounded-lg bg-gray-50 p-md">
                                <p className="text-sm text-gray-500">
                                    Total de aulas
                                </p>

                                <p className="text-2xl font-semibold">
                                    {yearClassrooms.length}
                                </p>
                            </div>

                            <div className="rounded-lg bg-gray-50 p-md">
                                <p className="text-sm text-gray-500">
                                    Aulas activas
                                </p>

                                <p className="text-2xl font-semibold">
                                    {activeClassrooms.length}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-sm text-sm text-gray-500">
                            <BookOpen size={17} />

                            Las aulas se organizan por nivel, grado y sección.
                        </div>

                    </div>
                </Card>

            </section>

            {/* CLASSROOM LIST */}

            <section>

                <div className="flex flex-wrap justify-between items-center gap-md mb-md">
                    <div>
                        <h2 className="text-lg font-semibold">Aulas y secciones</h2>
                        <p className="text-sm text-gray-500">Organización académica del año seleccionado.</p>
                    </div>
                    <Button variant="outline" icon={School} onClick={openClassroomModal} disabled={!canManage || !selectedYear}>Nueva aula</Button>
                </div>

                <div className="border rounded-xl overflow-hidden">

                    {yearClassrooms.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left p-md font-medium">Aula</th>
                                        <th className="text-left p-md font-medium">Nivel</th>
                                        <th className="text-left p-md font-medium">Grado</th>
                                        <th className="text-left p-md font-medium">Sección</th>
                                        <th className="text-left p-md font-medium">Alumnos</th>
                                        <th className="text-left p-md font-medium">Estado</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {classroomPagination.items.map(classroom => {
                                        const studentCount = getClassroomStudents(classroom);

                                        return (
                                            <tr key={classroom.id} className="border-t">
                                                <td className="p-md font-medium">
                                                    {getClassroomName(classroom)}
                                                </td>

                                                <td className="p-md">
                                                    {getClassroomGrade(classroom)}
                                                </td>

                                                <td className="p-md">
                                                    {classroom.grade_label || "—"}
                                                </td>

                                                <td className="p-md">
                                                    {getClassroomSection(classroom)}
                                                </td>

                                                <td className="p-md">
                                                    {studentCount}
                                                </td>

                                                <td className="p-md">
                                                    <span className={`text-xs px-sm py-xs rounded-full ${
                                                        classroom.status === "ACTIVE"
                                                            ? "bg-green-50 text-green-700"
                                                            : "bg-gray-100 text-gray-600"
                                                    }`}>
                                                        {classroom.status === "ACTIVE"
                                                            ? "Activa"
                                                            : classroom.status || "Sin estado"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <Pagination {...classroomPagination} onPageChange={classroomPagination.setPage} />
                        </div>
                    ) : (
                        <div className="py-xl text-center">
                            <School
                                size={32}
                                className="mx-auto text-gray-400 mb-md"
                            />

                            <p className="font-medium">
                                No hay aulas registradas
                            </p>

                            <p className="text-sm text-gray-500 mt-xs">
                                Las aulas y secciones aparecerán aquí cuando sean registradas.
                            </p>
                        </div>
                    )}

                </div>
            </section>

            <Modal
                open={activeModal === "year"}
                onClose={closeModal}
                title="Nuevo año escolar"
                description="Define el nombre y el periodo del año académico."
                size="md"
            >
                <form className="flex flex-col gap-md" onSubmit={handleCreateYear}>
                    <Input name="year-name" label="Nombre" value={yearForm.name} onChange={event => setYearForm(current => ({ ...current, name: event.target.value }))} placeholder="Ej. Año escolar 2027" required fullWidth />
                    <div className="grid grid-cols-2 gap-md">
                        <Input name="year-starts-on" label="Fecha de inicio" type="date" value={yearForm.starts_on} onChange={event => setYearForm(current => ({ ...current, starts_on: event.target.value }))} required fullWidth />
                        <Input name="year-ends-on" label="Fecha de fin" type="date" value={yearForm.ends_on} onChange={event => setYearForm(current => ({ ...current, ends_on: event.target.value }))} required fullWidth />
                    </div>
                    <label className="flex flex-col gap-xs text-sm">
                        <span className="font-medium">Estado</span>
                        <select className="w-full border radius-md bg-surface p-sm" value={yearForm.status} onChange={event => setYearForm(current => ({ ...current, status: event.target.value }))}>
                            <option value="PLANNED">Planificado</option>
                            {!activeYear && <option value="ACTIVE">En curso</option>}
                            <option value="CLOSED">Finalizado</option>
                        </select>
                    </label>
                    <p className="text-xs text-secondary">Planificado es para preparar el periodo con anticipación; En curso indica que sus fechas incluyen hoy; Finalizado se usa cuando ya terminó.</p>
                    {formError && <p className="rounded-md bg-error p-md text-sm text-error" role="alert">{formError}</p>}
                    <div className="flex justify-end gap-sm">
                        <Button variant="outline" onClick={closeModal} disabled={saving}>Cancelar</Button>
                        <Button type="submit" icon={CalendarDays} loading={saving} loadingText="Creando…" disabled={!canManage}>Crear año</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={activeModal === "classroom"}
                onClose={closeModal}
                title="Nueva aula o sección"
                description="Registra el aula dentro del año académico seleccionado."
                size="md"
            >
                <div className="flex flex-col gap-md">
                    <div className="rounded-md bg-surface-secondary p-md text-sm">
                        Año académico: <strong>{selectedYear?.name || "Sin año seleccionado"}</strong>
                    </div>
                    <div className="flex flex-wrap gap-sm" role="group" aria-label="Forma de registrar aulas">
                        <Button type="button" size="sm" variant={classroomMode === "single" ? "primary" : "outline"} aria-pressed={classroomMode === "single"} onClick={() => { setClassroomMode("single"); setFormError(""); }}>
                            Una aula
                        </Button>
                        <Button type="button" size="sm" variant={classroomMode === "bulk" ? "primary" : "outline"} icon={FileSpreadsheet} aria-pressed={classroomMode === "bulk"} onClick={() => { setClassroomMode("bulk"); setFormError(""); }}>
                            Carga desde Excel
                        </Button>
                    </div>
                    {classroomMode === "single" ? (
                        <form className="flex flex-col gap-md" onSubmit={handleCreateClassroom}>
                    <label className="flex flex-col gap-xs text-sm">
                        <span className="font-medium">Nivel</span>
                        <select className="w-full border radius-md bg-surface p-sm" value={classroomForm.level} onChange={event => setClassroomForm(current => ({ ...current, level: event.target.value }))}>
                            <option value="INITIAL">Inicial</option>
                            <option value="PRIMARY">Primaria</option>
                            <option value="SECONDARY">Secundaria</option>
                            <option value="OTHER">Otro</option>
                        </select>
                    </label>
                    <div className="grid grid-cols-2 gap-md">
                        <Input name="classroom-grade" label="Grado" value={classroomForm.grade_label} onChange={event => setClassroomForm(current => ({ ...current, grade_label: event.target.value }))} placeholder="Ej. 1.º" required fullWidth />
                        <Input name="classroom-section" label="Sección" value={classroomForm.section_name} onChange={event => setClassroomForm(current => ({ ...current, section_name: event.target.value }))} placeholder="Ej. A" required fullWidth />
                        <Input name="classroom-grade-order" label="Orden del grado" type="number" min="1" step="1" value={classroomForm.grade_order} onChange={event => setClassroomForm(current => ({ ...current, grade_order: event.target.value }))} helperText="Opcional, para ordenar las aulas." fullWidth />
                        <Input name="classroom-capacity" label="Capacidad" type="number" min="1" step="1" value={classroomForm.capacity} onChange={event => setClassroomForm(current => ({ ...current, capacity: event.target.value }))} helperText="Opcional." fullWidth />
                    </div>
                    <label className="flex flex-col gap-xs text-sm">
                        <span className="font-medium">Estado</span>
                        <select className="w-full border radius-md bg-surface p-sm" value={classroomForm.status} onChange={event => setClassroomForm(current => ({ ...current, status: event.target.value }))}>
                            <option value="ACTIVE">Activa</option>
                            <option value="INACTIVE">Inactiva</option>
                        </select>
                    </label>
                    {formError && <p className="rounded-md bg-error p-md text-sm text-error" role="alert">{formError}</p>}
                    <div className="flex justify-end gap-sm">
                        <Button variant="outline" onClick={closeModal} disabled={saving}>Cancelar</Button>
                        <Button type="submit" icon={School} loading={saving} loadingText="Creando…" disabled={!canManage || !selectedYear}>Crear aula</Button>
                    </div>
                        </form>
                    ) : (
                        <div className="flex flex-col gap-md">
                            <p className="text-sm text-secondary">Importa hasta 500 aulas de una vez. Completa la plantilla con una fila por aula y usa los nombres de nivel indicados en la hoja de referencia.</p>
                            <Button type="button" variant="outline" size="sm" icon={Download} onClick={handleDownloadClassroomTemplate}>
                                Descargar plantilla .xlsx
                            </Button>
                            <Input
                                name="classroom-workbook"
                                label="Archivo Excel (.xlsx)"
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                onChange={handleClassroomWorkbook}
                                helperText="Máximo 5 MB. Las filas se validan antes de guardarse."
                                fullWidth
                            />
                            {bulkClassroomFileName && <p className="text-sm">Archivo: <strong>{bulkClassroomFileName}</strong></p>}
                            {bulkClassroomRows.length > 0 && bulkClassroomErrors.length === 0 && (
                                <p className="rounded-md bg-success p-md text-sm text-success" role="status">
                                    {bulkClassroomRows.length} {bulkClassroomRows.length === 1 ? "aula válida" : "aulas válidas"} listas para importar.
                                </p>
                            )}
                            {bulkClassroomErrors.length > 0 && (
                                <div className="rounded-md bg-error p-md text-sm text-error" role="alert">
                                    <p className="font-medium">Corrige el archivo y vuelve a cargarlo:</p>
                                    <ul className="mt-xs list-disc pl-lg">
                                        {bulkClassroomErrors.slice(0, 12).map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}
                                    </ul>
                                    {bulkClassroomErrors.length > 12 && <p className="mt-xs">Hay {bulkClassroomErrors.length - 12} errores más.</p>}
                                </div>
                            )}
                            {formError && <p className="rounded-md bg-error p-md text-sm text-error" role="alert">{formError}</p>}
                            <div className="flex justify-end gap-sm">
                                <Button variant="outline" onClick={closeModal} disabled={saving}>Cancelar</Button>
                                <Button type="button" icon={FileSpreadsheet} loading={saving} loadingText="Importando…" disabled={!canManage || !selectedYear || !bulkClassroomRows.length || bulkClassroomErrors.length > 0} onClick={handleImportClassrooms}>
                                    Importar {bulkClassroomRows.length || "aulas"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                open={activeModal === "enrollment"}
                onClose={closeModal}
                title="Nueva matrícula"
                description="Asigna un alumno activo a un aula del año seleccionado."
                size="md"
            >
                <form className="flex flex-col gap-md" onSubmit={handleCreateEnrollment}>
                    <div className="rounded-md bg-surface-secondary p-md text-sm">
                        Año académico: <strong>{selectedYear?.name || "Sin año seleccionado"}</strong>
                    </div>
                    <div className="flex flex-col gap-xs text-sm">
                        <label htmlFor="enrollment-student-select" className="font-medium">Alumno</label>
                        <Input
                            name="enrollment-student-search"
                            aria-label="Buscar alumno para matricular"
                            type="search"
                            value={enrollmentStudentSearch}
                            onChange={event => {
                                setEnrollmentStudentSearch(event.target.value);
                                availableStudentPagination.setPage(1);
                            }}
                            placeholder="Buscar por nombre o código"
                            fullWidth
                        />
                        <select id="enrollment-student-select" className="w-full border radius-md bg-surface p-sm" value={enrollmentForm.student_id} onChange={event => setEnrollmentForm(current => ({ ...current, student_id: event.target.value }))} required>
                            <option value="" disabled>Selecciona un alumno</option>
                            {availableStudentOptions.map(student => (
                                <option key={student.id} value={student.id}>
                                    {[student.first_names, student.last_names].filter(Boolean).join(" ") || student.student_code || "Alumno"}
                                </option>
                            ))}
                        </select>
                        <Pagination {...availableStudentPagination} onPageChange={availableStudentPagination.setPage} />
                        {!availableStudents.length && <span className="text-xs text-secondary">No hay alumnos activos disponibles sin matrícula en este año.</span>}
                    </div>
                    <label className="flex flex-col gap-xs text-sm">
                        <span className="font-medium">Aula y sección</span>
                        <select className="w-full border radius-md bg-surface p-sm" value={enrollmentForm.classroom_id} onChange={event => setEnrollmentForm(current => ({ ...current, classroom_id: event.target.value }))} required>
                            <option value="" disabled>Selecciona un aula</option>
                            {availableClassrooms.map(classroom => (
                                <option key={classroom.id} value={classroom.id}>
                                    {classroom.grade_label} {classroom.section_name}
                                </option>
                            ))}
                        </select>
                        {!availableClassrooms.length && <span className="text-xs text-secondary">Crea un aula activa para este año antes de matricular.</span>}
                    </label>
                    <div className="grid grid-cols-2 gap-md">
                        <Input name="enrollment-date" label="Fecha de matrícula" type="date" value={enrollmentForm.enrolled_at} onChange={event => setEnrollmentForm(current => ({ ...current, enrolled_at: event.target.value }))} required fullWidth />
                        <label className="flex flex-col gap-xs text-sm">
                            <span className="font-medium">Estado</span>
                            <select className="w-full border radius-md bg-surface p-sm" value={enrollmentForm.status} onChange={event => setEnrollmentForm(current => ({ ...current, status: event.target.value }))}>
                                <option value="ACTIVE">Activa</option>
                                <option value="INACTIVE">Inactiva</option>
                                <option value="TRANSFERRED">Trasladada</option>
                                <option value="COMPLETED">Completada</option>
                            </select>
                        </label>
                    </div>
                    {formError && <p className="rounded-md bg-error p-md text-sm text-error" role="alert">{formError}</p>}
                    <div className="flex justify-end gap-sm">
                        <Button variant="outline" onClick={closeModal} disabled={saving}>Cancelar</Button>
                        <Button type="submit" icon={GraduationCap} loading={saving} loadingText="Guardando…" disabled={!canManage || !selectedYear || !availableClassrooms.length || !availableStudents.length}>Crear matrícula</Button>
                    </div>
                </form>
            </Modal>

        </div>
    );
}
