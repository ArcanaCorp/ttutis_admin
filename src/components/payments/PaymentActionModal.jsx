'use client';

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import usePagination from "@/hooks/usePagination";

const conceptTypes = {
    MATRICULA: "Matrícula",
    PENSION: "Pensión",
    OTHER: "Otro concepto",
};

const frequencies = {
    MONTHLY: "Mensual",
    WEEKLY: "Semanal",
    ONCE: "Única vez",
};

const scopes = {
    INSTITUTION: "Toda la institución",
    LEVEL: "Por nivel",
    GRADE: "Por grado",
    CLASSROOM: "Por sección",
    STUDENTS: "Alumnos seleccionados",
};

const methods = {
    CASH: "Efectivo",
    TRANSFER: "Transferencia",
    DEPOSIT: "Depósito",
    OTHER: "Otro",
};

function localDateTime() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

function getInitialValues(mode, record, data, selectedYearId) {
    const currentYear = data.academic_years?.find(year => year.id === selectedYearId)
        || data.academic_years?.find(year => year.status === "ACTIVE")
        || data.academic_years?.[0];

    if (mode.includes("concept")) {
        return {
            id: record?.id || "",
            name: record?.name || "",
            description: record?.description || "",
            conceptType: record?.concept_type || "PENSION",
            amount: record?.amount || "",
        };
    }

    if (mode.includes("rule")) {
        return {
            id: record?.id || "",
            name: record?.name || "",
            academicYearId: record?.academic_year_id || currentYear?.id || "",
            feeConceptId: record?.fee_concept_id || "",
            scopeType: record?.scope_type || "INSTITUTION",
            targetLevel: record?.target_level || "",
            targetGrade: record?.target_grade || "",
            classroomId: record?.classroom_id || "",
            studentIds: record?.student_ids || [],
            frequency: record?.frequency || "MONTHLY",
            amount: record?.amount || "",
            startsOn: record?.starts_on || currentYear?.starts_on || "",
            endsOn: record?.ends_on || "",
            dueDay: record?.due_day || "",
        };
    }

    if (mode === "obligation" || mode === "edit_obligation") {
        return {
            id: record?.id || "",
            academicYearId: record?.academic_year_id || currentYear?.id || "",
            studentId: record?.student_id || "",
            feeConceptId: record?.fee_concept_id || "",
            periodLabel: record?.period_label || "",
            dueDate: record?.due_date || "",
            amount: record?.amount || "",
        };
    }

    if (mode === "payment") {
        return {
            studentFeeId: record?.id || "",
            amount: record
                ? Math.max(0, Number(record.amount) - Number(record.paid_amount || 0))
                : "",
            paidAt: localDateTime(),
            paymentMethod: "CASH",
            reference: "",
            notes: "",
        };
    }

    return {
        ruleId: "",
        academicYearId: currentYear?.id || "",
        throughDate: currentYear?.ends_on || "",
    };
}

function Field({ label, children, helperText }) {
    return (
        <label className="flex flex-col gap-xs text-sm font-medium">
            {label}
            {children}
            {helperText && (
                <span className="text-xs font-normal text-secondary">{helperText}</span>
            )}
        </label>
    );
}

function Select({ id, name, value, onChange, children, required = false, disabled = false }) {
    return (
        <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className="w-full rounded-lg border bg-white px-md py-sm text-sm"
        >
            {children}
        </select>
    );
}

