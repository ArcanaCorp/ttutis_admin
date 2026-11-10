
'use client';

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
import { useDashboardData } from "@/hooks/useInstitutionData";

import {
    GraduationCap,
    School,
    UserRound,
    Users,
    ClipboardCheck,
    CalendarDays,
    Wallet,
    Bell,
    ArrowUpRight,
    Clock3,
    BookOpen,
    CircleCheck,
    CircleAlert,
    Activity,
} from "lucide-react";

export default function Page() {
    const { data = {}, loading, error, refresh } = useDashboardData();
    const {
        students = [],
        memberships = [],
        classrooms = [],
        enrollments = [],
        academic_years = [],
        attendance_events = [],
        student_updates = [],
        student_fees = [],
    } = data;
    const [today, setToday] = useState(null);

    useEffect(() => {
        const timer = window.setTimeout(() => setToday(new Date()), 0);
        return () => window.clearTimeout(timer);
    }, []);

    // ========================================
    // HELPERS
    // ========================================

    const getDate = (value) => {
        if (!value) return null;

        const date = new Date(value);

        return isNaN(date.getTime()) ? null : date;
    };

    const formatDate = (value) => {
        const date = getDate(value);

        if (!date) return "Sin fecha";

        return date.toLocaleDateString("es-PE", {
            timeZone: "America/Lima",
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatTime = (value) => {
        const date = getDate(value);

        if (!date) return "--:--";

        return date.toLocaleTimeString("es-PE", {
            timeZone: "America/Lima",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const isToday = (value) => {
        const date = getDate(value);

        if (!date) return false;

        if (!today) return false;

        return date.toLocaleDateString("en-CA", { timeZone: "America/Lima" }) ===
            today.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    };

    const getStudent = (studentId) => {
        return students.find(student => student.id === studentId);
    };

    const getStudentName = (studentId) => {
        const student = getStudent(studentId);

        if (!student) return "Alumno";

        const directName = [student.first_names, student.last_names].filter(Boolean).join(" ");
        if (directName) return directName;

        const membership = memberships.find(item => item.id === student.membership_id);
        return membership?.full_name || student.student_code || "Alumno";
    };

    const getStatusLabel = (status) => {
        const labels = {
            ACTIVE: "Activo",
            INACTIVE: "Inactivo",
            PENDING: "Pendiente",
            PAID: "Pagado",
            UNPAID: "Pendiente",
            TRANSFERRED: "Trasladado",
            COMPLETED: "Completado",
            PLANNED: "Programado",
            CLOSED: "Finalizado",
        };

        return labels[status] || status || "Sin estado";
    };

    // ========================================
    // FECHA ACTUAL
    // ========================================

    const currentDate = today?.toLocaleDateString("es-PE", {
        timeZone: "America/Lima",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }) || "";

    // ========================================
    // AÑO ESCOLAR
    // ========================================

    const activeAcademicYear = academic_years.find(
        year => year.status === "ACTIVE"
    );

    // ========================================
    // ESTADÍSTICAS GENERALES
    // ========================================

    const totalStudents = students.filter(
        student => student.status === "ACTIVE"
    ).length;

    const totalTeachers = memberships.filter(
        membership =>
            membership.role === "TEACHER" &&
            membership.status === "ACTIVE"
    ).length;

    const totalAssistants = memberships.filter(
        membership =>
            membership.role === "ASSISTANT" &&
            membership.status === "ACTIVE"
    ).length;

    const totalClassrooms = classrooms.filter(
        classroom => classroom.status === "ACTIVE"
    ).length;

    const totalEnrollments = enrollments.filter(
        enrollment => enrollment.status === "ACTIVE"
    ).length;

    const stats = [
        {
            key: "students",
            label: "Alumnos",
            value: totalStudents,
            description: "Alumnos activos",
            icon: Users,
            iconVariant: "primary",
        },
        {
            key: "teachers",
            label: "Docentes",
            value: totalTeachers,
            description: "Personal docente activo",
            icon: GraduationCap,
            iconVariant: "info",
        },
        {
            key: "assistants",
            label: "Auxiliares",
            value: totalAssistants,
            description: "Personal auxiliar activo",
            icon: UserRound,
            iconVariant: "success",
        },
        {
            key: "classrooms",
            label: "Aulas",
            value: totalClassrooms,
            description: "Aulas disponibles",
            icon: School,
            iconVariant: "danger",
        },
    ];

    // ========================================
    // ASISTENCIA
    // ========================================

    const todayAttendance = attendance_events.filter(
        event => isToday(event.occurred_at)
    );

    const todayEntries = todayAttendance.filter(
        event => event.event_type === "ENTRY"
    );

    const todayExits = todayAttendance.filter(
        event => event.event_type === "EXIT"
    );

    const attendancePercentage = totalStudents > 0
        ? Math.min(
            100,
            Math.round((todayEntries.length / totalStudents) * 100)
        )
        : 0;

    // ========================================
    // MATRÍCULAS
    // ========================================

    const enrollmentStats = {
        active: enrollments.filter(
            item => item.status === "ACTIVE"
        ).length,

        transferred: enrollments.filter(
            item => item.status === "TRANSFERRED"
        ).length,

        inactive: enrollments.filter(
            item => item.status === "INACTIVE"
        ).length,

        completed: enrollments.filter(
            item => item.status === "COMPLETED"
        ).length,
    };

    // ========================================
    // PAGOS
    // ========================================

    const paidFees = student_fees.filter(
        fee => Number(fee.paid_amount || (fee.status === "PAID" ? fee.amount : 0)) > 0
    );

    const unpaidFees = student_fees.filter(
        fee => !["PAID", "WAIVED"].includes(fee.status)
            && Number(fee.amount || 0) > Number(fee.paid_amount || 0)
    );

    const totalPaid = paidFees.reduce(
        (total, fee) => total + Number(fee.paid_amount || (fee.status === "PAID" ? fee.amount : 0)),
        0
    );

    const totalPending = unpaidFees.reduce(
        (total, fee) => total + Math.max(0, Number(fee.amount || 0) - Number(fee.paid_amount || 0)),
        0
    );

    // ========================================
    // ACTIVIDAD RECIENTE
    // ========================================

    const recentAttendance = [...attendance_events]
        .sort((a, b) =>
            new Date(b.occurred_at || 0) -
            new Date(a.occurred_at || 0)
        )
        .slice(0, 5);

    const recentUpdates = [...student_updates]
        .sort((a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        )
        .slice(0, 5);

    // ========================================
    // RENDER
    // ========================================

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            <PageHeader
                title="Inicio"
                eyebrow={currentDate}
                description="Aquí tienes el resumen general de tu institución."
                actions={(
                    <div className="flex items-center gap-sm border radius-md bg-surface px-md py-sm">
                        <CalendarDays size={18} />
                        <div>
                            <p className="text-xs text-secondary">Año escolar</p>
                            <p className="text-sm font-medium">{activeAcademicYear?.name || "Sin año activo"}</p>
                        </div>
                    </div>
                )}
            />

            {/* GENERAL STATS */}

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

            {/* ACADEMIC YEAR + ATTENDANCE */}

            <section className="grid grid-cols-3 gap-md">

                {/* ACADEMIC YEAR */}

                <Card
                    variant="default"
                    title="Año escolar"
                    subtitle="Resumen de matrículas"
                    icon={BookOpen}
                    iconVariant="primary"
                >
                    <div className="flex flex-col gap-lg">

                        <div>
                            <p className="text-2xl font-semibold">
                                {activeAcademicYear?.name || "Sin año activo"}
                            </p>

                            <p className="text-sm text-gray-500">
                                {activeAcademicYear
                                    ? `${formatDate(activeAcademicYear.starts_on)} - ${formatDate(activeAcademicYear.ends_on)}`
                                    : "No hay un año escolar activo"}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-md">

                            <div className="rounded-lg p-md bg-gray-50">
                                <p className="text-sm text-gray-500">
                                    Matrículas activas
                                </p>

                                <p className="text-2xl font-semibold">
                                    {enrollmentStats.active}
                                </p>
                            </div>

                            <div className="rounded-lg p-md bg-gray-50">
                                <p className="text-sm text-gray-500">
                                    Traslados
                                </p>

                                <p className="text-2xl font-semibold">
                                    {enrollmentStats.transferred}
                                </p>
                            </div>

                            <div className="rounded-lg p-md bg-gray-50">
                                <p className="text-sm text-gray-500">
                                    Inactivos
                                </p>

                                <p className="text-2xl font-semibold">
                                    {enrollmentStats.inactive}
                                </p>
                            </div>

                            <div className="rounded-lg p-md bg-gray-50">
                                <p className="text-sm text-gray-500">
                                    Completados
                                </p>

                                <p className="text-2xl font-semibold">
                                    {enrollmentStats.completed}
                                </p>
                            </div>

                        </div>
                    </div>
                </Card>

                {/* ATTENDANCE */}

                <div className="xl:col-span-2">
                    <Card
                        variant="default"
                        title="Asistencia de hoy"
                        subtitle="Registro de entradas y salidas"
                        icon={ClipboardCheck}
                        iconVariant="success"
                    >
                        <div className="flex flex-col gap-lg">

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">

                                <div className="rounded-lg p-md bg-gray-50">
                                    <p className="text-sm text-gray-500">
                                        Entradas
                                    </p>

                                    <p className="text-2xl font-semibold">
                                        {todayEntries.length}
                                    </p>
                                </div>

                                <div className="rounded-lg p-md bg-gray-50">
                                    <p className="text-sm text-gray-500">
                                        Salidas
                                    </p>

                                    <p className="text-2xl font-semibold">
                                        {todayExits.length}
                                    </p>
                                </div>

                                <div className="rounded-lg p-md bg-gray-50">
                                    <p className="text-sm text-gray-500">
                                        Registros totales
                                    </p>

                                    <p className="text-2xl font-semibold">
                                        {todayAttendance.length}
                                    </p>
                                </div>

                            </div>

                            <div className="flex flex-col gap-sm">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium">
                                        Entradas respecto a alumnos activos
                                    </p>

                                    <p className="text-sm font-semibold">
                                        {attendancePercentage}%
                                    </p>
                                </div>

                                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-primary"
                                        style={{
                                            width: `${attendancePercentage}%`,
                                        }}
                                    />
                                </div>

                                <p className="text-xs text-gray-500">
                                    {todayEntries.length} de {totalStudents} alumnos
                                </p>
                            </div>

                            <div className="flex items-center gap-sm text-sm text-gray-500">
                                <Activity size={16} />

                                {todayAttendance.length > 0
                                    ? "Hay registros de asistencia para hoy."
                                    : "Todavía no hay registros de asistencia para hoy."}
                            </div>

                        </div>
                    </Card>
                </div>

            </section>

            {/* RECENT ACTIVITY + PAYMENTS */}

            <section className="grid grid-cols-3 gap-md">

                {/* ATTENDANCE ACTIVITY */}

                <div className="xl:col-span-2">
                    <Card
                        variant="default"
                        title="Últimos registros de asistencia"
                        subtitle="Actividad reciente de los alumnos"
                        icon={Clock3}
                        iconVariant="info"
                    >
                        <div className="flex flex-col">

                            {recentAttendance.length > 0 ? (
                                recentAttendance.map(event => (
                                    <div
                                        key={event.id}
                                        className="flex items-center justify-between gap-md py-md border-b last:border-0"
                                    >
                                        <div className="flex items-center gap-md min-w-0">

                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                <UserRound size={18} />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {getStudentName(event.student_id)}
                                                </p>

                                                <p className="text-xs text-gray-500">
                                                    {event.event_type === "ENTRY"
                                                        ? "Entrada registrada"
                                                        : event.event_type === "EXIT"
                                                            ? "Salida registrada"
                                                            : "Movimiento registrado"}
                                                </p>
                                            </div>

                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-medium">
                                                {formatTime(event.occurred_at)}
                                            </p>

                                            <p className="text-xs text-gray-500">
                                                {formatDate(event.occurred_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-xl text-center text-sm text-gray-500">
                                    No hay registros de asistencia disponibles.
                                </div>
                            )}

                        </div>
                    </Card>
                </div>

                {/* PAYMENTS */}

                <Card
                    variant="default"
                    title="Resumen de pagos"
                    subtitle="Estado de los cargos registrados"
                    icon={Wallet}
                    iconVariant="success"
                >
                    <div className="flex flex-col gap-lg">

                        <div>
                            <p className="text-sm text-gray-500">
                                Total recaudado
                            </p>

                            <p className="text-2xl font-semibold">
                                S/ {totalPaid.toFixed(2)}
                            </p>

                            <p className="text-xs text-gray-500">
                                {paidFees.length} cargos pagados
                            </p>
                        </div>

                        <div className="border-t" />

                        <div>
                            <p className="text-sm text-gray-500">
                                Pendiente de pago
                            </p>

                            <p className="text-2xl font-semibold">
                                S/ {totalPending.toFixed(2)}
                            </p>

                            <p className="text-xs text-gray-500">
                                {unpaidFees.length} cargos pendientes
                            </p>
                        </div>

                        <div className="flex items-center gap-sm text-sm text-gray-500">
                            <CircleAlert size={16} />

                            Resumen de los cargos registrados.
                        </div>

                    </div>
                </Card>

            </section>

            {/* STUDENT UPDATES */}

            <section>
                <Card variant="default" title="Últimas actualizaciones" subtitle="Comunicaciones y novedades registradas" icon={Bell} iconVariant="warning">
                    <div className="flex flex-col">

                        {recentUpdates.length > 0 ? (
                            recentUpdates.map(update => (
                                <div
                                    key={update.id}
                                    className="flex items-start gap-md py-md border-b last:border-0"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                        <Bell size={18} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">
                                            {update.title || update.type || "Actualización"}
                                        </p>

                                        <p className="text-sm text-gray-500">
                                            {update.body || update.description || update.content || "Sin descripción disponible."}
                                        </p>

                                        <p className="text-xs text-gray-400 mt-xs">
                                            {formatDate(update.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-xl text-center text-sm text-gray-500">
                                No hay actualizaciones registradas.
                            </div>
                        )}

                    </div>
                </Card>
            </section>

        </div>
    );
}
