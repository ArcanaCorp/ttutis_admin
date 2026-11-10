
'use client';

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
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
} from "lucide-react";

export default function Page() {
    const { data = {}, loading, error, refresh } = useSchoolYearData();
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

    const activeEnrollments = yearEnrollments.filter(
        item => item.status === "ACTIVE"
    );

    const transferredEnrollments = yearEnrollments.filter(
        item => item.status === "TRANSFERRED"
    );

    const inactiveEnrollments = yearEnrollments.filter(
        item => item.status === "INACTIVE"
    );

    const completedEnrollments = yearEnrollments.filter(
        item => item.status === "COMPLETED"
    );

    const activeClassrooms = yearClassrooms.filter(
        classroom => classroom.status === "ACTIVE"
    );

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
        return activeEnrollments.filter(
            enrollment =>
                enrollment.classroom_id === classroom.id
        ).length;
    };

    const getClassroomGrade = (classroom) => {
        return classroom.level || "Sin nivel";
    };

    const getClassroomSection = (classroom) => {
        return classroom.section_name || "Sin sección";
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
                actions={<Button variant="outline" icon={CalendarDays}>Nuevo año escolar</Button>}
            />

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
                        academic_years.map(year => {
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
                        <h2 className="text-lg font-semibold">
                            Aulas y secciones
                        </h2>

                        <p className="text-sm text-gray-500">
                            Organización académica del año seleccionado.
                        </p>
                    </div>

                    <Button variant="outline" icon={School}>Nueva aula</Button>
                </div>

                <div className="border rounded-xl overflow-hidden">

                    {yearClassrooms.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left p-md font-medium">
                                            Aula
                                        </th>

                                        <th className="text-left p-md font-medium">
                                            Nivel
                                        </th>

                                        <th className="text-left p-md font-medium">
                                            Grado
                                        </th>

                                        <th className="text-left p-md font-medium">
                                            Sección
                                        </th>

                                        <th className="text-left p-md font-medium">
                                            Alumnos
                                        </th>

                                        <th className="text-left p-md font-medium">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {yearClassrooms.map(classroom => {
                                        const studentCount = getClassroomStudents(classroom);

                                        return (
                                            <tr
                                                key={classroom.id}
                                                className="border-t"
                                            >
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

        </div>
    );
}