export default function PaymentActionModal({
    mode,
    record,
    data,
    currency,
    selectedYearId,
    onClose,
    onSubmit,
}) {
    const [form, setForm] = useState(() => getInitialValues(mode, record, data, selectedYearId));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [studentSearch, setStudentSearch] = useState("");
    const [feeSearch, setFeeSearch] = useState("");
    const classrooms = (data.classrooms || []).filter(classroom =>
        classroom.academic_year_id === form.academicYearId
        && classroom.status === "ACTIVE",
    );
    const grades = [...new Map(classrooms.map(classroom => [
        `${classroom.level}|${classroom.grade_label}`,
        { level: classroom.level, label: classroom.grade_label },
    ])).values()];
    const feeOptions = (data.student_fees || []).filter(fee => {
        const balance = Number(fee.amount) - Number(fee.paid_amount || 0);
        return (!selectedYearId || !fee.academic_year_id || fee.academic_year_id === selectedYearId)
            && !["PAID", "WAIVED"].includes(fee.status)
            && balance > 0;
    });
    const activeConcepts = (data.fee_concepts || []).filter(concept => concept.status === "ACTIVE");
    const availableConcepts = mode === "edit_rule" && record?.fee_concept_id
        && !activeConcepts.some(concept => concept.id === record.fee_concept_id)
        ? [...activeConcepts, data.fee_concepts.find(concept => concept.id === record.fee_concept_id)].filter(Boolean)
        : activeConcepts;
    const activeStudents = (data.students || [])
        .filter(student => student.status === "ACTIVE")
        .sort((first, second) => `${first.last_names} ${first.first_names}`.localeCompare(
            `${second.last_names} ${second.first_names}`,
            "es",
        ));
    const matchingStudents = activeStudents.filter(student =>
        `${student.first_names || ""} ${student.last_names || ""} ${student.student_code || ""}`
            .toLocaleLowerCase("es-PE")
            .includes(studentSearch.trim().toLocaleLowerCase("es-PE")),
    );
    const studentPagination = usePagination(matchingStudents, 25);
    const studentOptions = studentPagination.items.some(student => student.id === form.studentId)
        ? studentPagination.items
        : [
            ...activeStudents.filter(student => student.id === form.studentId),
            ...studentPagination.items,
        ];
    const studentById = new Map(activeStudents.map(student => [student.id, student]));
    const matchingFeeOptions = feeOptions.filter(fee => {
        const student = studentById.get(fee.student_id);
        const searchText = `${student?.first_names || ""} ${student?.last_names || ""} ${fee.concept || ""} ${fee.period_label || ""}`;
        return searchText.toLocaleLowerCase("es-PE").includes(feeSearch.trim().toLocaleLowerCase("es-PE"));
    });
    const feePagination = usePagination(matchingFeeOptions, 25);
    const feeSelectOptions = feePagination.items.some(fee => fee.id === form.studentFeeId)
        ? feePagination.items
        : [
            ...feeOptions.filter(fee => fee.id === form.studentFeeId),
            ...feePagination.items,
        ];

    const update = event => {
        const { name, value } = event.target;
        setForm(current => {
            const next = { ...current, [name]: value };
            if (name === "academicYearId") {
                next.targetLevel = "";
                next.targetGrade = "";
                next.classroomId = "";
            }
            if (name === "targetLevel") next.targetGrade = "";
            if (name === "feeConceptId" && (mode === "obligation" || mode === "edit_obligation")) {
                next.amount = activeConcepts.find(concept => concept.id === value)?.amount || "";
            }
            if (name === "feeConceptId" && mode.includes("rule")) {
                next.amount = availableConcepts.find(concept => concept.id === value)?.amount || "";
            }
            if (name === "studentFeeId" && mode === "payment") {
                const fee = data.student_fees?.find(item => item.id === value);
                next.amount = fee
                    ? Math.max(0, Number(fee.amount) - Number(fee.paid_amount || 0))
                    : "";
            }
            return next;
        });
    };

    const submit = async event => {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            let values = { ...form };
            if (mode === "payment") {
                values.paidAt = new Date(form.paidAt).toISOString();
                values.idempotencyKey = crypto.randomUUID();
            }
            await onSubmit(values);
            onClose();
        } catch (submitError) {
            setError(submitError.message || "No se pudo guardar la información.");
        } finally {
            setSaving(false);
        }
    };

    const title = {
        concept: "Nuevo concepto de cobro",
        edit_concept: "Editar concepto de cobro",
        rule: "Nueva regla de cobro",
        edit_rule: "Editar regla de cobro",
        obligation: "Nueva obligación manual",
        edit_obligation: "Editar obligación manual",
        payment: "Registrar y confirmar pago",
        generate: "Generar obligaciones",
    }[mode];

    return (
        <Modal open title={title} onClose={saving ? undefined : onClose} size="lg">
            <form className="flex flex-col gap-md" onSubmit={submit}>
                {(mode === "concept" || mode === "edit_concept") && (
                    <>
                        <Input
                            name="name"
                            label="Nombre del concepto"
                            value={form.name}
                            onChange={update}
                            maxLength={120}
                            required
                            fullWidth
                        />
                        <Field label="Tipo">
                            <Select name="conceptType" value={form.conceptType} onChange={update} required>
                                {Object.entries(conceptTypes).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </Select>
                        </Field>
                        <Input
                            name="amount"
                            label={`Importe (${currency})`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={form.amount}
                            onChange={update}
                            required
                            fullWidth
                        />
                        <Field label="Descripción (opcional)">
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={update}
                                rows={3}
                                maxLength={1000}
                                className="w-full rounded-lg border bg-white px-md py-sm text-sm"
                            />
                        </Field>
                    </>
                )}

                {(mode === "rule" || mode === "edit_rule") && (
                    <>
                        <Input
                            name="name"
                            label="Nombre de la regla"
                            value={form.name}
                            onChange={update}
                            maxLength={160}
                            required
                            fullWidth
                        />
                        <div className="grid grid-cols-2 gap-md">
                            <Field label="Año escolar">
                                <Select name="academicYearId" value={form.academicYearId} onChange={update} required>
                                    {(data.academic_years || []).map(year => (
                                        <option key={year.id} value={year.id}>{year.name}</option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Concepto">
                                <Select name="feeConceptId" value={form.feeConceptId} onChange={update} required>
                                    <option value="">Selecciona concepto</option>
                                    {availableConcepts.map(concept => (
                                        <option key={concept.id} value={concept.id}>
                                            {concept.name} · {concept.amount} {currency}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>
                        <Field label="Aplicación">
                            <Select name="scopeType" value={form.scopeType} onChange={update} required>
                                {Object.entries(scopes).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </Select>
                        </Field>

                        {(form.scopeType === "LEVEL" || form.scopeType === "GRADE") && (
                            <Field label="Nivel">
                                <Select name="targetLevel" value={form.targetLevel} onChange={update} required>
                                    <option value="">Selecciona nivel</option>
                                    {[...new Set(grades.map(grade => grade.level))].map(level => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </Select>
                            </Field>
                        )}

                        {form.scopeType === "GRADE" && (
                            <Field label="Grado">
                                <Select name="targetGrade" value={form.targetGrade} onChange={update} required>
                                    <option value="">Selecciona grado</option>
                                    {grades.filter(grade => grade.level === form.targetLevel).map(grade => (
                                        <option key={grade.label} value={grade.label}>{grade.label}</option>
                                    ))}
                                </Select>
                            </Field>
                        )}

                        {form.scopeType === "CLASSROOM" && (
                            <Field label="Sección">
                                <Select name="classroomId" value={form.classroomId} onChange={update} required>
                                    <option value="">Selecciona sección</option>
                                    {classrooms.map(classroom => (
                                        <option key={classroom.id} value={classroom.id}>
                                            {classroom.level} · {classroom.grade_label} {classroom.section_name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        )}

                        {form.scopeType === "STUDENTS" && (
                            <div className="flex flex-col gap-sm text-sm">
                                <label htmlFor="billing-student-search" className="font-medium">Alumnos</label>
                                <Input
                                    id="billing-student-search"
                                    name="billing-student-search"
                                    aria-label="Buscar alumnos para la regla"
                                    type="search"
                                    value={studentSearch}
                                    onChange={event => {
                                        setStudentSearch(event.target.value);
                                        studentPagination.setPage(1);
                                    }}
                                    placeholder="Buscar por nombre o código"
                                    fullWidth
                                />
                                <p className="text-xs text-secondary">
                                    {form.studentIds.length} alumnos seleccionados
                                </p>
                                <div className="max-h-64 overflow-y-auto rounded-lg border">
                                    {studentPagination.items.map(student => (
                                        <label key={student.id} className="flex items-center gap-sm border-b px-md py-sm last:border-0">
                                            <input
                                                type="checkbox"
                                                checked={form.studentIds.includes(student.id)}
                                                onChange={event => setForm(current => ({
                                                    ...current,
                                                    studentIds: event.target.checked
                                                        ? [...new Set([...current.studentIds, student.id])]
                                                        : current.studentIds.filter(id => id !== student.id),
                                                }))}
                                            />
                                            <span>{student.last_names}, {student.first_names}</span>
                                        </label>
                                    ))}
                                    {!matchingStudents.length && (
                                        <p className="p-md text-xs text-secondary">No hay alumnos que coincidan con la búsqueda.</p>
                                    )}
                                </div>
                                <Pagination {...studentPagination} onPageChange={studentPagination.setPage} />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-md">
                            <Field label="Frecuencia">
                                <Select name="frequency" value={form.frequency} onChange={update} required>
                                    {Object.entries(frequencies).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </Select>
                            </Field>
                            <Input
                                name="amount"
                                label={`Importe por obligación (${currency})`}
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.amount}
                                onChange={update}
                                required
                                fullWidth
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-md">
                            <Input name="startsOn" label="Inicia el" type="date" value={form.startsOn} onChange={update} required fullWidth />
                            <Input name="endsOn" label="Finaliza el (opcional)" type="date" value={form.endsOn} onChange={update} fullWidth />
                        </div>
                        {form.frequency === "MONTHLY" && (
                            <Input
                                name="dueDay"
                                label="Día de vencimiento mensual"
                                type="number"
                                min="1"
                                max="31"
                                value={form.dueDay}
                                onChange={update}
                                helperText="Si un mes no tiene ese día, se usa el último día del mes."
                                required
                                fullWidth
                            />
                        )}
                    </>
                )}

                {(mode === "obligation" || mode === "edit_obligation") && (
                    <>
                        <Field label="Año escolar">
                            <Select name="academicYearId" value={form.academicYearId} onChange={update} required>
                                {(data.academic_years || []).map(year => (
                                    <option key={year.id} value={year.id}>{year.name}</option>
                                ))}
                            </Select>
                        </Field>
                        <div className="flex flex-col gap-xs text-sm font-medium">
                            <label htmlFor="obligation-student-select">Alumno</label>
                            <Input
                                name="obligation-student-search"
                                aria-label="Buscar alumno para la obligación"
                                type="search"
                                value={studentSearch}
                                onChange={event => {
                                    setStudentSearch(event.target.value);
                                    studentPagination.setPage(1);
                                }}
                                placeholder="Buscar por nombre o código"
                                fullWidth
                            />
                            <Select id="obligation-student-select" name="studentId" value={form.studentId} onChange={update} required>
                                <option value="">Selecciona alumno</option>
                                {studentOptions.map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.last_names}, {student.first_names}
                                    </option>
                                ))}
                            </Select>
                            <Pagination {...studentPagination} onPageChange={studentPagination.setPage} />
                        </div>
                        <Field label="Concepto">
                            <Select name="feeConceptId" value={form.feeConceptId} onChange={update} required>
                                <option value="">Selecciona concepto</option>
                                    {availableConcepts.map(concept => (
                                    <option key={concept.id} value={concept.id}>{concept.name}</option>
                                ))}
                            </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-md">
                            <Input name="periodLabel" label="Periodo" value={form.periodLabel} onChange={update} placeholder="Ej. Marzo 2027" required fullWidth />
                            <Input name="dueDate" label="Fecha de vencimiento" type="date" value={form.dueDate} onChange={update} required fullWidth />
                        </div>
                        <Input name="amount" label={`Importe (${currency})`} type="number" min="0.01" step="0.01" value={form.amount} onChange={update} required fullWidth />
                    </>
                )}

                {mode === "payment" && (
                    <>
                        <div className="flex flex-col gap-xs text-sm font-medium">
                            <label htmlFor="payment-fee-select">Obligación</label>
                            <Input
                                name="payment-fee-search"
                                aria-label="Buscar obligación por alumno o concepto"
                                type="search"
                                value={feeSearch}
                                onChange={event => {
                                    setFeeSearch(event.target.value);
                                    feePagination.setPage(1);
                                }}
                                placeholder="Buscar alumno, concepto o periodo"
                                fullWidth
                            />
                            <Select id="payment-fee-select" name="studentFeeId" value={form.studentFeeId} onChange={update} required>
                                <option value="">Selecciona obligación pendiente</option>
                                {feeSelectOptions.map(fee => {
                                    const student = studentById.get(fee.student_id);
                                    const balance = Number(fee.amount) - Number(fee.paid_amount || 0);
                                    return (
                                        <option key={fee.id} value={fee.id}>
                                            {student ? `${student.last_names}, ${student.first_names}` : "Alumno"}
                                            {` · ${fee.concept} · saldo ${balance.toFixed(2)} ${currency}`}
                                        </option>
                                    );
                                })}
                            </Select>
                            <Pagination {...feePagination} onPageChange={feePagination.setPage} />
                            {!matchingFeeOptions.length && (
                                <span className="text-xs text-secondary">No hay obligaciones que coincidan con la búsqueda.</span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-md">
                            <Input name="amount" label={`Importe recibido (${currency})`} type="number" min="0.01" step="0.01" value={form.amount} onChange={update} required fullWidth />
                            <Input name="paidAt" label="Fecha y hora del pago" type="datetime-local" value={form.paidAt} onChange={update} required fullWidth />
                        </div>
                        <Field label="Método de pago">
                            <Select name="paymentMethod" value={form.paymentMethod} onChange={update} required>
                                {Object.entries(methods).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </Select>
                        </Field>
                        <Input name="reference" label="Referencia u operación (opcional)" value={form.reference} onChange={update} maxLength={120} fullWidth />
                        <Field label="Observación (opcional)">
                            <textarea name="notes" value={form.notes} onChange={update} rows={3} maxLength={1000} className="w-full rounded-lg border bg-white px-md py-sm text-sm" />
                        </Field>
                        <p className="rounded-lg bg-amber-50 p-md text-sm text-amber-800">
                            Al confirmar, el pago se registrará en el historial y actualizará el saldo de la obligación.
                        </p>
                    </>
                )}

                {mode === "generate" && (
                    <>
                        <Field label="Regla de cobro">
                            <Select name="ruleId" value={form.ruleId} onChange={update}>
                                <option value="">Todas las reglas activas</option>
                                {(data.billing_rules || [])
                                    .filter(rule => rule.status === "ACTIVE"
                                        && (!selectedYearId || rule.academic_year_id === selectedYearId))
                                    .map(rule => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
                            </Select>
                        </Field>
                        <Input name="throughDate" label="Generar hasta" type="date" value={form.throughDate} onChange={update} required fullWidth />
                        <p className="text-sm text-secondary">
                            Solo se crearán obligaciones que todavía no existan. Las pensiones mensuales comienzan el mes posterior a la fecha de inicio de la regla.
                        </p>
                    </>
                )}

                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-sm">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button type="submit" loading={saving} loadingText="Guardando…">
                        {mode === "payment" ? "Confirmar pago" : mode === "generate" ? "Generar" : "Guardar"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export { conceptTypes, frequencies, scopes };
