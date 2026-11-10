'use client';

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
import { useCommunicationsData } from "@/hooks/useInstitutionData";
import { Bell, CalendarDays, MessageSquare, Search, Users } from "lucide-react";

const typeLabels = {
    ANNOUNCEMENT: "Anuncio",
    GRADE: "Actualización académica",
    BEHAVIOR: "Convivencia",
    CITATION: "Citación",
    REPORT: "Informe",
    RECOMMENDATION: "Recomendación",
    NOTIFICATION: "Notificación",
};

export default function Page() {
    const [search, setSearch] = useState("");
    const [selectedType, setSelectedType] = useState("ALL");
    const { data = {}, loading, error, refresh } = useCommunicationsData();
    const { student_updates: updates = [] } = data;
    const term = search.trim().toLocaleLowerCase("es-PE");
    const filtered = [...updates]
        .filter(item => selectedType === "ALL" || item.update_type === selectedType)
        .filter(item => !term || `${item.title} ${item.body} ${typeLabels[item.update_type] || ""}`.toLocaleLowerCase("es-PE").includes(term))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const formatDate = value => new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(value));

    const stats = [
        { label: "Comunicaciones", value: updates.length, description: "Actualizaciones registradas", icon: MessageSquare, iconVariant: "primary" },
        { label: "Anuncios", value: updates.filter(item => item.update_type === "ANNOUNCEMENT").length, description: "Avisos institucionales", icon: Bell, iconVariant: "info" },
        { label: "Citaciones", value: updates.filter(item => item.update_type === "CITATION").length, description: "Solicitudes de reunión", icon: Users, iconVariant: "warning" },
    ];

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            <PageHeader title="Comunicaciones" description="Anuncios, citaciones y novedades de la comunidad educativa." />
            <section className="grid grid-cols-3 gap-md">
                {stats.map(stat => <Card key={stat.label} variant="statIcon" title={stat.label} value={stat.value} description={stat.description} icon={stat.icon} iconVariant={stat.iconVariant} />)}
            </section>
            <Card variant="default" title="Actividad reciente" subtitle="Comunicaciones de esta institución" icon={MessageSquare} iconVariant="info">
                <div className="flex flex-col gap-md">
                    <div className="flex flex-col sm:flex-row gap-md">
                        <Input name="communications-search" aria-label="Buscar comunicaciones" leftIcon={Search} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por título o contenido..." fullWidth />
                        <label className="flex items-center gap-sm border radius-md px-md bg-surface">
                            <span className="text-sm text-secondary">Tipo</span>
                            <select className="py-sm bg-transparent" value={selectedType} onChange={event => setSelectedType(event.target.value)}>
                                <option value="ALL">Todos</option>
                                {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </label>
                    </div>
                    {filtered.length ? filtered.map(item => (
                        <article key={item.id} className="flex flex-col gap-sm border-b py-md last:border-0">
                            <div className="flex flex-wrap items-center justify-between gap-sm">
                                <span className="text-xs font-semibold text-secondary">{typeLabels[item.update_type] || item.update_type}</span>
                                <span className="inline-flex items-center gap-xs text-xs text-tertiary"><CalendarDays size={14} />{formatDate(item.created_at)}</span>
                            </div>
                            <h2 className="text-lg font-semibold">{item.title}</h2>
                            <p className="text-sm text-secondary">{item.body}</p>
                            {item.grade_value != null && <p className="text-sm font-medium">Nota registrada: {item.grade_value}</p>}
                        </article>
                    )) : (
                        <div className="flex flex-col items-center gap-sm border border-dashed radius-lg p-2xl text-center">
                            <Bell size={28} className="text-tertiary" />
                            <p className="font-semibold">No hay comunicaciones para mostrar</p>
                            <p className="text-sm text-secondary">Cambia los filtros para ver otros resultados.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
