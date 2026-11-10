'use client';

import { useState } from "react";
import {
    BadgeDollarSign,
    CalendarClock,
    CircleAlert,
    CircleCheck,
    Clock3,
    Pencil,
    Plus,
    ReceiptText,
    Search,
    Trash2,
    Wallet,
} from "lucide-react";
import PaymentActionModal from "@/components/payments/PaymentActionModal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import ResourceStatus from "@/components/ui/ResourceStatus";
import usePagination from "@/hooks/usePagination";
import { usePaymentsData } from "@/hooks/useInstitutionData";
import {
    calculateFeeBalance,
    getCalculatedFeeStatus,
} from "@/lib/payments/calculations.mjs";

const statusLabels = {
    PAID: "Pagado",
    UNPAID: "Pendiente",
    PARTIAL: "Parcial",
    OVERDUE: "Vencido",
    WAIVED: "Exonerado",
};

const conceptLabels = {
    MATRICULA: "Matrícula",
    PENSION: "Pensión",
    OTHER: "Otro",
};

const tabs = [
    ["summary", "Resumen"],
    ["setup", "Conceptos y reglas"],
    ["payments", "Pagos"],
    ["pending", "Pendientes"],
    ["history", "Historial"],
];

function dateInLima() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function currencyFormat(amount, currency) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: currency || "PEN",
    }).format(Number(amount || 0));
}

function EmptyState({ title, description, icon: Icon = ReceiptText }) {
    return (
        <div className="flex flex-col items-center gap-sm rounded-lg border border-dashed p-2xl text-center">
            <Icon size={28} className="text-tertiary" />
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-secondary">{description}</p>
        </div>
    );
}

function ConfirmModal({ confirmation, busy, onCancel, onConfirm }) {
    if (!confirmation) return null;

    return (
        <Modal
            open
            title={confirmation.title}
            description={confirmation.description}
            onClose={busy ? undefined : onCancel}
        >
            <div className="flex justify-end gap-sm">
                <Button variant="ghost" onClick={onCancel} disabled={busy}>
                    Cancelar
                </Button>
                <Button
                    variant="danger"
                    onClick={onConfirm}
                    loading={busy}
                    loadingText="Procesando…"
                >
                    Confirmar
                </Button>
            </div>
        </Modal>
    );
}

