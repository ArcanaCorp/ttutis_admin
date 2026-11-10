'use client';

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
import Modal from "@/components/ui/Modal";
import { useClassesSchedulesData } from "@/hooks/useInstitutionData";
import {
    BookOpen, CalendarDays, Users, GraduationCap, Clock3, Search,
    Plus, ChevronDown, Pencil, Trash2, Filter, FileSpreadsheet,
    LayoutGrid, CalendarRange, UserRound, DoorOpen, BookMarked,
    Info
} from "lucide-react";
import AcademicRecordModal from "@/components/academic/AcademicRecordModal";

const levelLabels = {
    INITIAL: "Inicial",
    PRIMARY: "Primaria",
    SECONDARY: "Secundaria",
    OTHER: "Otro",
};

const weekdays = [
    { value: 1, label: "Lunes", short: "Lun" },
    { value: 2, label: "Martes", short: "Mar" },
    { value: 3, label: "Miércoles", short: "Mié" },
    { value: 4, label: "Jueves", short: "Jue" },
    { value: 5, label: "Viernes", short: "Vie" },
    { value: 6, label: "Sábado", short: "Sáb" },
    { value: 7, label: "Domingo", short: "Dom" },
];

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function Page() {
    const { data = {}, loading, error, refresh, canManage, createRecords, updateRecord, deleteRecord } = useClassesSchedulesData();
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
    const [activeTab, setActiveTab] = useState("classrooms");
    const [selectedLevel, setSelectedLevel] = useState("ALL");
    const [search, setSearch] = useState("");
    const [selectedClassroomId, setSelectedClassroomId] = useState("");
    const [selectedDay, setSelectedDay] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [recordForm, setRecordForm] = useState({ open: false, kind: "classroom", record: null });
    const [actionError, setActionError] = useState("");
    const [actionNotice, setActionNotice] = useState("");

    const academicYears = data.academic_years || [];
    const classrooms = data.classrooms || [];
    const subjects = data.subjects || [];
    const memberships = data.memberships || [];
    const assignments = data.course_assignments || [];
    const schedules = data.schedules || [];
    const enrollments = data.enrollments || [];
    const hasSelectedAcademicYear = academicYears.some(year => year.id === selectedAcademicYearId);
    const academicYearId = (hasSelectedAcademicYear ? selectedAcademicYearId : null)
        || academicYears.find(year => year.status === "ACTIVE")?.id
        || academicYears[0]?.id
        || "";

    const activeYear = academicYears.find(year => year.id === academicYearId);
    const yearClassrooms = classrooms.filter(item =>
        item.academic_year_id === academicYearId
    );

    const getClassroomName = classroom => {
        if (!classroom) return "Aula sin asignar";
        return `${classroom.grade_label} ${classroom.section_name}`;
    };

    const getTeacher = membershipId =>
        memberships.find(item => item.id === membershipId)?.full_name || "Sin profesor";

    const getSubject = subjectId =>
        subjects.find(item => item.id === subjectId)?.name || "Curso sin nombre";

    const getClassroom = classroomId =>
        classrooms.find(item => item.id === classroomId);

    const getStudentsCount = classroomId =>
        enrollments.filter(item =>
            item.classroom_id === classroomId &&
            item.academic_year_id === academicYearId &&
            item.status === "ACTIVE"
        ).length;

    const filteredClassrooms = (() => {
        const term = search.trim().toLowerCase();
        return yearClassrooms.filter(item => {
            const matchesLevel = selectedLevel === "ALL" || item.level === selectedLevel;
            const matchesSearch = !term ||
                `${item.grade_label} ${item.section_name} ${levelLabels[item.level] || ""}`
                    .toLowerCase().includes(term);
            return matchesLevel && matchesSearch;
        });
    })();

    const yearAssignments = assignments.filter(item =>
        item.academic_year_id === academicYearId &&
        item.status === "ACTIVE"
    );

    const yearSchedules = schedules.filter(item => {
        const assignment = assignments.find(row => row.id === item.course_assignment_id);
        return assignment?.academic_year_id === academicYearId && item.status === "ACTIVE";
    });

    const selectedClassroom = getClassroom(selectedClassroomId) ||
        yearClassrooms[0] || null;

    const classroomAssignments = yearAssignments.filter(item =>
        item.classroom_id === selectedClassroom?.id
    );

    const daySchedules = yearSchedules
        .filter(item => {
            const assignment = assignments.find(row => row.id === item.course_assignment_id);
            return item.weekday === selectedDay &&
                (!selectedClassroom || assignment?.classroom_id === selectedClassroom.id);
        })
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

    const stats = [
        {
            label: "Aulas y secciones",
            value: yearClassrooms.length,
            detail: "En este año escolar",
            icon: DoorOpen,
            iconVariant: "info",
        },
        {
            label: "Cursos asignados",
            value: yearAssignments.length,
            detail: "Por aula y sección",
            icon: BookOpen,
            iconVariant: "primary",
        },
        {
            label: "Profesores asignados",
            value: new Set(yearAssignments.map(item => item.teacher_membership_id)).size,
            detail: "Con cursos a cargo",
            icon: Users,
            iconVariant: "success",
        },
        {
            label: "Bloques de horario",
            value: yearSchedules.length,
            detail: "Clases programadas",
            icon: Clock3,
            iconVariant: "warning",
        },
    ];

    const tabs = [
        { id: "classrooms", label: "Aulas y secciones", icon: LayoutGrid },
        { id: "courses", label: "Cursos y profesores", icon: BookMarked },
        { id: "schedules", label: "Horarios", icon: CalendarRange },
    ];

    const openCreate = () => setShowForm(true);
    const openRecordForm = (kind, record = null) => {
        setActionError("");
        setActionNotice("");
        setRecordForm({ open: true, kind, record });
    };
    const saveAcademicRecord = async (kind, values, id) => {
        if (id) await updateRecord(kind, id, values);
        else await createRecords(kind, values);
        setActionNotice("Los cambios se guardaron correctamente.");
    };
    const removeAcademicRecord = async (kind, record, label) => {
        if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
        setActionError("");
        setActionNotice("");
        try {
            await deleteRecord(kind, record.id);
            setActionNotice("El registro se eliminó correctamente.");
        } catch (deleteError) {
            setActionError(deleteError.message || "No se pudo eliminar el registro.");
        }
    };
    const startCreation = kind => {
        setShowForm(false);
        openRecordForm(kind);
    };

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            {(actionError || actionNotice) && <div className={cx("rounded-lg border p-3 text-sm", actionError ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800")} role={actionError ? "alert" : "status"}>{actionError || actionNotice}</div>}
            <PageHeader
                title="Clases y horarios"
                eyebrow="Gestión académica"
                description="Organiza las aulas, asigna cursos y profesores, y configura los horarios."
                actions={(
                    <>
                    <label className="relative">
                        <span className="sr-only">Año escolar</span>
                        <select
                            value={academicYearId}
                            onChange={event => {
                                setSelectedAcademicYearId(event.target.value);
                                setSelectedClassroomId("");
                            }}
                            className="appearance-none border rounded-lg bg-white pl-3 pr-9 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100"
                        >
                            {academicYears.map(year => (
                                <option key={year.id} value={year.id}>{year.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                    </label>
                    <Button onClick={openCreate} variant="secondary" icon={Plus} disabled={!canManage} title={!canManage ? "Requiere una membresía administradora activa" : undefined}>Nueva configuración</Button>
                    </>
                )}
            />

            {/* Resumen */}
            <section className="grid grid-cols-2 xl:grid-cols-4 gap-md">
                {stats.map(stat => <Card key={stat.label} variant="statIcon" title={stat.label} value={stat.value} description={stat.detail} icon={stat.icon} iconVariant={stat.iconVariant} />)}
            </section>

            {/* Año escolar */}
            {activeYear && (
                <div className="flex flex-wrap items-center justify-between gap-sm rounded-xl border bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-sm">
                        <CalendarDays size={18} className="text-gray-500" />
                        <div>
                            <p className="text-sm font-medium text-gray-800">{activeYear.name}</p>
                            <p className="text-xs text-gray-500">
                                {activeYear.starts_on} — {activeYear.ends_on}
                            </p>
                        </div>
                    </div>
                    <span className={cx(
                        "text-xs font-medium px-2.5 py-1 rounded-full",
                        activeYear.status === "ACTIVE"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-200 text-gray-600"
                    )}>
                        {activeYear.status === "ACTIVE" ? "En curso" : "Planificado"}
                    </span>
                </div>
            )}

            {/* Navegación interna */}
            <nav className="academic-tabs" aria-label="Secciones de clases y horarios">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <Button key={tab.id} size="sm" variant={active ? "primarySoft" : "ghost"} onClick={() => setActiveTab(tab.id)} icon={Icon} aria-pressed={active}>{tab.label}</Button>
                    );
                })}
            </nav>

            {/* Aulas y secciones */}
            {activeTab === "classrooms" && (
                <div className="flex flex-col gap-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
                        <div>
                            <h2 className="text-lg font-semibold">Aulas y secciones</h2>
                            <p className="text-sm text-gray-500">Administra los niveles, grados y secciones del colegio.</p>
                        </div>
                        <div className="flex gap-sm"><Button size="sm" variant="outline" icon={FileSpreadsheet} onClick={() => openRecordForm("classroom")} disabled={!canManage}>Importar aulas</Button><Button size="sm" variant="outline" onClick={() => openRecordForm("classroom")} icon={Plus} disabled={!canManage}>Agregar aula</Button></div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-sm">
                        <Input name="classroom-search" aria-label="Buscar grado o sección" leftIcon={Search} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar grado o sección..." fullWidth />
                        <div className="flex items-center gap-xs border rounded-lg px-2">
                            <Filter size={15} className="text-gray-400 ml-1" />
                            <select
                                value={selectedLevel}
                                onChange={event => setSelectedLevel(event.target.value)}
                                className="bg-transparent py-2.5 pr-2 text-sm outline-none"
                            >
                                <option value="ALL">Todos los niveles</option>
                                <option value="INITIAL">Inicial</option>
                                <option value="PRIMARY">Primaria</option>
                                <option value="SECONDARY">Secundaria</option>
                            </select>
                        </div>
                    </div>

                    {filteredClassrooms.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
                            {filteredClassrooms.map(classroom => {
                                const count = getStudentsCount(classroom.id);
                                const isSelected = selectedClassroom?.id === classroom.id;
                                return (
                                    <Card
                                        key={classroom.id}
                                        onClick={() => {
                                            setSelectedClassroomId(classroom.id);
                                            setActiveTab("courses");
                                        }}
                                        className={cx(
                                            "academic-classroom",
                                            isSelected && "academic-classroom--selected"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-sm">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <GraduationCap size={20} />
                                            </div>
                                            <div className="flex gap-xs" onClick={event => event.stopPropagation()}>
                                                <Button size="xs" variant="ghost" icon={Pencil} iconOnly accessibilityLabel="Editar aula" onClick={() => openRecordForm("classroom", classroom)} disabled={!canManage} />
                                                <Button size="xs" variant="ghost" icon={Trash2} iconOnly accessibilityLabel="Eliminar aula" onClick={() => removeAcademicRecord("classroom", classroom, `el aula ${getClassroomName(classroom)}`)} disabled={!canManage || enrollments.some(item => item.classroom_id === classroom.id) || assignments.some(item => item.classroom_id === classroom.id)} title={enrollments.some(item => item.classroom_id === classroom.id) || assignments.some(item => item.classroom_id === classroom.id) ? "Elimina primero matrículas y asignaciones vinculadas" : "Eliminar aula"} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-4">{levelLabels[classroom.level] || classroom.level}</p>
                                        <h3 className="text-lg font-semibold mt-1">{getClassroomName(classroom)}</h3>
                                        <div className="flex items-center justify-between gap-sm mt-4 pt-3 border-t text-sm">
                                            <span className="inline-flex items-center gap-xs text-gray-500">
                                                <Users size={15} /> {count} estudiantes
                                            </span>
                                            <span className="text-gray-400">
                                                Cap. {classroom.capacity || "—"}
                                            </span>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="border border-dashed rounded-xl py-12 text-center">
                            <DoorOpen size={28} className="mx-auto text-gray-300" />
                            <p className="font-medium mt-3">No hay aulas para mostrar</p>
                            <p className="text-sm text-gray-500 mt-1">Prueba con otro filtro o agrega una nueva aula.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Cursos y profesores */}
            {activeTab === "courses" && (
                <div className="flex flex-col gap-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
                        <div>
                            <h2 className="text-lg font-semibold">Cursos y profesores</h2>
                            <p className="text-sm text-gray-500">Consulta qué cursos se dictan en cada aula y quién está a cargo.</p>
                        </div>
                        <div className="flex flex-wrap gap-sm"><Button size="sm" variant="outline" icon={FileSpreadsheet} onClick={() => openRecordForm("assignment")} disabled={!canManage}>Importar asignaciones</Button><Button size="sm" variant="outline" icon={Plus} onClick={() => openRecordForm("subject")} disabled={!canManage}>Nuevo curso</Button><Button size="sm" variant="outline" onClick={() => openRecordForm("assignment")} icon={Plus} disabled={!canManage}>Asignar curso</Button></div>
                    </div>

                    <Card variant="default" title="Catálogo de cursos" subtitle="Cursos disponibles para asignar en el año escolar." icon={BookMarked} iconVariant="primary">
                        <div className="flex flex-col gap-sm">
                            <div className="flex justify-end gap-sm"><Button size="sm" variant="outline" icon={FileSpreadsheet} onClick={() => openRecordForm("subject")} disabled={!canManage}>Importar cursos</Button><Button size="sm" variant="outline" icon={Plus} onClick={() => openRecordForm("subject")} disabled={!canManage}>Nuevo curso</Button></div>
                            {subjects.length ? subjects.map(subject => <div key={subject.id} className="flex items-center justify-between gap-md border-t py-sm"><div className="min-w-0"><p className="truncate text-sm font-medium">{subject.name}</p><p className="text-xs text-gray-500">{subject.code || "Sin código"}{subject.description ? ` · ${subject.description}` : ""}</p></div><div className="flex gap-xs"><Button size="xs" variant="ghost" icon={Pencil} iconOnly accessibilityLabel={`Editar curso ${subject.name}`} onClick={() => openRecordForm("subject", subject)} disabled={!canManage}/><Button size="xs" variant="ghost" icon={Trash2} iconOnly accessibilityLabel={`Eliminar curso ${subject.name}`} onClick={() => removeAcademicRecord("subject", subject, `el curso ${subject.name}`)} disabled={!canManage || assignments.some(item => item.subject_id === subject.id)} title={assignments.some(item => item.subject_id === subject.id) ? "Elimina primero las asignaciones asociadas" : "Eliminar curso"}/></div></div>) : <p className="border-t py-md text-sm text-gray-500">Todavía no hay cursos. Registra uno o importa una lista desde Excel.</p>}
                        </div>
                    </Card>

                    <div className="flex flex-col sm:flex-row gap-md">
                        <div className="sm:w-64">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Aula o sección</label>
                            <select
                                value={selectedClassroom?.id || ""}
                                onChange={event => setSelectedClassroomId(event.target.value)}
                                className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white outline-none"
                            >
                                {yearClassrooms.map(classroom => (
                                    <option key={classroom.id} value={classroom.id}>
                                        {getClassroomName(classroom)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 rounded-xl bg-gray-50 border px-4 py-3 flex items-center justify-between gap-md">
                            <div>
                                <p className="text-xs text-gray-500">Sección seleccionada</p>
                                <p className="font-semibold mt-1">{selectedClassroom ? getClassroomName(selectedClassroom) : "Sin aulas"}</p>
                            </div>
                            <span className="text-xs text-gray-500">{classroomAssignments.length} cursos asignados</span>
                        </div>
                    </div>

                    {classroomAssignments.length ? (
                        <div className="border rounded-xl overflow-hidden">
                            <div className="grid grid-cols-[1.2fr_1fr_auto] gap-md bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <span>Curso</span><span>Profesor responsable</span><span>Acciones</span>
                            </div>
                            {classroomAssignments.map(assignment => (
                                <div key={assignment.id} className="grid grid-cols-[1.2fr_1fr_auto] gap-md items-center px-4 py-4 border-t">
                                    <div className="flex items-center gap-sm min-w-0">
                                        <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                                            <BookOpen size={17} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{getSubject(assignment.subject_id)}</p>
                                            <p className="text-xs text-gray-400">Asignación académica</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-sm min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                            <UserRound size={15} className="text-gray-500" />
                                        </div>
                                        <span className="text-sm truncate">{getTeacher(assignment.teacher_membership_id)}</span>
                                    </div>
                                    <div className="flex items-center gap-xs"><span className="text-xs rounded-full bg-green-50 text-green-700 px-2.5 py-1">Asignado</span><Button size="xs" variant="ghost" icon={Pencil} iconOnly accessibilityLabel="Editar asignación" onClick={() => openRecordForm("assignment", assignment)} disabled={!canManage} /><Button size="xs" variant="ghost" icon={Trash2} iconOnly accessibilityLabel="Eliminar asignación" onClick={() => removeAcademicRecord("assignment", assignment, `la asignación de ${getSubject(assignment.subject_id)}`)} disabled={!canManage || schedules.some(item => item.course_assignment_id === assignment.id)} title={schedules.some(item => item.course_assignment_id === assignment.id) ? "Elimina primero los horarios asociados" : "Eliminar asignación"} /></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="border border-dashed rounded-xl py-12 text-center">
                            <BookMarked size={28} className="mx-auto text-gray-300" />
                            <p className="font-medium mt-3">Aún no hay cursos asignados</p>
                            <p className="text-sm text-gray-500 mt-1">Asigna cursos y profesores a esta sección.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Horarios */}
            {activeTab === "schedules" && (
                <div className="flex flex-col gap-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
                        <div>
                            <h2 className="text-lg font-semibold">Horarios de clase</h2>
                            <p className="text-sm text-gray-500">Revisa la distribución semanal de cursos por aula.</p>
                        </div>
                        <div className="flex gap-sm"><Button size="sm" variant="outline" icon={FileSpreadsheet} onClick={() => openRecordForm("schedule")} disabled={!canManage}>Importar horarios</Button><Button size="sm" variant="outline" onClick={() => openRecordForm("schedule")} icon={Plus} disabled={!canManage}>Agregar horario</Button></div>
                    </div>

                    <div className="flex flex-row items-end justify-between gap-md">
                        <div className="sm:w-64">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Aula o sección</label>
                            <select value={selectedClassroom?.id || ""} onChange={event => setSelectedClassroomId(event.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white outline-none">
                                {yearClassrooms.map(classroom => (
                                    <option key={classroom.id} value={classroom.id}>{getClassroomName(classroom)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {weekdays.map(day => (
                                <Button key={day.value} size="sm" variant={selectedDay === day.value ? "secondary" : "outline"} onClick={() => setSelectedDay(day.value)}>
                                    <span className="">{day.label}</span>
                                    <span className="sm:hidden">{day.short}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="border rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between gap-md px-4 py-3 bg-gray-50 border-b">
                            <div>
                                <p className="font-semibold text-sm">{weekdays.find(day => day.value === selectedDay)?.label}</p>
                                <p className="text-xs text-gray-500">{selectedClassroom ? getClassroomName(selectedClassroom) : "Selecciona un aula"}</p>
                            </div>
                            <span className="text-xs text-gray-500">{daySchedules.length} clases</span>
                        </div>
                        {daySchedules.length ? (
                            <div className="divide-y">
                                {daySchedules.map(schedule => {
                                    const assignment = assignments.find(item => item.id === schedule.course_assignment_id);
                                    return (
                                        <div key={schedule.id} className="flex flex-col sm:flex-row sm:items-center gap-md px-4 py-4">
                                            <div className="sm:w-32 shrink-0">
                                                <p className="text-sm font-semibold tabular-nums">{schedule.start_time.slice(0, 5)} – {schedule.end_time.slice(0, 5)}</p>
                                                <p className="text-xs text-gray-400 mt-1">Bloque de clase</p>
                                            </div>
                                            <div className="w-1 self-stretch min-h-12 rounded-full bg-blue-500 hidden sm:block" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold">{getSubject(assignment?.subject_id)}</p>
                                                <p className="text-xs text-gray-500 mt-1">{getTeacher(assignment?.teacher_membership_id)}</p>
                                            </div>
                                            <div className="flex items-center gap-sm"><span className="text-xs text-gray-500 inline-flex items-center gap-xs"><DoorOpen size={14} /> {schedule.classroom_label || "Aula por definir"}</span><Button size="xs" variant="ghost" icon={Pencil} iconOnly accessibilityLabel="Editar horario" onClick={() => openRecordForm("schedule", schedule)} disabled={!canManage} /><Button size="xs" variant="ghost" icon={Trash2} iconOnly accessibilityLabel="Eliminar horario" onClick={() => removeAcademicRecord("schedule", schedule, "el horario")} disabled={!canManage} /></div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <CalendarRange size={28} className="mx-auto text-gray-300" />
                                <p className="font-medium mt-3">No hay clases programadas</p>
                                <p className="text-sm text-gray-500 mt-1">No existen horarios registrados para este día y sección.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Nota informativa */}
            <div className="flex items-start gap-md p-md rounded-lg border bg-white">
                <Info size={18} className="shrink-0 mt-0.5 text-gray-500" />
                <div>
                    <p className="text-sm font-medium">Configuración académica</p>
                    <p className="text-sm text-gray-500 mt-1">
                        Los cambios de aulas, cursos, profesores y horarios se organizan por año escolar.
                        Verifica que estés trabajando en el periodo correcto antes de realizar una configuración.
                    </p>
                </div>
            </div>

            {/* Modal de acción inicial */}
            <Modal
                open={showForm}
                onClose={() => setShowForm(false)}
                title="Nueva configuración"
                description="Elige qué deseas configurar."
            >
                <div className="grid gap-sm">
                    {[
                        { tab: "classrooms", kind: "classroom", title: "Crear aula o sección", description: "Registra un nivel, grado y sección.", icon: DoorOpen },
                        { tab: "courses", kind: "assignment", title: "Asignar curso y profesor", description: "Vincula un curso con un aula y docente.", icon: BookOpen },
                        { tab: "schedules", kind: "schedule", title: "Configurar horario", description: "Programa el día y la hora de una clase.", icon: Clock3 },
                    ].map(option => {
                        const Icon = option.icon;
                        return (
                            <Button
                                key={option.tab}
                                onClick={() => {
                                    setActiveTab(option.tab);
                                    startCreation(option.kind);
                                }}
                                variant="ghost"
                                fullWidth
                                className="academic-choice"
                            >
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                                    <Icon size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold">{option.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                                </div>
                                <ChevronDown size={16} className="-rotate-90 text-gray-400" />
                            </Button>
                        );
                    })}
                </div>
            </Modal>
            <AcademicRecordModal
                open={recordForm.open}
                onClose={() => setRecordForm(current => ({ ...current, open: false }))}
                kind={recordForm.kind}
                record={recordForm.record}
                yearId={academicYearId}
                data={data}
                onSave={saveAcademicRecord}
            />
            
        </div>
    );
}
