'use client';

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import ResourceStatus from "@/components/ui/ResourceStatus";
import { usePaymentsData } from "@/hooks/useInstitutionData";
import { CircleAlert, CircleCheck, Clock3, ReceiptText, Search, Wallet } from "lucide-react";

const statusLabels = { PAID: "Pagado", UNPAID: "Pendiente", OVERDUE: "Vencido", WAIVED: "Exonerado" };

export default function Page() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");
    const { currentInstitution, data = {}, loading, error, refresh } = usePaymentsData();
    const { student_fees: fees = [], students = [], memberships = [] } = data;
    const getStudentName = studentId => {
        const student = students.find(item => item.id === studentId);
        if (!student) return "Alumno sin identificar";
        const directName = [student.first_names, student.last_names].filter(Boolean).join(" ");
        if (directName) return directName;
        return memberships.find(item => item.id === student.membership_id)?.full_name || "Alumno sin identificar";
    };
    const term = search.trim().toLocaleLowerCase("es-PE");
    const filtered = fees.filter(fee => (status === "ALL" || fee.status === status) &&
        (!term || `${getStudentName(fee.student_id)} ${fee.concept} ${fee.period_label}`.toLocaleLowerCase("es-PE").includes(term)));
    const sum = list => list.reduce((total, fee) => total + Number(fee.amount || 0), 0);
    const currencyCode = currentInstitution?.currency || "PEN";
    const currency = amount => new Intl.NumberFormat("es-PE", { style: "currency", currency: currencyCode }).format(amount);
    const stats = [
        { label: "Recaudado", value: currency(sum(fees.filter(fee => fee.status === "PAID"))), description: `${fees.filter(fee => fee.status === "PAID").length} cargos pagados`, icon: CircleCheck, iconVariant: "success" },
        { label: "Pendiente", value: currency(sum(fees.filter(fee => fee.status === "UNPAID"))), description: `${fees.filter(fee => fee.status === "UNPAID").length} cargos por pagar`, icon: Clock3, iconVariant: "warning" },
        { label: "Vencido", value: currency(sum(fees.filter(fee => fee.status === "OVERDUE"))), description: `${fees.filter(fee => fee.status === "OVERDUE").length} cargos vencidos`, icon: CircleAlert, iconVariant: "danger" },
    ];

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            <PageHeader title="Pagos" description="Controla los cargos, vencimientos y pagos de las familias." />
            <section className="grid grid-cols-3 gap-md">
                {stats.map(stat => <Card key={stat.label} variant="statIcon" title={stat.label} value={stat.value} description={stat.description} icon={stat.icon} iconVariant={stat.iconVariant} />)}
            </section>
            <Card variant="default" title="Cargos registrados" subtitle="Cargos asociados a estudiantes de esta institución" icon={Wallet} iconVariant="success">
                <div className="flex flex-col gap-md">
                    <div className="flex flex-col sm:flex-row gap-md">
                        <Input name="payments-search" aria-label="Buscar pagos" leftIcon={Search} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por alumno, concepto o periodo..." fullWidth />
                        <label className="flex items-center gap-sm border radius-md px-md bg-surface">
                            <span className="text-sm text-secondary">Estado</span>
                            <select className="py-sm bg-transparent" value={status} onChange={event => setStatus(event.target.value)}>
                                <option value="ALL">Todos</option>
                                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </label>
                    </div>
                    {filtered.length ? (
                        <div className="border radius-lg overflow-hidden">
                            <div className="grid grid-cols-4 gap-md bg-surface-secondary p-md text-xs font-semibold text-secondary">
                                <span>Alumno</span><span>Concepto</span><span>Vencimiento</span><span className="text-right">Importe</span>
                            </div>
                            {filtered.map(fee => (
                                <div key={fee.id} className="grid grid-cols-4 gap-md items-center border-t p-md">
                                    <div className="min-w-0"><p className="truncate font-medium">{getStudentName(fee.student_id)}</p><p className="text-xs text-secondary">{statusLabels[fee.status] || fee.status}</p></div>
                                    <div><p className="text-sm">{fee.concept}</p><p className="text-xs text-secondary">{fee.period_label}</p></div>
                                    <span className="text-sm text-secondary">{fee.due_date || "Sin fecha"}</span>
                                    <span className="text-right font-semibold">{currency(Number(fee.amount || 0))}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-sm border border-dashed radius-lg p-2xl text-center">
                            <ReceiptText size={28} className="text-tertiary" />
                            <p className="font-semibold">No hay cargos para mostrar</p>
                            <p className="text-sm text-secondary">Cambia los filtros para ver otros resultados.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