export default function Page() {
    const [activeTab, setActiveTab] = useState("summary");
    const [selectedYearId, setSelectedYearId] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [modal, setModal] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [actionError, setActionError] = useState("");
    const {
        currentInstitution,
        data = {},
        loading,
        error,
        refresh,
        canManage,
        managePayment,
    } = usePaymentsData();

    const fees = data.student_fees || [];
    const students = data.students || [];
    const memberships = data.memberships || [];
    const concepts = data.fee_concepts || [];
    const rules = data.billing_rules || [];
    const payments = data.student_fee_payments || [];
    const academicYears = data.academic_years || [];
    const activeYear = academicYears.find(year => year.status === "ACTIVE") || academicYears[0];
    const activeYearId = selectedYearId || activeYear?.id || "";
    const currencyValue = data.currency || currentInstitution?.currency || "PEN";
    const currency = /^[A-Z]{3}$/.test(currencyValue) ? currencyValue : "PEN";
    const term = search.trim().toLocaleLowerCase("es-PE");
    const today = dateInLima();

    const getStudentName = studentId => {
        const student = students.find(item => item.id === studentId);
        if (!student) return "Alumno sin identificar";
        const name = [student.first_names, student.last_names].filter(Boolean).join(" ");
        if (name) return name;
        return memberships.find(item => item.id === student.membership_id)?.full_name
            || "Alumno sin identificar";
    };

    const yearFees = fees.filter(fee =>
        !activeYearId || !fee.academic_year_id || fee.academic_year_id === activeYearId,
    );
    const yearRules = rules.filter(rule => !activeYearId || rule.academic_year_id === activeYearId);
    const yearFeeIds = new Set(yearFees.map(fee => fee.id));
    const yearPayments = payments.filter(payment => yearFeeIds.has(payment.student_fee_id));

    const feeRows = yearFees.map(fee => ({
        ...fee,
        calculated_status: getCalculatedFeeStatus(fee, today),
        balance: calculateFeeBalance(fee),
    }));

    const matchesSearch = value => !term || value.toLocaleLowerCase("es-PE").includes(term);
    const visibleFees = feeRows
        .filter(fee => statusFilter === "ALL" || fee.calculated_status === statusFilter)
        .filter(fee => matchesSearch(`${getStudentName(fee.student_id)} ${fee.concept} ${fee.period_label}`))
        .sort((first, second) => String(first.due_date || "").localeCompare(String(second.due_date || "")));
    const confirmedPayments = yearPayments.filter(payment => payment.status === "CONFIRMED");
    const totalPaid = confirmedPayments.reduce(
        (total, payment) => total + Math.round(Number(payment.amount || 0) * 100),
        0,
    ) / 100;
    const totalPending = feeRows
        .filter(fee => !["PAID", "WAIVED"].includes(fee.calculated_status))
        .reduce((total, fee) => total + Math.round(fee.balance * 100), 0) / 100;
    const totalOverdue = feeRows
        .filter(fee => fee.calculated_status === "OVERDUE")
        .reduce((total, fee) => total + Math.round(fee.balance * 100), 0) / 100;

    const openModal = (mode, record = null) => {
        setActionError("");
        setModal({ mode, record });
    };

    const closeModal = () => setModal(null);

    const submitModal = async values => {
        const actionByMode = {
            concept: "create_concept",
            edit_concept: "update_concept",
            rule: "create_rule",
            edit_rule: "update_rule",
            obligation: "create_obligation",
            edit_obligation: "update_obligation",
            payment: "record_payment",
            generate: "generate_obligations",
        };

        const result = await managePayment({
            action: actionByMode[modal.mode],
            values,
        });

        setNotice(result.message || (
            modal.mode === "payment"
                ? "El pago fue confirmado y registrado."
                : modal.mode === "generate"
                    ? "Se completó la generación de obligaciones."
                    : "Los cambios se guardaron correctamente."
        ));
    };

    const askToConfirm = ({ title, description, action, values }) => {
        setActionError("");
        setConfirmation({ title, description, action, values });
    };

    const confirmAction = async () => {
        setBusy(true);
        setActionError("");
        try {
            const result = await managePayment({
                action: confirmation.action,
                values: confirmation.values,
            });
            setNotice(result.deactivated
                ? "La regla tiene obligaciones asociadas y quedó desactivada para conservar el historial."
                : "La operación se completó correctamente.");
            setConfirmation(null);
        } catch (confirmError) {
            setActionError(confirmError.message || "No se pudo completar la operación.");
        } finally {
            setBusy(false);
        }
    };

    const setConceptStatus = (concept, status) => askToConfirm({
        title: status === "INACTIVE" ? "Desactivar concepto" : "Activar concepto",
        description: status === "INACTIVE"
            ? `El concepto “${concept.name}” dejará de estar disponible para nuevas obligaciones.`
            : `El concepto “${concept.name}” volverá a estar disponible.`,
        action: "set_concept_status",
        values: { id: concept.id, status },
    });

    const toggleRuleStatus = (rule, status) => askToConfirm({
        title: status === "INACTIVE" ? "Desactivar regla" : "Activar regla",
        description: status === "INACTIVE"
            ? `La regla “${rule.name}” dejará de generar obligaciones.`
            : `La regla “${rule.name}” volverá a generar obligaciones.`,
        action: "set_rule_status",
        values: { id: rule.id, status },
    });

    const askDeleteConcept = concept => askToConfirm({
        title: "Eliminar concepto",
        description: `¿Eliminar “${concept.name}”? Si ya tiene obligaciones o reglas, el sistema solicitará desactivarlo para conservar el historial.`,
        action: "delete_concept",
        values: { id: concept.id },
    });

    const askDeleteRule = rule => askToConfirm({
        title: "Eliminar regla de cobro",
        description: `¿Eliminar “${rule.name}”? Si ya generó obligaciones, quedará desactivada para preservar los cargos existentes.`,
        action: "delete_rule",
        values: { id: rule.id },
    });

    const askDeleteFee = fee => askToConfirm({
        title: "Eliminar obligación",
        description: `¿Eliminar la obligación “${fee.concept} · ${fee.period_label}” de ${getStudentName(fee.student_id)}? Solo se pueden eliminar cargos manuales sin pagos.`,
        action: "delete_obligation",
        values: { id: fee.id },
    });

    const renderFeeTable = (rows, pagination) => rows.length ? (
        <>
        <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-6 gap-md bg-surface-secondary p-md text-xs font-semibold text-secondary">
                <span>Alumno</span>
                <span>Concepto</span>
                <span>Vence</span>
                <span>Estado</span>
                <span className="text-right">Saldo</span>
                <span className="text-right">Acciones</span>
            </div>
            {rows.map(fee => (
                <div key={fee.id} className="grid grid-cols-6 items-center gap-md border-t p-md">
                    <span className="truncate text-sm font-medium">{getStudentName(fee.student_id)}</span>
                    <span className="text-sm">
                        {fee.concept}
                        <span className="block text-xs text-secondary">{fee.period_label}</span>
                    </span>
                    <span className="text-sm text-secondary">{fee.due_date || "Sin fecha"}</span>
                    <span className={`text-sm font-medium ${fee.calculated_status === "OVERDUE" ? "text-red-600" : "text-secondary"}`}>
                        {statusLabels[fee.calculated_status]}
                    </span>
                    <span className="text-right text-sm font-semibold">
                        {currencyFormat(fee.balance, currency)}
                    </span>
                    <div className="flex justify-end gap-xs">
                        {canManage && fee.balance > 0 && fee.calculated_status !== "WAIVED" && (
                            <Button
                                size="sm"
                                variant="outline"
                                icon={BadgeDollarSign}
                                onClick={() => openModal("payment", fee)}
                            >
                                Registrar
                            </Button>
                        )}
                        {canManage && !fee.billing_rule_id && !Number(fee.paid_amount) && (
                            <>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={Pencil}
                                    iconOnly
                                    accessibilityLabel="Editar obligación"
                                    onClick={() => openModal("edit_obligation", fee)}
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={Trash2}
                                    iconOnly
                                    accessibilityLabel="Eliminar obligación"
                                    onClick={() => askDeleteFee(fee)}
                                />
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
        {pagination && (
            <Pagination {...pagination} onPageChange={pagination.setPage} />
        )}
        </>
    ) : (
        <EmptyState
            title="No hay obligaciones para mostrar"
            description="Prueba con otro año o cambia los filtros."
        />
    );

    const renderPaymentsTable = (rows, pagination) => rows.length ? (
        <>
        <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-6 gap-md bg-surface-secondary p-md text-xs font-semibold text-secondary">
                <span>Fecha</span>
                <span>Alumno</span>
                <span>Concepto</span>
                <span>Método</span>
                <span>Referencia</span>
                <span className="text-right">Importe</span>
            </div>
            {rows.map(payment => {
                const fee = fees.find(item => item.id === payment.student_fee_id);
                const paymentMethods = {
                    CASH: "Efectivo",
                    TRANSFER: "Transferencia",
                    DEPOSIT: "Depósito",
                    OTHER: "Otro",
                };
                return (
                    <div key={payment.id} className="grid grid-cols-6 items-center gap-md border-t p-md text-sm">
                        <span>{new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(payment.paid_at))}</span>
                        <span className="truncate">{getStudentName(payment.student_id)}</span>
                        <span className="truncate">{fee?.concept || "Obligación"}</span>
                        <span>{paymentMethods[payment.payment_method] || payment.payment_method}</span>
                        <span className="truncate text-secondary">{payment.reference || "—"}</span>
                        <span className="text-right font-semibold">{currencyFormat(payment.amount, currency)}</span>
                    </div>
                );
            })}
        </div>
        {pagination && (
            <Pagination {...pagination} onPageChange={pagination.setPage} />
        )}
        </>
    ) : (
        <EmptyState
            title="No hay pagos registrados"
            description="Los pagos confirmados aparecerán en este historial."
        />
    );

    const visiblePayments = yearPayments
        .filter(payment => payment.status === "CONFIRMED")
        .filter(payment => matchesSearch(`${getStudentName(payment.student_id)} ${payment.reference || ""}`))
        .sort((first, second) => new Date(second.paid_at) - new Date(first.paid_at));
    const visibleRules = yearRules.filter(rule => matchesSearch(`${rule.name} ${rule.scope_type}`));
    const visibleConcepts = concepts.filter(concept => matchesSearch(`${concept.name} ${concept.description || ""}`));
    const pendingFees = visibleFees.filter(fee => !["PAID", "WAIVED"].includes(fee.calculated_status));
    const feePagination = usePagination(pendingFees, 25);
    const paymentPagination = usePagination(visiblePayments, 25);
    const conceptPagination = usePagination(visibleConcepts, 25);
    const rulePagination = usePagination(visibleRules, 25);

    return (
        <div className="page-shell">
            <ResourceStatus loading={loading} error={error} onRetry={refresh} />
            <PageHeader
                title="Pagos"
                description="Administra conceptos, obligaciones, pagos y saldos de la institución."
                actions={canManage && data.enabled !== false && (
                    <div className="flex flex-wrap gap-sm">
                        <Button variant="outline" icon={CalendarClock} onClick={() => openModal("generate")}>
                            Generar obligaciones
                        </Button>
                        <Button icon={Plus} onClick={() => openModal("obligation")}>
                            Nueva obligación
                        </Button>
                    </div>
                )}
            />

            {data.enabled === false ? (
                <Card variant="default" title="Módulo no habilitado" icon={Wallet} iconVariant="warning">
                    <p className="text-sm text-secondary">
                        La institución todavía no tiene habilitada la gestión de pagos. Contacta con el administrador de TTUTIS para activarla.
                    </p>
                </Card>
            ) : (
                <>
                    <div className="flex flex-wrap items-end justify-between gap-md">
                        <div className="flex flex-col gap-xs">
                            <label htmlFor="payments-year" className="text-xs font-semibold text-secondary">
                                Año escolar
                            </label>
                            <select
                                id="payments-year"
                                value={activeYearId}
                                onChange={event => setSelectedYearId(event.target.value)}
                                className="min-w-56 rounded-lg border bg-white px-md py-sm text-sm"
                            >
                                {academicYears.map(year => (
                                    <option key={year.id} value={year.id}>{year.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-wrap gap-sm">
                            {tabs.map(([value, label]) => (
                                <Button
                                    key={value}
                                    size="sm"
                                    variant={activeTab === value ? "primary" : "outline"}
                                    onClick={() => setActiveTab(value)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {notice && (
                        <p role="status" className="rounded-lg bg-green-50 p-md text-sm text-green-800">
                            {notice}
                        </p>
                    )}
                    {actionError && (
                        <p role="alert" className="rounded-lg bg-red-50 p-md text-sm text-red-700">
                            {actionError}
                        </p>
                    )}

                    {activeTab === "summary" && (
                        <>
                            <section className="grid grid-cols-3 gap-md">
                                <Card variant="statIcon" title="Recaudado" value={currencyFormat(totalPaid, currency)} description={`${confirmedPayments.length} pagos confirmados`} icon={CircleCheck} iconVariant="success" />
                                <Card variant="statIcon" title="Saldo pendiente" value={currencyFormat(totalPending, currency)} description="Obligaciones sin completar" icon={Clock3} iconVariant="warning" />
                                <Card variant="statIcon" title="Saldo vencido" value={currencyFormat(totalOverdue, currency)} description="Obligaciones fuera de fecha" icon={CircleAlert} iconVariant="danger" />
                            </section>
                            <Card variant="default" title="Deudas próximas y pendientes" subtitle={`${feeRows.filter(fee => !["PAID", "WAIVED"].includes(fee.calculated_status)).length} obligaciones con saldo pendiente`} icon={ReceiptText} iconVariant="warning">
                                {renderFeeTable(feeRows.filter(fee => !["PAID", "WAIVED"].includes(fee.calculated_status)).slice(0, 8))}
                            </Card>
                        </>
                    )}

                    {activeTab === "setup" && (
                        <>
                            <Card variant="default" title="Conceptos de cobro" subtitle="Importes disponibles para crear obligaciones y reglas" icon={ReceiptText} iconVariant="primary">
                                <div className="mb-md flex flex-wrap items-center justify-between gap-md">
                                    <Input
                                        name="setup-search"
                                        aria-label="Buscar conceptos y reglas"
                                        leftIcon={Search}
                                        value={search}
                                        onChange={event => setSearch(event.target.value)}
                                        placeholder="Buscar conceptos..."
                                        fullWidth
                                    />
                                    {canManage && <Button icon={Plus} onClick={() => openModal("concept")}>Nuevo concepto</Button>}
                                </div>
                                {visibleConcepts.length ? (
                                    <>
                                    <div className="flex flex-col divide-y">
                                        {conceptPagination.items.map(concept => (
                                            <div key={concept.id} className="flex flex-wrap items-center justify-between gap-md py-md">
                                                <div>
                                                    <p className="font-semibold">{concept.name}</p>
                                                    <p className="text-sm text-secondary">
                                                        {conceptLabels[concept.concept_type] || concept.concept_type}
                                                        {concept.description ? ` · ${concept.description}` : ""}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-sm">
                                                    <span className="font-semibold">{currencyFormat(concept.amount, currency)}</span>
                                                    <span className="text-xs text-secondary">{concept.status === "ACTIVE" ? "Activo" : "Inactivo"}</span>
                                                    {canManage && (
                                                        <>
                                                            <Button size="sm" variant="ghost" icon={Pencil} iconOnly accessibilityLabel="Editar concepto" onClick={() => openModal("edit_concept", concept)} />
                                                            <Button size="sm" variant="outline" onClick={() => setConceptStatus(concept, concept.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>
                                                                {concept.status === "ACTIVE" ? "Desactivar" : "Activar"}
                                                            </Button>
                                                            <Button size="sm" variant="dangerSoft" icon={Trash2} iconOnly accessibilityLabel="Eliminar concepto" onClick={() => askDeleteConcept(concept)} />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Pagination {...conceptPagination} onPageChange={conceptPagination.setPage} />
                                    </>
                                ) : <EmptyState title="Aún no hay conceptos" description="Crea matrícula, pensión u otros conceptos de cobro." />}
                            </Card>

                            <Card variant="default" title="Reglas recurrentes" subtitle="Calendarios que generan obligaciones sin duplicarlas" icon={CalendarClock} iconVariant="info">
                                <div className="mb-md flex flex-wrap items-center justify-between gap-md">
                                    <Input
                                        name="rules-search"
                                        aria-label="Buscar reglas de cobro"
                                        leftIcon={Search}
                                        value={search}
                                        onChange={event => setSearch(event.target.value)}
                                        placeholder="Buscar reglas..."
                                        fullWidth
                                    />
                                    {canManage && <Button icon={Plus} onClick={() => openModal("rule")}>Nueva regla</Button>}
                                </div>
                                {visibleRules.length ? (
                                    <>
                                    <div className="flex flex-col divide-y">
                                        {rulePagination.items.map(rule => {
                                            const concept = concepts.find(item => item.id === rule.fee_concept_id);
                                            const scopeNames = {
                                                INSTITUTION: "Toda la institución",
                                                LEVEL: `Nivel ${rule.target_level}`,
                                                GRADE: `${rule.target_grade} · ${rule.target_level}`,
                                                CLASSROOM: (() => {
                                                    const classroom = data.classrooms?.find(item => item.id === rule.classroom_id);
                                                    return classroom ? `${classroom.grade_label} ${classroom.section_name}` : "Sección";
                                                })(),
                                                STUDENTS: `${rule.student_ids?.length || 0} alumnos seleccionados`,
                                            };
                                            return (
                                                <div key={rule.id} className="flex flex-wrap items-center justify-between gap-md py-md">
                                                    <div>
                                                        <p className="font-semibold">{rule.name}</p>
                                                        <p className="text-sm text-secondary">
                                                            {concept?.name || "Concepto"} · {scopeNames[rule.scope_type]}
                                                            {` · ${rule.frequency === "MONTHLY" ? `Mensual · vence el día ${rule.due_day}` : rule.frequency === "WEEKLY" ? "Semanal" : "Una vez"}`}
                                                        </p>
                                                        <p className="text-xs text-secondary">
                                                            {rule.starts_on}{rule.ends_on ? ` – ${rule.ends_on}` : " · Sin fecha final"}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-sm">
                                                        <span className="font-semibold">{currencyFormat(rule.amount, currency)}</span>
                                                        <span className="text-xs text-secondary">{rule.status === "ACTIVE" ? "Activa" : "Inactiva"}</span>
                                                        {canManage && (
                                                            <>
                                                                <Button size="sm" variant="ghost" icon={Pencil} iconOnly accessibilityLabel="Editar regla" onClick={() => openModal("edit_rule", rule)} />
                                                                <Button size="sm" variant="outline" onClick={() => toggleRuleStatus(rule, rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>
                                                                    {rule.status === "ACTIVE" ? "Desactivar" : "Activar"}
                                                                </Button>
                                                                <Button size="sm" variant="dangerSoft" icon={Trash2} iconOnly accessibilityLabel="Eliminar regla" onClick={() => askDeleteRule(rule)} />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <Pagination {...rulePagination} onPageChange={rulePagination.setPage} />
                                    </>
                                ) : <EmptyState title="Aún no hay reglas" description="Define periodicidad, calendario y destinatarios para generar cargos." />}
                            </Card>
                        </>
                    )}

                    {activeTab === "payments" && (
                        <Card variant="default" title="Registrar pago" subtitle="Confirma abonos para actualizar el saldo de una obligación" icon={Wallet} iconVariant="success">
                            <div className="mb-md flex flex-wrap items-center justify-between gap-md">
                                <Input name="payments-search" aria-label="Buscar pagos" leftIcon={Search} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por alumno o referencia..." fullWidth />
                                {canManage && <Button icon={Plus} onClick={() => openModal("payment")}>Registrar pago</Button>}
                            </div>
                            {renderPaymentsTable(paymentPagination.items, paymentPagination)}
                        </Card>
                    )}

                    {activeTab === "pending" && (
                        <Card variant="default" title="Obligaciones por cobrar" subtitle="Pendientes, pagos parciales y vencidos" icon={CircleAlert} iconVariant="warning">
                            <div className="mb-md flex flex-wrap items-center gap-md">
                                <Input name="pending-search" aria-label="Buscar obligaciones" leftIcon={Search} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar alumno o concepto..." fullWidth />
                                <label className="flex items-center gap-sm rounded-lg border bg-surface px-md">
                                    <span className="text-sm text-secondary">Estado</span>
                                    <select className="bg-transparent py-sm" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                                        <option value="ALL">Todos</option>
                                        {Object.entries(statusLabels)
                                            .filter(([value]) => ["UNPAID", "PARTIAL", "OVERDUE"].includes(value))
                                            .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </label>
                            </div>
                            {renderFeeTable(feePagination.items, feePagination)}
                        </Card>
                    )}

                    {activeTab === "history" && (
                        <Card variant="default" title="Historial de pagos" subtitle="Pagos manuales confirmados para el año seleccionado" icon={CircleCheck} iconVariant="success">
                            <div className="mb-md">
                                <Input name="history-search" aria-label="Buscar en el historial" leftIcon={Search} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar alumno o referencia..." fullWidth />
                            </div>
                            {renderPaymentsTable(paymentPagination.items, paymentPagination)}
                        </Card>
                    )}
                </>
            )}

            {modal && (
                <PaymentActionModal
                    key={`${modal.mode}-${modal.record?.id || "new"}`}
                    mode={modal.mode}
                    record={modal.record}
                    data={{ ...data, academic_years: academicYears }}
                    currency={currency}
                    selectedYearId={activeYearId}
                    onClose={closeModal}
                    onSubmit={submitModal}
                />
            )}

            <ConfirmModal
                confirmation={confirmation}
                busy={busy}
                onCancel={() => setConfirmation(null)}
                onConfirm={confirmAction}
            />
        </div>
    );
}
