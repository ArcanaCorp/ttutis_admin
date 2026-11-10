'use client';

import { useState } from "react";
import { Download, FileSpreadsheet, UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import usePagination from "@/hooks/usePagination";
import { downloadPeopleWorkbook, parsePeopleWorkbook } from "@/services/people.services";

const initialPerson = {
    first_names: "",
    last_names: "",
    document_type: "DNI",
    document_number: "",
    birth_date: "",
    phone: "",
    email: "",
    admission_date: "",
    full_name: "",
    guardian_name: "",
    guardian_email: "",
    relationship: "Madre/Padre",
    student_id: "",
};

const roleOptions = [
    ["STUDENT", "Alumno"],
    ["TEACHER", "Docente"],
    ["ASSISTANT", "Auxiliar"],
    ["GUARDIAN", "Apoderado"],
];

export default function PeopleRegistrationModal({ open, onClose, students = [], onCreate }) {
    const [mode, setMode] = useState("manual");
    const [personType, setPersonType] = useState("STUDENT");
    const [person, setPerson] = useState(initialPerson);
    const [workbookData, setWorkbookData] = useState(null);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");
    const matchingStudents = students.filter(student =>
        `${student.first_names || ""} ${student.last_names || ""} ${student.student_code || ""}`
            .toLocaleLowerCase("es-PE")
            .includes(studentSearch.trim().toLocaleLowerCase("es-PE")),
    );
    const studentPagination = usePagination(matchingStudents, 25);
    const studentOptions = studentPagination.items.some(student => student.id === person.student_id)
        ? studentPagination.items
        : [
            ...students.filter(student => student.id === person.student_id),
            ...studentPagination.items,
        ];

    const reset = () => {
        setPerson(initialPerson);
        setPersonType("STUDENT");
        setMode("manual");
        setWorkbookData(null);
        setFileName("");
        setError("");
        setParsing(false);
        setStudentSearch("");
    };

    const handleClose = () => {
        if (saving) return;
        reset();
        onClose?.();
    };

    const handleWorkbookChange = async event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        setFileName(file?.name || "");
        setWorkbookData(null);
        setError("");
        if (!file) return;
        setParsing(true);
        const result = await parsePeopleWorkbook(file);
        setParsing(false);
        if (result.error) {
            setError(result.error.message);
            return;
        }
        setWorkbookData(result.data);
    };

    const handleSubmit = async event => {
        event.preventDefault();
        setError("");
        let payload;
        if (mode === "bulk") {
            if (!workbookData) {
                setError("Carga un Excel válido antes de continuar.");
                return;
            }
            payload = workbookData;
        } else if (personType === "STUDENT") {
            if ((person.guardian_email || person.guardian_name) && (!person.guardian_email.trim() || !person.guardian_name.trim() || !person.relationship.trim())) {
                setError("Completa nombre, correo y parentesco del apoderado, o deja vacíos nombre y correo para no vincularlo ahora.");
                return;
            }
            payload = {
                students: [{
                    first_names: person.first_names.trim(),
                    last_names: person.last_names.trim(),
                    document_type: person.document_type || null,
                    document_number: person.document_number.trim(),
                    birth_date: person.birth_date,
                    phone: person.phone.trim(),
                    email: person.email.trim(),
                    admission_date: person.admission_date,
                }],
                staff: [],
                guardians: person.guardian_email ? [{
                    full_name: person.guardian_name.trim(),
                    email: person.guardian_email.trim(),
                    links: [{ student_index: 0, relationship: person.relationship.trim() }],
                }] : [],
            };
        } else if (personType === "GUARDIAN") {
            payload = {
                students: [],
                staff: [],
                guardians: [{
                    full_name: person.full_name.trim(),
                    email: person.email.trim(),
                    links: [{ student_id: person.student_id, relationship: person.relationship.trim() }],
                }],
            };
        } else {
            payload = {
                students: [],
                staff: [{ role: personType, full_name: person.full_name.trim(), email: person.email.trim() }],
                guardians: [],
            };
        }

        setSaving(true);
        try {
            await onCreate(payload);
            reset();
            onClose?.();
        } catch (submitError) {
            setError(submitError.message || "No se pudo registrar a la persona.");
        } finally {
            setSaving(false);
        }
    };

    const renderManualFields = () => {
        if (personType === "STUDENT") {
            return (
                <>
                    <div className="grid grid-cols-2 gap-md">
                        <Input name="student-first-names" label="Nombres" value={person.first_names} onChange={event => setPerson(current => ({ ...current, first_names: event.target.value }))} required fullWidth />
                        <Input name="student-last-names" label="Apellidos" value={person.last_names} onChange={event => setPerson(current => ({ ...current, last_names: event.target.value }))} required fullWidth />
                        <Input name="student-document-type" label="Tipo de documento" value={person.document_type} onChange={event => setPerson(current => ({ ...current, document_type: event.target.value }))} fullWidth />
                        <Input name="student-document-number" label="N.º de documento" value={person.document_number} onChange={event => setPerson(current => ({ ...current, document_number: event.target.value }))} fullWidth />
                        <Input name="student-birth-date" label="Fecha de nacimiento" type="date" value={person.birth_date} onChange={event => setPerson(current => ({ ...current, birth_date: event.target.value }))} fullWidth />
                        <Input name="student-admission-date" label="Fecha de ingreso" type="date" value={person.admission_date} onChange={event => setPerson(current => ({ ...current, admission_date: event.target.value }))} fullWidth />
                        <Input name="student-phone" label="Teléfono" type="tel" value={person.phone} onChange={event => setPerson(current => ({ ...current, phone: event.target.value }))} fullWidth />
                        <Input name="student-email" label="Correo del alumno" type="email" value={person.email} onChange={event => setPerson(current => ({ ...current, email: event.target.value }))} helperText="Se enviará una invitación para activar su cuenta." required fullWidth />
                    </div>
                    <div className="border-t pt-md flex flex-col gap-md">
                        <h3 className="font-medium">Vincular un apoderado (opcional)</h3>
                        <div className="grid grid-cols-2 gap-md">
                            <Input name="guardian-name" label="Nombre completo" value={person.guardian_name} onChange={event => setPerson(current => ({ ...current, guardian_name: event.target.value }))} fullWidth />
                            <Input name="guardian-email" label="Correo del apoderado" type="email" value={person.guardian_email} onChange={event => setPerson(current => ({ ...current, guardian_email: event.target.value }))} helperText="Se enviará la invitación." fullWidth />
                        </div>
                        <Input name="guardian-relationship" label="Parentesco" value={person.relationship} onChange={event => setPerson(current => ({ ...current, relationship: event.target.value }))} fullWidth />
                    </div>
                </>
            );
        }

        if (personType === "GUARDIAN") {
            return (
                <>
                    <Input name="guardian-full-name" label="Nombre completo" value={person.full_name} onChange={event => setPerson(current => ({ ...current, full_name: event.target.value }))} required fullWidth />
                    <Input name="guardian-account-email" label="Correo para la invitación" type="email" autoComplete="email" value={person.email} onChange={event => setPerson(current => ({ ...current, email: event.target.value }))} required fullWidth />
                    <div className="flex flex-col gap-xs text-sm">
                        <label htmlFor="guardian-student-select" className="font-medium">Alumno</label>
                        <Input
                            name="guardian-student-search"
                            aria-label="Buscar alumno para vincular al apoderado"
                            type="search"
                            value={studentSearch}
                            onChange={event => {
                                setStudentSearch(event.target.value);
                                studentPagination.setPage(1);
                            }}
                            placeholder="Buscar por nombre o código"
                            fullWidth
                        />
                        <select id="guardian-student-select" className="w-full border radius-md bg-surface p-sm" value={person.student_id} onChange={event => setPerson(current => ({ ...current, student_id: event.target.value }))} required>
                            <option value="" disabled>Selecciona un alumno</option>
                            {studentOptions.map(student => <option key={student.id} value={student.id}>{[student.first_names, student.last_names].filter(Boolean).join(" ")}</option>)}
                        </select>
                        <Pagination {...studentPagination} onPageChange={studentPagination.setPage} />
                        {!students.length && <span className="text-xs text-secondary">Registra primero al alumno.</span>}
                    </div>
                    <Input name="guardian-relationship-existing" label="Parentesco" value={person.relationship} onChange={event => setPerson(current => ({ ...current, relationship: event.target.value }))} required fullWidth />
                </>
            );
        }

        return (
            <>
                <Input name="staff-full-name" label="Nombre completo" value={person.full_name} onChange={event => setPerson(current => ({ ...current, full_name: event.target.value }))} required fullWidth />
                <Input name="staff-email" label="Correo para la invitación" type="email" autoComplete="email" value={person.email} onChange={event => setPerson(current => ({ ...current, email: event.target.value }))} required fullWidth />
            </>
        );
    };

    const importedCount = workbookData
        ? workbookData.students.length + workbookData.staff.length + workbookData.guardians.length
        : 0;
    const previewRows = workbookData ? [
        ...workbookData.students.map(student => ({ name: `${student.first_names} ${student.last_names}`, type: "Alumno", email: student.email })),
        ...workbookData.staff.map(person => ({ name: person.full_name, type: person.role === "TEACHER" ? "Docente" : "Auxiliar", email: person.email })),
        ...workbookData.guardians.map(guardian => ({ name: guardian.full_name, type: "Apoderado", email: guardian.email })),
    ].slice(0, 8) : [];

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Registrar personas"
            description="Crea alumnos, docentes, auxiliares y apoderados; las cuentas de acceso reciben una invitación por correo."
            size="lg"
        >
            <div className="flex flex-col gap-md">
                <div className="flex flex-wrap gap-sm" role="group" aria-label="Modo de registro">
                    <Button type="button" size="sm" variant={mode === "manual" ? "primary" : "outline"} aria-pressed={mode === "manual"} onClick={() => { setMode("manual"); setError(""); }}>Registro manual</Button>
                    <Button type="button" size="sm" variant={mode === "bulk" ? "primary" : "outline"} icon={FileSpreadsheet} aria-pressed={mode === "bulk"} onClick={() => { setMode("bulk"); setError(""); }}>Carga masiva Excel</Button>
                </div>

                {mode === "manual" ? (
                    <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
                        <label className="flex flex-col gap-xs text-sm">
                            <span className="font-medium">Tipo de persona</span>
                            <select className="w-full border radius-md bg-surface p-sm" value={personType} onChange={event => { setPersonType(event.target.value); setPerson(initialPerson); setError(""); }}>
                                {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </label>
                        {renderManualFields()}
                        {error && <p className="rounded-md bg-error p-md text-sm text-error whitespace-pre-line" role="alert">{error}</p>}
                        <div className="flex justify-end gap-sm">
                            <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
                            <Button type="submit" icon={UserPlus} loading={saving} loadingText="Registrando…">Registrar</Button>
                        </div>
                    </form>
                ) : (
                    <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
                        <p className="text-sm text-secondary">Usa las hojas Alumnos, Docentes, Auxiliares, Apoderados y Vinculos. El libro de ejemplo contiene datos ficticios; reemplázalos antes de enviar invitaciones.</p>
                        <div className="flex flex-wrap gap-sm">
                            <Button type="button" variant="outline" size="sm" icon={Download} onClick={() => downloadPeopleWorkbook()}>Descargar plantilla</Button>
                            <Button type="button" variant="outline" size="sm" icon={Download} onClick={() => downloadPeopleWorkbook("ejemplo-carga-personas.xlsx", true)}>Descargar ejemplo</Button>
                        </div>
                        <Input name="people-workbook" label="Archivo Excel (.xlsx)" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleWorkbookChange} helperText="Máximo 5 MB, 500 personas y 1,000 vínculos." fullWidth />
                        {fileName && <p className="text-sm">Archivo: <strong>{fileName}</strong></p>}
                        {parsing && <p className="text-sm text-secondary" role="status">Revisando las hojas y los vínculos…</p>}
                        {workbookData && (
                            <div className="flex flex-col gap-sm">
                                <p className="rounded-md bg-success p-md text-sm text-success" role="status">{importedCount} personas y {workbookData.guardians.reduce((total, guardian) => total + guardian.links.length, 0)} vínculos listos para revisar e importar.</p>
                                <div className="overflow-x-auto rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50"><tr><th className="p-sm text-left">Persona</th><th className="p-sm text-left">Tipo</th><th className="p-sm text-left">Correo</th></tr></thead>
                                        <tbody>{previewRows.map((row, index) => <tr key={`${row.email}-${index}`} className="border-t"><td className="p-sm">{row.name}</td><td className="p-sm">{row.type}</td><td className="p-sm">{row.email}</td></tr>)}</tbody>
                                    </table>
                                </div>
                                {importedCount > previewRows.length && <p className="text-xs text-secondary">Se muestran {previewRows.length} de {importedCount} registros.</p>}
                            </div>
                        )}
                        {error && <p className="rounded-md bg-error p-md text-sm text-error whitespace-pre-line" role="alert">{error}</p>}
                        <div className="flex justify-end gap-sm">
                            <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
                            <Button type="submit" icon={FileSpreadsheet} loading={saving} loadingText="Creando cuentas…" disabled={!workbookData || parsing}>Importar personas</Button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
}
