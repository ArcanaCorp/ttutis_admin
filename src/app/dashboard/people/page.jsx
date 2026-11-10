
'use client';

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
import { usePeopleData } from "@/hooks/useInstitutionData";

import {
    Users,
    GraduationCap,
    UserRound,
    Search,
    Plus,
    School,
    Filter,
    ChevronRight,
    Mail,
    Phone,
    UserCheck,
} from "lucide-react";

export default function Page() {
    const { data = {}, loading, error, refresh } = usePeopleData();
    const { memberships = [], students = [], guardian_student_links = [], enrollments = [], classrooms = [] } = data;

    const [search, setSearch] = useState("");
    const [selectedType, setSelectedType] = useState("ALL");

    // ========================================
    // HELPERS
    // ========================================

    const getInitials = (name) => {
        return name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0])
            .join("")
            .toUpperCase();
    };

    const getStatus = (status) => {
        const statuses = {
            ACTIVE: {
                label: "Activo",
                className: "bg-green-50 text-green-700",
            },
            INACTIVE: {
                label: "Inactivo",
                className: "bg-gray-100 text-gray-600",
            },
            TRANSFERRED: {
                label: "Trasladado",
                className: "bg-gray-100 text-gray-600",
            },
            GRADUATED: {
                label: "Egresado",
                className: "bg-gray-100 text-gray-600",
            },
            PENDING: {
                label: "Pendiente",
                className: "bg-yellow-50 text-yellow-700",
            },
            PROVISIONING: {
                label: "En preparación",
                className: "bg-yellow-50 text-yellow-700",
            },
            SUSPENDED: {
                label: "Suspendido",
                className: "bg-gray-100 text-gray-600",
            },
            REVOKED: {
                label: "Revocado",
                className: "bg-gray-100 text-gray-600",
            },
            REJECTED: {
                label: "Rechazado",
                className: "bg-gray-100 text-gray-600",
            },
        };

        return statuses[status] || {
            label: status || "Sin estado",
            className: "bg-gray-100 text-gray-600",
        };
    };

    const getRoleLabel = (role) => {
        const roles = {
            TEACHER: "Docente",
            ASSISTANT: "Auxiliar",
            ADMIN: "Administrador",
        };

        return roles[role] || role || "Personal";
    };

    // ========================================
    // CONSTRUIR DIRECTORIO
    // ========================================

    const people = (() => {
        const result = [];

        // ALUMNOS

        students.forEach(student => {
            const membership = memberships.find(item => item.id === student.membership_id);
            const name = [student.first_names, student.last_names].filter(Boolean).join(" ") || membership?.full_name || "Sin nombre";
            const enrollment = enrollments.find(item => item.student_id === student.id && item.status === "ACTIVE");
            const classroom = classrooms.find(item => item.id === enrollment?.classroom_id);

            result.push({
                id: `student-${student.id}`,
                name,
                code: student.student_code,
                email: student.email || membership?.email,
                phone: student.phone,
                status: student.status,
                type: "STUDENT",
                typeLabel: "Alumno",
                detail: classroom ? `${classroom.grade_label} ${classroom.section_name}` : "Estudiante",
            });
        });

        // DOCENTES, AUXILIARES Y PERSONAL

        memberships.forEach(membership => {
            const role = membership.role;

            if (role === "STUDENT" || students.some(student => student.membership_id === membership.id)) return;

            result.push({
                id: `membership-${membership.id}`,
                profileId: membership.profile_id,
                name: membership.full_name,
                code: membership.login_code,
                email: membership.email,
                phone: null,
                status: membership.status,
                type: role,
                typeLabel: getRoleLabel(role),
                detail: getRoleLabel(role),
            });
        });

        // APODERADOS

        const guardianProfileIds = [...new Set(guardian_student_links.map(link => link.guardian_profile_id).filter(Boolean))];

        guardianProfileIds.forEach(profileId => {
            const guardianMembership = memberships.find(item => item.profile_id === profileId);
            const guardianLinks = guardian_student_links.filter(link => link.guardian_profile_id === profileId);

            result.push({
                id: `guardian-${profileId}`,
                profileId,
                name: guardianMembership?.full_name || "Apoderado",
                code: guardianMembership?.login_code,
                email: guardianMembership?.email,
                phone: null,
                status: guardianLinks.some(link => link.status === "ACTIVE") ? "ACTIVE" : "PENDING",
                type: "GUARDIAN",
                typeLabel: "Apoderado",
                detail: guardianLinks[0]?.relationship || "Apoderado",
            });
        });

        return result;
    })();

    // ========================================
    // CONTADORES
    // ========================================

    const totalStudents = students.length;

    const totalTeachers = memberships.filter(
        item => item.role === "TEACHER"
    ).length;

    const totalAssistants = memberships.filter(
        item => item.role === "ASSISTANT"
    ).length;

    const totalGuardians = new Set(
        guardian_student_links.map(link => link.guardian_profile_id).filter(Boolean)
    ).size;

    const stats = [
        {
            key: "students",
            label: "Alumnos",
            value: totalStudents,
            description: "Alumnos registrados",
            icon: Users,
            iconVariant: "primary",
        },
        {
            key: "teachers",
            label: "Docentes",
            value: totalTeachers,
            description: "Docentes registrados",
            icon: GraduationCap,
            iconVariant: "info",
        },
        {
            key: "assistants",
            label: "Auxiliares",
            value: totalAssistants,
            description: "Auxiliares registrados",
            icon: UserRound,
            iconVariant: "success",
        },
        {
            key: "guardians",
            label: "Apoderados",
            value: totalGuardians,
            description: "Apoderados registrados",
            icon: UserCheck,
            iconVariant: "danger",
        },
    ];

    // ========================================
    // FILTROS
    // ========================================

    const filters = [
        { key: "ALL", label: "Todos", count: people.length },
        { key: "STUDENT", label: "Alumnos", count: totalStudents },
        { key: "TEACHER", label: "Docentes", count: totalTeachers },
        { key: "ASSISTANT", label: "Auxiliares", count: totalAssistants },
        { key: "GUARDIAN", label: "Apoderados", count: totalGuardians },
    ];

    const filteredPeople = people.filter(person => {
        const matchesType =
            selectedType === "ALL" ||
            person.type === selectedType;

        const searchText = search.toLowerCase().trim();

        const matchesSearch = !searchText || [
            person.name,
            person.code,
            person.email,
            person.phone,
            person.typeLabel,
        ].some(value =>
            String(value || "").toLowerCase().includes(searchText)
        );

        return matchesType && matchesSearch;
    });

    // ========================================
    // RENDER
    // ========================================

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            <PageHeader
                title="Personas"
                description="Administra los alumnos, docentes, auxiliares y apoderados."
                actions={<Button variant="secondary" icon={Plus}>Registrar persona</Button>}
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

            {/* DIRECTORY */}

            <section className="flex flex-col gap-md">

                {/* TITLE */}

                <div>
                    <h2 className="text-lg font-semibold">
                        Directorio institucional
                    </h2>

                    <p className="text-sm text-gray-500">
                        Consulta y encuentra a cualquier integrante de tu institución.
                    </p>
                </div>

                {/* SEARCH AND FILTERS */}

                <div className="flex flex-col gap-md">

                    <div className="flex flex-col sm:flex-row gap-md">

                        <Input
                            name="people-search"
                            aria-label="Buscar personas"
                            type="search"
                            leftIcon={Search}
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Buscar por nombre, código o correo..."
                            fullWidth
                        />

                        <div className="flex items-center gap-sm text-sm text-gray-500">
                            <Filter size={17} />

                            {filteredPeople.length} resultados
                        </div>

                    </div>

                    {/* CATEGORY FILTERS */}

                    <div className="flex items-center gap-sm overflow-x-auto pb-xs">
                        {filters.map(filter => (
                            <Button key={filter.key} onClick={() => setSelectedType(filter.key)} size="sm" variant={selectedType === filter.key ? "primarySoft" : "outline"} className="people-filter">
                                {filter.label}{" "}

                                <span className="text-xs">
                                    ({filter.count})
                                </span>
                            </Button>
                        ))}
                    </div>

                </div>

                {/* PEOPLE TABLE */}

                <div className="border rounded-xl overflow-hidden">

                    {filteredPeople.length > 0 ? (
                        <div className="overflow-x-auto">

                            <table className="w-full text-sm">

                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left p-md font-medium">
                                            Persona
                                        </th>

                                        <th className="text-left p-md font-medium">
                                            Código
                                        </th>

                                        <th className="text-left p-md font-medium">
                                            Tipo
                                        </th>

                                        <th className="text-left p-md font-medium">
                                            Contacto
                                        </th>

                                        <th className="text-left p-md font-medium">
                                            Estado
                                        </th>

                                        <th className="p-md"></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredPeople.map(person => {
                                        const status = getStatus(person.status);

                                        return (
                                            <tr
                                                key={person.id}
                                                className="border-t hover:bg-gray-50"
                                            >
                                                {/* PERSON */}

                                                <td className="p-md">
                                                    <div className="flex items-center gap-md min-w-48">

                                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold shrink-0">
                                                            {getInitials(person.name)}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="font-medium">
                                                                {person.name}
                                                            </p>

                                                            <p className="text-xs text-gray-500">
                                                                {person.detail}
                                                            </p>
                                                        </div>

                                                    </div>
                                                </td>

                                                {/* CODE */}

                                                <td className="p-md">
                                                    {person.code || "—"}
                                                </td>

                                                {/* TYPE */}

                                                <td className="p-md">
                                                    <span className="px-sm py-xs rounded-full bg-gray-100 text-gray-600 text-xs">
                                                        {person.typeLabel}
                                                    </span>
                                                </td>

                                                {/* CONTACT */}

                                                <td className="p-md">
                                                    <div className="flex flex-col gap-xs">
                                                        {person.email && (
                                                            <span className="flex items-center gap-xs text-xs text-gray-500">
                                                                <Mail size={13} />
                                                                {person.email}
                                                            </span>
                                                        )}

                                                        {person.phone && (
                                                            <span className="flex items-center gap-xs text-xs text-gray-500">
                                                                <Phone size={13} />
                                                                {person.phone}
                                                            </span>
                                                        )}

                                                        {!person.email && !person.phone && (
                                                            <span className="text-gray-400">
                                                                Sin contacto
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* STATUS */}

                                                <td className="p-md">
                                                    <span className={`px-sm py-xs rounded-full text-xs ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                </td>

                                                {/* ACTION */}

                                                <td className="p-md">
                                                    <Button variant="ghost" icon={ChevronRight} iconOnly accessibilityLabel={`Ver persona: ${person.name}`} />
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>

                            </table>

                        </div>
                    ) : (
                        <div className="py-2xl text-center">

                            <Users
                                size={36}
                                className="mx-auto text-gray-400 mb-md"
                            />

                            <p className="font-medium">
                                No se encontraron personas
                            </p>

                            <p className="text-sm text-gray-500 mt-xs">
                                Intenta cambiar los filtros o el término de búsqueda.
                            </p>

                        </div>
                    )}

                </div>

            </section>

        </div>
    );
}
