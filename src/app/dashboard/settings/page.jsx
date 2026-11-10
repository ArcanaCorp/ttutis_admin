'use client';

import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
import { useSettingsData } from "@/hooks/useInstitutionData";
import { Building2, Clock3, ContactRound, Settings, ShieldCheck } from "lucide-react";

export default function Page() {
    const { currentInstitution: institution, data = {}, loading, error, refresh } = useSettingsData();
    const staff = (data.memberships || []).filter(item => item.role !== "STUDENT");
    const items = [
        { label: "Zona horaria", value: institution.timezone || "No definida", icon: Clock3 },
        { label: "Moneda", value: institution.currency || "No definida", icon: Settings },
        { label: "Estado", value: institution.status === "ACTIVE" ? "Activa" : institution.status || "No definido", icon: ShieldCheck },
    ];

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            <PageHeader title="Configuración" description="Consulta los parámetros generales y el acceso institucional." />
            <section className="grid grid-cols-3 gap-md">
                {items.map(item => <Card key={item.label} variant="statIcon" title={item.label} value={item.value} icon={item.icon} iconVariant="neutral" />)}
            </section>
            <section className="grid grid-cols-2 gap-md">
                <Card variant="default" title="Datos de la institución" subtitle="Parámetros registrados" icon={Building2} iconVariant="primary">
                    <dl className="grid grid-cols-2 gap-md">
                        <div><dt className="text-xs text-secondary">Nombre comercial</dt><dd className="text-sm font-medium">{institution.trade_name || "No registrado"}</dd></div>
                        <div><dt className="text-xs text-secondary">Razón social</dt><dd className="text-sm font-medium">{institution.legal_name || "No registrada"}</dd></div>
                        <div><dt className="text-xs text-secondary">RUC</dt><dd className="text-sm font-medium">{institution.tax_id || "No registrado"}</dd></div>
                        <div><dt className="text-xs text-secondary">Correo</dt><dd className="text-sm font-medium break-words">{institution.email || "No registrado"}</dd></div>
                    </dl>
                </Card>
                <Card variant="default" title="Accesos del equipo" subtitle="Membresías de esta institución" icon={ContactRound} iconVariant="info">
                    <div className="flex flex-col gap-md">
                        <div className="flex items-center justify-between border-b pb-md"><span className="text-sm text-secondary">Integrantes del equipo</span><strong>{staff.length}</strong></div>
                        {Object.entries({ Administradores: staff.filter(item => item.role === "ADMIN").length, Docentes: staff.filter(item => item.role === "TEACHER").length, Auxiliares: staff.filter(item => item.role === "ASSISTANT").length }).map(([label, count]) => (
                            <div key={label} className="flex items-center justify-between"><span className="text-sm text-secondary">{label}</span><span className="text-sm font-medium">{count}</span></div>
                        ))}
                    </div>
                </Card>
            </section>
            <div className="flex items-start gap-md border radius-md bg-surface p-md">
                <ShieldCheck size={18} className="shrink-0 text-secondary" />
                <p className="text-sm text-secondary">Los parámetros y accesos se muestran desde los registros de la institución activa.</p>
            </div>
        </div>
    );
}
