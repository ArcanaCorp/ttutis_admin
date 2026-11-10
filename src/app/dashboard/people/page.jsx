
'use client';

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import PeopleRegistrationModal from "@/components/people/PeopleRegistrationModal";
import PersonDetailModal from "@/components/people/PersonDetailModal";
import ResourceStatus from "@/components/ui/ResourceStatus";
import Pagination from "@/components/ui/Pagination";
import usePagination from "@/hooks/usePagination";
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
    const { data = {}, loading, error, refresh, canManage, createPeople, actOnPerson, currentInstitution } = usePeopleData();
    const { memberships = [], students = [], guardian_student_links = [], guardian_profiles = [], enrollments = [], classrooms = [] } = data;

    const [search, setSearch] = useState("");
    const [selectedType, setSelectedType] = useState("ALL");
    const [showRegistration, setShowRegistration] = useState(false);
    const [notice, setNotice] = useState("");
    const [selectedPersonId, setSelectedPersonId] = useState(null);
    const visibleGuardianLinks = guardian_student_links.filter(link => !["REVOKED", "REJECTED"].includes(link.status));
    const membershipById = new Map(memberships.map(item => [item.id, item]));
    const membershipByProfileId = new Map(
        memberships.filter(item => item.profile_id).map(item => [item.profile_id, item]),
    );
    const studentMembershipIds = new Set(students.map(student => student.membership_id).filter(Boolean));
    const studentsById = new Map(students.map(student => [student.id, student]));
    const classroomById = new Map(classrooms.map(classroom => [classroom.id, classroom]));
    const academicYearById = new Map((data.academic_years || []).map(year => [year.id, year]));
    const activeEnrollmentByStudentId = new Map(
        enrollments.filter(item => item.status === "ACTIVE").map(item => [item.student_id, item]),
    );
    const guardianLinksByProfileId = new Map();
    visibleGuardianLinks.forEach(link => {
        const links = guardianLinksByProfileId.get(link.guardian_profile_id) || [];
        links.push(link);
        guardianLinksByProfileId.set(link.guardian_profile_id, links);
    });

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
            const membership = membershipById.get(student.membership_id);
            if (membership?.status === "REVOKED" || (student.status === "INACTIVE" && !membership)) return;
            const name = [student.first_names, student.last_names].filter(Boolean).join(" ") || membership?.full_name || "Sin nombre";
            const enrollment = activeEnrollmentByStudentId.get(student.id);
            const classroom = classroomById.get(enrollment?.classroom_id);
            const academicYear = academicYearById.get(enrollment?.academic_year_id);

            result.push({
                id: `student-${student.id}`,
                studentId: student.id,
                membershipId: membership?.id,
                profileId: membership?.profile_id,
                first_names: student.first_names,
                last_names: student.last_names,
                document_type: student.document_type,
                document_number: student.document_number,
                birth_date: student.birth_date,
                admission_date: student.admission_date,
                name,
                code: student.student_code,
                email: student.email || membership?.email,
                phone: student.phone,
                status: student.status,
                type: "STUDENT",
                typeLabel: "Alumno",
                detail: classroom ? `${classroom.grade_label} ${classroom.section_name}` : "Estudiante",
                classroom: classroom ? `${classroom.grade_label} ${classroom.section_name}` : "No asignada",
                academicYear: academicYear?.name || "No asignado",
            });
        });

        // DOCENTES, AUXILIARES Y PERSONAL

        memberships.forEach(membership => {
            const role = membership.role;

            if (role === "STUDENT" || membership.status === "REVOKED" || studentMembershipIds.has(membership.id)) return;

            result.push({
                id: `membership-${membership.id}`,
                membershipId: membership.id,
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

        const guardianProfileIds = [...new Set(visibleGuardianLinks.map(link => link.guardian_profile_id).filter(Boolean))];

        guardianProfileIds.forEach(profileId => {
            const guardianMembership = membershipByProfileId.get(profileId);
            const guardianProfile = guardian_profiles.find(item => item.id === profileId);
            const guardianLinks = guardianLinksByProfileId.get(profileId) || [];

            result.push({
                id: `guardian-${profileId}`,
                profileId,
                links: guardianLinks.map(link => {
                    const student = studentsById.get(link.student_id);
                    const studentName = [student?.first_names, student?.last_names]
                        .filter(Boolean)
                        .join(" ");
                    return { ...link, studentName: studentName || "Alumno" };
                }),
                name: guardianMembership?.full_name || guardianProfile?.display_name || "Apoderado",
                code: guardianMembership?.login_code,
                email: guardianMembership?.email,
                phone: null,
                status: guardianLinks.some(link => link.status === "ACTIVE") ? "ACTIVE" : "PENDING",
                type: "GUARDIAN",
                typeLabel: "Apoderado",
                detail: guardianLinks[0]?.relationship || "Apoderado",
            });
        });

        return result.map(person => ({ ...person, institutionId: currentInstitution?.id, statusLabel: getStatus(person.status).label }));
    })();

    // ========================================
    // CONTADORES
    // ========================================

    const totalStudents = students.filter(student => membershipById.get(student.membership_id)?.status !== "REVOKED").length;

    const totalTeachers = memberships.filter(
        item => item.role === "TEACHER" && item.status !== "REVOKED"
    ).length;

    const totalAssistants = memberships.filter(
        item => item.role === "ASSISTANT" && item.status !== "REVOKED"
    ).length;

    const totalGuardians = new Set(
        visibleGuardianLinks.map(link => link.guardian_profile_id).filter(Boolean)
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
    const peoplePagination = usePagination(filteredPeople, 25);
    const selectedPerson = people.find(person => person.id === selectedPersonId) || null;

    // ========================================
    // RENDER
    // ========================================

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            <PageHeader
                title="Personas"
                description="Administra los alumnos, docentes, auxiliares y apoderados."
                actions={<Button variant="secondary" icon={Plus} onClick={() => { setNotice(""); setShowRegistration(true); }} disabled={!canManage}>Registrar persona</Button>}
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
                            onChange={event => {
                                setSearch(event.target.value);
                                peoplePagination.setPage(1);
                            }}
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
                            <Button key={filter.key} onClick={() => { setSelectedType(filter.key); peoplePagination.setPage(1); }} size="sm" variant={selectedType === filter.key ? "primarySoft" : "outline"} className="people-filter">
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
                                    {peoplePagination.items.map(person => {
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
                                                    <Button variant="ghost" icon={ChevronRight} iconOnly accessibilityLabel={`Ver persona: ${person.name}`} onClick={() => setSelectedPersonId(person.id)} />
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>

                            </table>

                            <Pagination {...peoplePagination} onPageChange={peoplePagination.setPage} />

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

            <PeopleRegistrationModal
                open={showRegistration}
                onClose={() => setShowRegistration(false)}
                students={students}
                onCreate={async payload => {
                    const result = await createPeople(payload);
                    const counts = [
                        result.studentsCreated ? `${result.studentsCreated} alumnos` : null,
                        result.staffCreated ? `${result.staffCreated} docentes y auxiliares` : null,
                        result.guardiansLinked ? `${result.guardiansLinked} vínculos con apoderados` : null,
                    ].filter(Boolean).join(", ");
                    const invites = result.invitationsSent ? ` Se enviaron ${result.invitationsSent} invitaciones por correo.` : "";
                    setNotice(`Registro completado: ${counts || "personas actualizadas"}.${invites}`);
                    return result;
                }}
            />
            <PersonDetailModal
                key={selectedPerson?.id || "closed"}
                open={Boolean(selectedPerson)}
                person={selectedPerson}
                canManage={canManage}
                onClose={() => setSelectedPersonId(null)}
                onInvite={person => actOnPerson("invite", person)}
                onSave={(person, values) => actOnPerson("edit", person, values)}
                onDelete={person => actOnPerson("delete", person)}
            />

        </div>
    );
}
