'use client';

import { useState } from "react";
import {
    Bell,
    CalendarDays,
    MessageSquare,
    Plus,
    Search,
    Users,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
import { useCommunicationsData } from "@/hooks/useInstitutionData";

const typeLabels = {
    ANNOUNCEMENT: "Anuncio",
    GRADE: "Actualización académica",
    BEHAVIOR: "Convivencia",
    CITATION: "Citación",
    REPORT: "Informe",
    RECOMMENDATION: "Recomendación",
    NOTIFICATION: "Notificación",
};

const priorities = {
    LOW: "Baja",
    NORMAL: "Normal",
    HIGH: "Alta",
    URGENT: "Urgente",
};

const emptyForm = {
    updateType: "ANNOUNCEMENT",
    audienceType: "ALL",
    academicYearId: "",
    targetLevel: "",
    targetGrade: "",
    classroomId: "",
    studentId: "",
    title: "",
    body: "",
    priority: "NORMAL",
    visibleFrom: "",
    visibleUntil: "",
};

function CreateNotificationModal({
    open,
    onClose,
    onCreate,
    academicYears,
    classrooms,
    students,
}) {
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const currentYear = academicYears.find(year => year.status === "ACTIVE")
        || academicYears[0];
    const currentYearId = form.academicYearId || currentYear?.id || "";

    const selectedClassrooms = classrooms.filter(classroom =>
        classroom.academic_year_id === currentYearId
        && classroom.status === "ACTIVE",
    );
    const grades = [...new Map(selectedClassrooms.map(classroom => [
        `${classroom.level}|${classroom.grade_label}`,
        { level: classroom.level, grade: classroom.grade_label },
    ])).values()];
    const levels = [...new Set(grades.map(grade => grade.level))];
    const availableGrades = grades.filter(grade => grade.level === form.targetLevel);

    const update = event => {
        const { name, value } = event.target;
        setForm(current => {
            const next = { ...current, [name]: value };

            if (name === "audienceType") {
                next.academicYearId = currentYearId;
                next.targetLevel = "";
                next.targetGrade = "";
                next.classroomId = "";
                next.studentId = "";
            }

            if (name === "academicYearId") {
                next.targetLevel = "";
                next.targetGrade = "";
                next.classroomId = "";
            }

            if (name === "targetLevel") {
                next.targetGrade = "";
            }

            return next;
        });
    };

    const close = () => {
        if (saving) return;
        setError("");
        setForm(emptyForm);
        onClose();
    };

    const submit = async event => {
        event.preventDefault();
        setError("");
        setSaving(true);

        try {
            await onCreate({
                ...form,
                academicYearId: form.academicYearId || currentYear?.id || "",
                visibleFrom: form.visibleFrom
                    ? new Date(form.visibleFrom).toISOString()
                    : null,
                visibleUntil: form.visibleUntil
                    ? new Date(form.visibleUntil).toISOString()
                    : null,
            });
            setForm(emptyForm);
            onClose();
        } catch (createError) {
            setError(createError.message || "No se pudo crear la comunicación.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={close}
            title="Nueva comunicación"
            description="Se publicará para toda la comunidad de esta institución."
            size="lg"
            closeOnBackdrop={!saving}
        >
            <form className="flex flex-col gap-md" onSubmit={submit}>
                <label className="flex flex-col gap-xs text-sm font-medium">
                    Categoría
                    <select
                        name="updateType"
                        value={form.updateType}
                        onChange={update}
                        className="w-full rounded-lg border bg-white px-md py-sm"
                        required
                    >
                        {Object.entries(typeLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-xs text-sm font-medium">
                    Enviar a
                    <select
                        name="audienceType"
                        value={form.audienceType}
                        onChange={update}
                        className="w-full rounded-lg border bg-white px-md py-sm"
                        required
                    >
                        <option value="ALL">Toda la institución</option>
                        <option value="GRADE">Un grado</option>
                        <option value="CLASSROOM">Una sección</option>
                        <option value="STUDENT">Un alumno</option>
                    </select>
                </label>

                {(form.audienceType === "GRADE"
                    || form.audienceType === "CLASSROOM") && (
                    <label className="flex flex-col gap-xs text-sm font-medium">
                        Año escolar
                        <select
                            name="academicYearId"
                            value={form.academicYearId || currentYear?.id || ""}
                            onChange={update}
                            className="w-full rounded-lg border bg-white px-md py-sm"
                            required
                        >
                            {academicYears.map(year => (
                                <option key={year.id} value={year.id}>
                                    {year.name}{year.status === "ACTIVE" ? " · Activo" : ""}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {form.audienceType === "GRADE" && (
                    <div className="grid grid-cols-2 gap-md">
                        <label className="flex flex-col gap-xs text-sm font-medium">
                            Nivel
                            <select
                                name="targetLevel"
                                value={form.targetLevel}
                                onChange={update}
                                className="w-full rounded-lg border bg-white px-md py-sm"
                                required
                            >
                                <option value="">Selecciona un nivel</option>
                                {levels.map(level => (
                                    <option key={level} value={level}>
                                        {level}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-xs text-sm font-medium">
                            Grado
                            <select
                                name="targetGrade"
                                value={form.targetGrade}
                                onChange={update}
                                className="w-full rounded-lg border bg-white px-md py-sm"
                                required
                                disabled={!form.targetLevel}
                            >
                                <option value="">Selecciona un grado</option>
                                {availableGrades.map(grade => (
                                    <option key={grade.grade} value={grade.grade}>
                                        {grade.grade}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}

                {form.audienceType === "CLASSROOM" && (
                    <label className="flex flex-col gap-xs text-sm font-medium">
                        Sección
                        <select
                            name="classroomId"
                            value={form.classroomId}
                            onChange={update}
                            className="w-full rounded-lg border bg-white px-md py-sm"
                            required
                        >
                            <option value="">Selecciona una sección</option>
                            {selectedClassrooms.map(classroom => (
                                <option key={classroom.id} value={classroom.id}>
                                    {classroom.level} · {classroom.grade_label} {classroom.section_name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {form.audienceType === "STUDENT" && (
                    <label className="flex flex-col gap-xs text-sm font-medium">
                        Alumno
                        <select
                            name="studentId"
                            value={form.studentId}
                            onChange={update}
                            className="w-full rounded-lg border bg-white px-md py-sm"
                            required
                        >
                            <option value="">Selecciona un alumno</option>
                            {students
                                .filter(student => student.status === "ACTIVE")
                                .sort((first, second) =>
                                    `${first.last_names} ${first.first_names}`.localeCompare(
                                        `${second.last_names} ${second.first_names}`,
                                        "es",
                                    ),
                                )
                                .map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.last_names}, {student.first_names}
                                        {student.student_code ? ` · ${student.student_code}` : ""}
                                    </option>
                                ))}
                        </select>
                    </label>
                )}

                <Input
                    name="title"
                    label="Título"
                    value={form.title}
                    onChange={update}
                    placeholder="Escribe el título"
                    maxLength={160}
                    required
                    fullWidth
                />

                <label className="flex flex-col gap-xs text-sm font-medium">
                    Contenido
                    <textarea
                        name="body"
                        value={form.body}
                        onChange={update}
                        rows={5}
                        maxLength={10000}
                        placeholder="Escribe el mensaje para la comunidad"
                        className="w-full rounded-lg border bg-white px-md py-sm text-sm"
                        required
                    />
                </label>

                <label className="flex flex-col gap-xs text-sm font-medium">
                    Prioridad
                    <select
                        name="priority"
                        value={form.priority}
                        onChange={update}
                        className="w-full rounded-lg border bg-white px-md py-sm"
                    >
                        {Object.entries(priorities).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="grid grid-cols-2 gap-md">
                    <Input
                        name="visibleFrom"
                        label="Visible desde"
                        type="datetime-local"
                        value={form.visibleFrom}
                        onChange={update}
                        fullWidth
                    />
                    <Input
                        name="visibleUntil"
                        label="Visible hasta (opcional)"
                        type="datetime-local"
                        value={form.visibleUntil}
                        onChange={update}
                        fullWidth
                    />
                </div>

                {error && (
                    <p role="alert" className="text-sm text-red-600">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-sm">
                    <Button variant="ghost" onClick={close} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        loading={saving}
                        loadingText="Publicando…"
                        icon={Plus}
                    >
                        Publicar
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export default function Page() {
    const [search, setSearch] = useState("");
    const [selectedType, setSelectedType] = useState("ALL");
    const [modalOpen, setModalOpen] = useState(false);
    const [notice, setNotice] = useState("");
    const {
        data = {},
        loading,
        error,
        refresh,
        canManage,
        createNotification,
    } = useCommunicationsData();
    const { student_updates: updates = [] } = data;
    const academicYears = data.academic_years || [];
    const classrooms = data.classrooms || [];
    const students = data.students || [];
    const term = search.trim().toLocaleLowerCase("es-PE");
    const filtered = [...updates]
        .filter(item => selectedType === "ALL" || item.update_type === selectedType)
        .filter(item =>
            !term || `${item.title} ${item.body} ${typeLabels[item.update_type] || ""}`
                .toLocaleLowerCase("es-PE")
                .includes(term),
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const formatDate = value => new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));

    const audienceLabel = item => {
        const audienceType = item.audience_type === "ALL" && item.student_id
            ? "STUDENT"
            : item.audience_type === "ALL" && item.classroom_id
                ? "CLASSROOM"
                : item.audience_type || "ALL";

        if (audienceType === "GRADE") {
            const year = academicYears.find(entry => entry.id === item.academic_year_id);
            return `Grado ${item.target_grade} · ${item.target_level}${year ? ` · ${year.name}` : ""}`;
        }

        if (audienceType === "CLASSROOM") {
            const classroom = classrooms.find(entry => entry.id === item.classroom_id);
            return classroom
                ? `Sección ${classroom.grade_label} ${classroom.section_name}`
                : "Sección específica";
        }

        if (audienceType === "STUDENT") {
            const student = students.find(entry => entry.id === item.student_id);
            return student
                ? `${student.first_names} ${student.last_names}`
                : "Alumno específico";
        }

        return "Toda la institución";
    };

    const stats = [
        {
            label: "Comunicaciones",
            value: updates.length,
            description: "Actualizaciones registradas",
            icon: MessageSquare,
            iconVariant: "primary",
        },
        {
            label: "Anuncios",
            value: updates.filter(item => item.update_type === "ANNOUNCEMENT").length,
            description: "Avisos institucionales",
            icon: Bell,
            iconVariant: "info",
        },
        {
            label: "Citaciones",
            value: updates.filter(item => item.update_type === "CITATION").length,
            description: "Solicitudes de reunión",
            icon: Users,
            iconVariant: "warning",
        },
    ];

    const handleCreate = async values => {
        await createNotification(values);
        setNotice("La comunicación se publicó correctamente.");
    };

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            <PageHeader
                title="Comunicaciones"
                description="Anuncios, citaciones y novedades de la comunidad educativa."
                actions={canManage && (
                    <Button icon={Plus} onClick={() => setModalOpen(true)}>
                        Nueva comunicación
                    </Button>
                )}
            />

            {notice && (
                <p role="status" className="text-sm text-green-700">
                    {notice}
                </p>
            )}

            <section className="grid grid-cols-3 gap-md">
                {stats.map(stat => (
                    <Card
                        key={stat.label}
                        variant="statIcon"
                        title={stat.label}
                        value={stat.value}
                        description={stat.description}
                        icon={stat.icon}
                        iconVariant={stat.iconVariant}
                    />
                ))}
            </section>

            <Card
                variant="default"
                title="Actividad reciente"
                subtitle="Comunicaciones de esta institución"
                icon={MessageSquare}
                iconVariant="info"
            >
                <div className="flex flex-col gap-md">
                    <div className="flex flex-col gap-md sm:flex-row">
                        <Input
                            name="communications-search"
                            aria-label="Buscar comunicaciones"
                            leftIcon={Search}
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Buscar por título o contenido..."
                            fullWidth
                        />
                        <label className="flex items-center gap-sm border radius-md bg-surface px-md">
                            <span className="text-sm text-secondary">Tipo</span>
                            <select
                                className="bg-transparent py-sm"
                                value={selectedType}
                                onChange={event => setSelectedType(event.target.value)}
                            >
                                <option value="ALL">Todos</option>
                                {Object.entries(typeLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {filtered.length ? filtered.map(item => (
                        <article
                            key={item.id}
                            className="flex flex-col gap-sm border-b py-md last:border-0"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-sm">
                                <div className="flex flex-wrap items-center gap-sm">
                                    <span className="text-xs font-semibold text-secondary">
                                        {typeLabels[item.update_type] || item.update_type}
                                    </span>
                                    <span className="rounded-full bg-gray-100 px-sm py-xs text-xs text-secondary">
                                        {audienceLabel(item)}
                                    </span>
                                </div>
                                <span className="inline-flex items-center gap-xs text-xs text-tertiary">
                                    <CalendarDays size={14} />
                                    {formatDate(item.created_at)}
                                </span>
                            </div>
                            <h2 className="text-lg font-semibold">{item.title}</h2>
                            <p className="text-sm text-secondary">{item.body}</p>
                            {item.grade_value != null && (
                                <p className="text-sm font-medium">
                                    Nota registrada: {item.grade_value}
                                </p>
                            )}
                        </article>
                    )) : (
                        <div className="flex flex-col items-center gap-sm rounded-lg border border-dashed p-2xl text-center">
                            <Bell size={28} className="text-tertiary" />
                            <p className="font-semibold">
                                No hay comunicaciones para mostrar
                            </p>
                            <p className="text-sm text-secondary">
                                Cambia los filtros para ver otros resultados.
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            <CreateNotificationModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreate={handleCreate}
                academicYears={academicYears}
                classrooms={classrooms}
                students={students}
            />
        </div>
    );
}
