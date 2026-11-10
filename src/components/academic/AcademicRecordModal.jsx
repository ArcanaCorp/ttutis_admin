'use client';

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Download, FileSpreadsheet } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { downloadAcademicTemplate, readAcademicWorkbook } from "@/services/classesSchedules.services";

const labels = { classroom: "aula", subject: "curso", assignment: "asignación", schedule: "horario" };
const blank = kind => ({
    classroom: { level: "PRIMARY", grade_label: "", grade_order: "", section_name: "", capacity: "", status: "ACTIVE" },
    subject: { name: "", code: "", description: "", status: "ACTIVE" },
    assignment: { classroom_id: "", subject_id: "", teacher_membership_id: "", status: "ACTIVE" },
    schedule: { course_assignment_id: "", weekday: "1", start_time: "08:00", end_time: "09:00", classroom_label: "", status: "ACTIVE" },
}[kind]);

export default function AcademicRecordModal({ open, onClose, kind, record, yearId, data, onSave }) {
    const [form, setForm] = useState(() => blank(kind));
    const [mode, setMode] = useState("manual");
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const classrooms = useMemo(() => (data.classrooms || []).filter(row => row.academic_year_id === yearId), [data.classrooms, yearId]);
    const teachers = useMemo(() => (data.memberships || []).filter(row => row.role === "TEACHER" && row.status === "ACTIVE"), [data.memberships]);
    const assignments = useMemo(() => (data.course_assignments || []).filter(row => row.academic_year_id === yearId && row.status === "ACTIVE"), [data.course_assignments, yearId]);
    const subjects = (data.subjects || []).filter(row => row.status === "ACTIVE");

    useEffect(() => {
        if (!open) return;
        setMode("manual"); setFile(null); setError(""); setNotice("");
        if (!record) { setForm(blank(kind)); return; }
        const fields = {
            classroom: ["level", "grade_label", "grade_order", "section_name", "capacity", "status"],
            subject: ["name", "code", "description", "status"],
            assignment: ["classroom_id", "subject_id", "teacher_membership_id", "status"],
            schedule: ["course_assignment_id", "weekday", "start_time", "end_time", "classroom_label", "effective_from", "effective_until", "status"],
        }[kind];
        const values = Object.fromEntries(fields.map(field => [field, record[field] ?? ""]));
        if (kind === "classroom") for (const field of ["grade_order", "capacity"]) values[field] = values[field] ?? "";
        if (kind === "schedule") {
            values.start_time = values.start_time?.slice(0, 5) || "08:00";
            values.end_time = values.end_time?.slice(0, 5) || "09:00";
            values.weekday = String(values.weekday || 1);
        }
        setForm({ ...blank(kind), ...values });
    }, [open, kind, record]);

    const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
    const eligibleAssignments = assignments.filter(row => !form.classroom_id || row.classroom_id === form.classroom_id);

    const validate = values => {
        if (kind === "classroom") {
            if (!values.grade_label.trim() || !values.section_name.trim()) return "Completa el grado y la sección.";
            if (!yearId) return "Selecciona un año escolar antes de crear el aula.";
            if (values.capacity !== "" && (!Number.isInteger(Number(values.capacity)) || Number(values.capacity) < 1)) return "La capacidad debe ser un entero mayor que cero.";
            if (values.grade_order !== "" && (!Number.isInteger(Number(values.grade_order)) || Number(values.grade_order) < 1)) return "El orden del grado debe ser un entero mayor que cero.";
            if ((data.classrooms || []).some(row => row.academic_year_id === yearId && row.level === values.level && row.grade_label.trim().toLocaleLowerCase() === values.grade_label.trim().toLocaleLowerCase() && row.section_name.trim().toLocaleLowerCase() === values.section_name.trim().toLocaleLowerCase() && row.id !== record?.id)) return "Ya existe un aula con ese nivel, grado y sección en este año.";
        }
        if (kind === "subject" && !values.name.trim()) return "El nombre del curso es obligatorio.";
        if (kind === "subject" && (data.subjects || []).some(row => row.name.trim().toLocaleLowerCase() === values.name.trim().toLocaleLowerCase() && row.id !== record?.id)) return "Ya existe un curso con ese nombre.";
        if (kind === "assignment") {
            if (!yearId) return "Selecciona un año escolar antes de asignar cursos.";
            if (!values.classroom_id || !values.subject_id || !values.teacher_membership_id) return "Selecciona un aula, un curso y un docente.";
            if ((data.course_assignments || []).some(row => row.academic_year_id === yearId && row.classroom_id === values.classroom_id && row.subject_id === values.subject_id && row.id !== record?.id && row.status === "ACTIVE")) return "Ese curso ya está asignado al aula seleccionada.";
        }
        if (kind === "schedule") {
            if (!yearId) return "Selecciona un año escolar antes de programar horarios.";
            if (!values.course_assignment_id || !values.weekday || !values.start_time || !values.end_time) return "Completa curso, día y horario.";
            if (values.start_time >= values.end_time) return "La hora de fin debe ser posterior a la hora de inicio.";
            const assignment = assignments.find(row => row.id === values.course_assignment_id);
            const startTime = values.start_time.length === 5 ? `${values.start_time}:00` : values.start_time;
            const endTime = values.end_time.length === 5 ? `${values.end_time}:00` : values.end_time;
            const conflict = (data.schedules || []).some(row => {
                if (row.id === record?.id || row.status !== "ACTIVE" || row.weekday !== Number(values.weekday)) return false;
                const otherAssignment = (data.course_assignments || []).find(item => item.id === row.course_assignment_id);
                const sameClass = otherAssignment?.classroom_id === assignment?.classroom_id;
                const sameTeacher = otherAssignment?.teacher_membership_id === assignment?.teacher_membership_id;
                return (sameClass || sameTeacher) && row.start_time < endTime && row.end_time > startTime;
            });
            if (conflict) return "El horario se cruza con otra clase del aula o del docente en el mismo día.";
        }
        return "";
    };

    const saveManual = async event => {
        event.preventDefault(); setError(""); setNotice("");
        const validation = validate(form);
        if (validation) { setError(validation); return; }
        const values = { ...form };
        if (kind === "classroom") {
            values.academic_year_id = yearId;
            values.grade_order = values.grade_order === "" ? null : Number(values.grade_order);
            values.capacity = values.capacity === "" ? null : Number(values.capacity);
        }
        if (kind === "assignment") values.academic_year_id = yearId;
        if (kind === "subject") { values.name = values.name.trim(); values.code = values.code.trim() || null; values.description = values.description.trim() || null; }
        if (kind === "schedule") { values.weekday = Number(values.weekday); values.start_time = values.start_time.length === 5 ? `${values.start_time}:00` : values.start_time; values.end_time = values.end_time.length === 5 ? `${values.end_time}:00` : values.end_time; values.effective_from = values.effective_from || null; values.effective_until = values.effective_until || null; }
        try { setSaving(true); await onSave(kind, values, record?.id); onClose(); }
        catch (saveError) { setError(saveError.message || "No se pudo guardar el registro."); }
        finally { setSaving(false); }
    };

    const importBulk = async () => {
        setError(""); setNotice("");
        if (!file) { setError("Selecciona un archivo Excel para importar."); return; }
        try {
            setSaving(true);
            const rows = await readAcademicWorkbook(file, kind, { academicYearId: yearId, classrooms, subjects, memberships: teachers, assignments, existingSchedules: data.schedules || [] });
            await onSave(kind, rows);
            setNotice(`Se importaron ${rows.length} ${labels[kind]}${rows.length === 1 ? "" : "s"}.`);
            setFile(null);
            window.setTimeout(onClose, 500);
        } catch (importError) { setError(importError.message || "No se pudo procesar la carga."); }
        finally { setSaving(false); }
    };

    const field = (name, title, type = "text", required = false) => <Input name={name} label={title} type={type} value={form[name] ?? ""} required={required} onChange={event => set(name, event.target.value)} fullWidth />;
    const select = (name, title, options, required = true) => <label className="flex flex-col gap-xs"><span className="text-sm font-medium">{title}</span><select className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white" value={form[name] || ""} required={required} onChange={event => set(name, event.target.value)}><option value="">Selecciona...</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
    const names = { classroom: record ? "Editar aula" : "Aula y sección", subject: record ? "Editar curso" : "Curso", assignment: record ? "Editar asignación" : "Curso y docente", schedule: record ? "Editar horario" : "Horario" };
    const bulkTitles = { classroom: "Importar aulas", subject: "Importar cursos", assignment: "Importar asignaciones", schedule: "Importar horarios" };

    return <Modal open={open} onClose={onClose} title={mode === "bulk" ? bulkTitles[kind] : names[kind]} description={mode === "bulk" ? "Valida todas las filas antes de guardar; si hay errores, no se importa ninguna." : "Los registros se guardan en la institución y año escolar seleccionados."} size="lg" closeOnBackdrop={!saving}>
        {!record && <div className="flex gap-sm border-b pb-md mb-md"><Button size="sm" variant={mode === "manual" ? "primarySoft" : "ghost"} onClick={() => { setMode("manual"); setError(""); }}>Registro manual</Button><Button size="sm" variant={mode === "bulk" ? "primarySoft" : "ghost"} icon={FileSpreadsheet} onClick={() => { setMode("bulk"); setError(""); }}>{bulkTitles[kind]}</Button></div>}
        {mode === "manual" ? <form onSubmit={saveManual} className="flex flex-col gap-md">
            {kind === "classroom" && <><div className="grid sm:grid-cols-2 gap-md">{select("level", "Nivel", [{ value: "INITIAL", label: "Inicial" }, { value: "PRIMARY", label: "Primaria" }, { value: "SECONDARY", label: "Secundaria" }, { value: "OTHER", label: "Otro" }])}{field("grade_label", "Grado", "text", true)}{field("section_name", "Sección", "text", true)}{field("grade_order", "Orden del grado", "number")}{field("capacity", "Capacidad", "number")}{select("status", "Estado", [{ value: "ACTIVE", label: "Activo" }, { value: "INACTIVE", label: "Inactivo" }])}</div></>}
            {kind === "subject" && <div className="grid sm:grid-cols-2 gap-md">{field("name", "Nombre del curso", "text", true)}{field("code", "Código")}</div>}
            {kind === "subject" && field("description", "Descripción")}
            {kind === "assignment" && <div className="grid gap-md">{select("classroom_id", "Aula", classrooms.map(row => ({ value: row.id, label: `${row.grade_label} ${row.section_name} · ${row.level}` })))}{select("subject_id", "Curso", subjects.map(row => ({ value: row.id, label: row.name })))}{select("teacher_membership_id", "Docente", teachers.map(row => ({ value: row.id, label: `${row.full_name}${row.email ? ` · ${row.email}` : ""}` })))}</div>}
            {kind === "schedule" && <div className="grid sm:grid-cols-2 gap-md">{select("course_assignment_id", "Curso asignado", eligibleAssignments.map(row => ({ value: row.id, label: `${classrooms.find(item => item.id === row.classroom_id)?.grade_label || "Aula"} ${classrooms.find(item => item.id === row.classroom_id)?.section_name || ""} · ${subjects.find(item => item.id === row.subject_id)?.name || "Curso"}` })))}{select("weekday", "Día", ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((label, index) => ({ value: String(index + 1), label })))}{field("start_time", "Hora de inicio", "time", true)}{field("end_time", "Hora de fin", "time", true)}{field("classroom_label", "Ambiente o aula", "text")}</div>}
            {error && <p className="flex items-start gap-sm rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert"><AlertCircle size={17} className="shrink-0" />{error}</p>}
            <div className="flex justify-end gap-sm"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" loading={saving}>{record ? "Guardar cambios" : "Guardar"}</Button></div>
        </form> : <div className="flex flex-col gap-md">
            <div className="flex flex-wrap items-center justify-between gap-sm rounded-lg border bg-gray-50 p-md"><div className="flex items-start gap-sm"><FileSpreadsheet size={19} className="mt-0.5 text-green-700"/><div><p className="text-sm font-medium">Plantilla de importación</p><p className="text-xs text-gray-500">Hasta 500 filas y 5 MB. Usa la primera hoja.</p></div></div><Button size="sm" variant="outline" icon={Download} onClick={() => downloadAcademicTemplate(kind)}>Descargar plantilla</Button></div>
            <label className="flex flex-col gap-sm rounded-lg border border-dashed p-lg text-center"><span className="text-sm font-medium">Selecciona el archivo de Excel</span><input type="file" accept=".xlsx,.xls" onChange={event => { setFile(event.target.files?.[0] || null); setError(""); }} className="text-sm"/><span className="text-xs text-gray-500">{file?.name || "Formatos .xlsx y .xls"}</span></label>
            {notice && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</p>}
            {error && <pre className="whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</pre>}
            <div className="flex justify-end gap-sm"><Button variant="outline" onClick={onClose} disabled={saving}>Cerrar</Button><Button onClick={importBulk} loading={saving}>Validar e importar</Button></div>
        </div>}
    </Modal>;
}
