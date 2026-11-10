'use client';

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
import { useClassesSchedulesData } from "@/hooks/useInstitutionData";
import {
    BookOpen, CalendarDays, Users, GraduationCap, Clock3, Search,
    Plus, ChevronDown, MoreHorizontal, Pencil, Trash2, Filter,
    LayoutGrid, List, CalendarRange, UserRound, DoorOpen, BookMarked,
    Info, X, Check
} from "lucide-react";

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
    const { data = {}, loading, error, refresh } = useClassesSchedulesData();
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
    const [activeTab, setActiveTab] = useState("classrooms");
    const [selectedLevel, setSelectedLevel] = useState("ALL");
    const [search, setSearch] = useState("");
    const [selectedClassroomId, setSelectedClassroomId] = useState("");
    const [selectedDay, setSelectedDay] = useState(1);
    const [showForm, setShowForm] = useState(false);

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

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
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
                    <Button onClick={openCreate} variant="secondary" icon={Plus}>Nueva configuración</Button>
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
                        <Button size="sm" variant="outline" onClick={openCreate} icon={Plus}>Agregar aula</Button>
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
                                            <MoreHorizontal size={19} className="text-gray-400" />
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
                        <Button size="sm" variant="outline" onClick={openCreate} icon={Plus}>Asignar curso</Button>
                    </div>

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
                                <span>Curso</span><span>Profesor responsable</span><span>Estado</span>
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
                                    <span className="text-xs rounded-full bg-green-50 text-green-700 px-2.5 py-1">Asignado</span>
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
                        <Button size="sm" variant="outline" onClick={openCreate} icon={Plus}>Agregar horario</Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-md">
                        <div className="sm:w-64">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Aula o sección</label>
                            <select
                                value={selectedClassroom?.id || ""}
                                onChange={event => setSelectedClassroomId(event.target.value)}
                                className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white outline-none"
                            >
                                {yearClassrooms.map(classroom => (
                                    <option key={classroom.id} value={classroom.id}>{getClassroomName(classroom)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {weekdays.map(day => (
                                <Button
                                    key={day.value}
                                    size="sm"
                                    variant={selectedDay === day.value ? "secondary" : "outline"}
                                    onClick={() => setSelectedDay(day.value)}
                                >
                                    <span className="hidden sm:inline">{day.label}</span>
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
                                            <span className="text-xs text-gray-500 inline-flex items-center gap-xs">
                                                <DoorOpen size={14} /> {schedule.classroom_label || "Aula por definir"}
                                            </span>
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
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={event => {
                    if (event.target === event.currentTarget) setShowForm(false);
                }}>
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
                        <div className="flex items-start justify-between gap-md">
                            <div>
                                <h3 className="text-lg font-semibold">Nueva configuración</h3>
                                <p className="text-sm text-gray-500 mt-1">Elige qué deseas configurar.</p>
                            </div>
                            <Button variant="ghost" icon={X} iconOnly accessibilityLabel="Cerrar" onClick={() => setShowForm(false)} />
                        </div>
                        <div className="grid gap-sm mt-5">
                            {[
                                { tab: "classrooms", title: "Crear aula o sección", description: "Registra un nivel, grado y sección.", icon: DoorOpen },
                                { tab: "courses", title: "Asignar curso y profesor", description: "Vincula un curso con un aula y docente.", icon: BookOpen },
                                { tab: "schedules", title: "Configurar horario", description: "Programa el día y la hora de una clase.", icon: Clock3 },
                            ].map(option => {
                                const Icon = option.icon;
                                return (
                                    <Button
                                        key={option.tab}
                                        onClick={() => {
                                            setActiveTab(option.tab);
                                            setShowForm(false);
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
                    </div>
                </div>
            )}
            
        </div>
    );
}
