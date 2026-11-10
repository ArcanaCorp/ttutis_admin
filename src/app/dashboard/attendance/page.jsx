'use client';

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
import { useAttendanceData } from "@/hooks/useInstitutionData";
import { Activity, CalendarDays, CheckCircle2, Clock3, LogIn, LogOut, Search, UserRound } from "lucide-react";

const eventLabels = {
    ENTRY: "Ingreso",
    EXIT: "Salida",
    TEMP_EXIT: "Salida temporal",
    RETURN: "Retorno",
    MANUAL_ADJUSTMENT: "Ajuste manual",
};

export default function Page() {
    const [search, setSearch] = useState("");
    const [eventType, setEventType] = useState("ALL");
    const { data = {}, loading, error, refresh } = useAttendanceData();
    const { attendance_events: events = [], students = [], memberships = [], academic_years: years = [] } = data;
    const activeYear = years.find(year => year.status === "ACTIVE");

    const getStudentName = (studentId) => {
        const student = students.find(item => item.id === studentId);
        if (!student) return "Alumno sin identificar";
        const directName = [student.first_names, student.last_names].filter(Boolean).join(" ");
        if (directName) return directName;
        const membership = memberships.find(item => item.id === student.membership_id);
        return membership?.full_name || "Alumno sin identificar";
    };

    const formatDateTime = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Fecha no disponible";
        return new Intl.DateTimeFormat("es-PE", {
            timeZone: "America/Lima",
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        }).format(date);
    };

    const term = search.trim().toLocaleLowerCase("es-PE");
    const filteredEvents = [...events]
        .filter(event => eventType === "ALL" || event.event_type === eventType)
        .filter(event => !term || `${getStudentName(event.student_id)} ${event.source} ${event.notes || ""}`.toLocaleLowerCase("es-PE").includes(term))
        .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));

    const entries = events.filter(event => event.event_type === "ENTRY").length;
    const exits = events.filter(event => ["EXIT", "TEMP_EXIT"].includes(event.event_type)).length;
    const studentsPresent = new Set(events.filter(event => event.event_type === "ENTRY").map(event => event.student_id)).size;

    const stats = [
        { label: "Ingresos", value: entries, description: "Registros de ingreso", icon: LogIn, iconVariant: "success" },
        { label: "Salidas", value: exits, description: "Salidas registradas", icon: LogOut, iconVariant: "info" },
        { label: "Ingresos únicos", value: studentsPresent, description: "Alumnos con registro de entrada", icon: UserRound, iconVariant: "primary" },
    ];

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            <PageHeader title="Asistencia" description="Consulta las entradas, salidas y movimientos registrados." actions={(
                <div className="flex items-center gap-sm border radius-md bg-surface p-sm">
                    <CalendarDays size={18} className="text-secondary" />
                    <div>
                        <p className="text-xs text-secondary">Año escolar</p>
                        <p className="text-sm font-medium">{activeYear?.name || "Sin año activo"}</p>
                    </div>
                </div>
            )} />

            <section className="grid grid-cols-3 gap-md">
                {stats.map(stat => <Card key={stat.label} variant="statIcon" title={stat.label} value={stat.value} description={stat.description} icon={stat.icon} iconVariant={stat.iconVariant} />)}
            </section>

            <Card variant="default" title="Registro de movimientos" subtitle="Movimientos registrados en esta institución" icon={Activity} iconVariant="info">
                <div className="flex flex-col gap-md">
                    <div className="flex flex-col sm:flex-row gap-md">
                        <Input name="attendance-search" aria-label="Buscar asistencia" leftIcon={Search} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por alumno, origen o nota..." fullWidth />
                        <label className="flex items-center gap-sm border radius-md px-md bg-surface">
                            <span className="text-sm text-secondary">Tipo</span>
                            <select className="py-sm bg-transparent" value={eventType} onChange={event => setEventType(event.target.value)}>
                                <option value="ALL">Todos</option>
                                {Object.entries(eventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </label>
                    </div>

                    {filteredEvents.length ? (
                        <div className="border radius-lg overflow-hidden">
                            <div className="grid grid-cols-3 gap-md bg-surface-secondary p-md text-xs font-semibold text-secondary">
                                <span>Alumno</span><span>Movimiento</span><span>Fecha y hora</span>
                            </div>
                            {filteredEvents.map(event => (
                                <div key={event.id} className="grid grid-cols-3 gap-md items-center border-t p-md">
                                    <div className="flex items-center gap-sm min-w-0">
                                        <span className="center w-10 h-10 rounded-full bg-surface-tertiary text-secondary"><UserRound size={18} /></span>
                                        <span className="truncate font-medium">{getStudentName(event.student_id)}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{eventLabels[event.event_type] || event.event_type}</p>
                                    <p className="text-xs text-secondary">{{ QR: "Código QR", MANUAL: "Registro manual", SYSTEM: "Sistema" }[event.source] || event.source}{event.notes ? ` · ${event.notes}` : ""}</p>
                                    </div>
                                    <span className="inline-flex items-center gap-xs text-sm text-secondary"><Clock3 size={15} />{formatDateTime(event.occurred_at)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-sm border border-dashed radius-lg p-2xl text-center">
                            <CheckCircle2 size={28} className="text-tertiary" />
                            <p className="font-semibold">No hay registros con esos filtros</p>
                            <p className="text-sm text-secondary">Prueba con otro término de búsqueda o tipo de movimiento.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
