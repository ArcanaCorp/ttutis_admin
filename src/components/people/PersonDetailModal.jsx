'use client';

import { useEffect, useState } from "react";
import {
    AlertCircle,
    Mail,
    Phone,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { getPersonDetails } from "@/services/people.services";

const roleNames = {
    STUDENT: "Alumno",
    TEACHER: "Docente",
    ASSISTANT: "Auxiliar",
    GUARDIAN: "Apoderado",
};

const date = value => {
    if (!value) return "No registrado";

    return new Intl.DateTimeFormat("es-PE", {
        timeZone: "UTC",
        dateStyle: "long",
    }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`));
};

const initialForm = person => {
    if (person?.type === "STUDENT") {
        return {
            first_names: person.first_names || "",
            last_names: person.last_names || "",
            student_code: person.code || "",
            document_type: person.document_type || "",
            document_number: person.document_number || "",
            birth_date: person.birth_date || "",
            admission_date: person.admission_date || "",
            phone: person.phone || "",
        };
    }

    return {
        full_name: person?.name || "",
        relationship: person?.links?.[0]?.relationship || "",
    };
};

function Detail({ person }) {
    const pairs = person.type === "STUDENT"
        ? [
            ["Nombres", person.first_names],
            ["Apellidos", person.last_names],
            ["Código de alumno", person.code],
            [
                "Documento",
                [person.document_type, person.document_number]
                    .filter(Boolean)
                    .join(" · "),
            ],
            ["Fecha de nacimiento", date(person.birth_date)],
            ["Fecha de ingreso", date(person.admission_date)],
            ["Correo", person.email],
            ["Teléfono", person.phone],
            ["Año escolar", person.academicYear],
            ["Aula", person.classroom],
            ["Estado", person.statusLabel],
            ["Cuenta vinculada", person.profileId ? "Sí" : "No"],
        ]
        : [
            ["Nombre completo", person.name],
            ["Tipo", roleNames[person.type] || person.typeLabel],
            ["Código de acceso", person.code],
            ["Correo", person.email],
            ["Estado", person.statusLabel],
            ["Registrado", date(person.created_at)],
            ["Cuenta vinculada", person.profileId ? "Sí" : "No"],
        ];

    return (
        <div className="flex flex-col gap-lg">
            <div className="grid grid-cols-3 gap-sm">
                {pairs.map(([label, value]) => (
                    <div
                        key={label}
                        className="rounded-lg border bg-gray-50 p-md"
                    >
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="mt-1 break-words text-sm font-medium">
                            {value || "No registrado"}
                        </p>
                    </div>
                ))}
            </div>

            {person.type === "STUDENT" && (
                <section className="flex flex-col gap-sm">
                    <h3 className="font-semibold">Apoderados</h3>
                    {person.links?.length ? (
                        person.links.map(link => (
                            <div
                                key={link.id}
                                className="flex flex-wrap items-center justify-between gap-sm rounded-lg border p-md text-sm"
                            >
                                <span>
                                    {link.name}
                                    {link.email ? ` · ${link.email}` : ""}
                                </span>
                                <span className="text-gray-500">
                                    {link.relationship} · {link.status}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500">
                            Sin apoderados vinculados.
                        </p>
                    )}
                </section>
            )}

            {person.type === "STUDENT" && (
                <section className="flex flex-col gap-sm">
                    <h3 className="font-semibold">Historial de matrícula</h3>
                    {person.enrollments?.length ? (
                        person.enrollments.map(enrollment => (
                            <div
                                key={enrollment.id}
                                className="flex flex-wrap items-center justify-between gap-sm rounded-lg border p-md text-sm"
                            >
                                <span>
                                    {enrollment.yearName || "Año escolar"} ·{" "}
                                    {enrollment.classroom
                                        ? `${enrollment.classroom.grade_label} ${enrollment.classroom.section_name}`
                                        : "Aula"}
                                </span>
                                <span className="text-gray-500">
                                    {enrollment.status} · {date(enrollment.enrolled_at)}
                                    {enrollment.ended_at
                                        ? ` – ${date(enrollment.ended_at)}`
                                        : ""}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500">
                            Sin matrículas registradas.
                        </p>
                    )}
                </section>
            )}

            {person.type === "GUARDIAN" && (
                <section className="flex flex-col gap-sm">
                    <h3 className="font-semibold">Alumnos vinculados</h3>
                    {person.links?.length ? (
                        person.links.map(link => (
                            <div
                                key={link.id}
                                className="flex flex-col gap-xs rounded-lg border p-md text-sm"
                            >
                                <div className="flex items-center justify-between gap-sm">
                                    <span>
                                        {link.studentName} · {link.relationship}
                                    </span>
                                    <span className="text-gray-500">
                                        {link.status}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Acceso: asistencia {link.can_view_attendance ? "sí" : "no"},
                                    notas {link.can_view_grades ? "sí" : "no"},
                                    convivencia {link.can_view_behavior ? "sí" : "no"},
                                    pagos {link.can_view_fees ? "sí" : "no"};
                                    notificaciones {link.can_receive_notifications
                                        ? "activas"
                                        : "inactivas"}.
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500">
                            Sin vínculos registrados.
                        </p>
                    )}
                </section>
            )}
        </div>
    );
}

export default function PersonDetailModal({
    open,
    person,
    canManage,
    onClose,
    onInvite,
    onSave,
    onDelete,
}) {
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [form, setForm] = useState(() => initialForm(person));
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [details, setDetails] = useState(person);
    const [loadingDetails, setLoadingDetails] = useState(Boolean(person));

    useEffect(() => {
        if (!open || !person) return undefined;

        let active = true;

        getPersonDetails(person)
            .then(detail => {
                if (active) setDetails(detail);
            })
            .catch(detailError => {
                if (active) setError(detailError.message);
            })
            .finally(() => {
                if (active) setLoadingDetails(false);
            });

        return () => {
            active = false;
        };
    }, [open, person]);

    if (!person) return null;

    const activePerson = details || person;
    const update = (field, value) => {
        setForm(current => ({ ...current, [field]: value }));
    };

    const action = async (name, callback, values) => {
        setError("");
        setNotice("");
        setBusy(name);

        try {
            const result = await callback(activePerson, values);
            const defaultNotice = name === "invite"
                ? "Se envió el correo de acceso."
                : name === "delete"
                    ? "La persona fue retirada del directorio."
                    : "Se guardaron los cambios.";

            setNotice(result?.message || defaultNotice);

            if (name !== "invite") {
                setEditing(false);
                if (name === "delete") onClose();
            } else {
                setTimeout(() => setNotice(""), 5000);
            }
        } catch (actionError) {
            setError(actionError.message || "No se pudo completar la acción.");
        } finally {
            setBusy("");
        }
    };

    const save = event => {
        event.preventDefault();
        action("save", onSave, form);
    };

    const title = `${roleNames[activePerson.type] || activePerson.typeLabel}: ${activePerson.name}`;
    const inviteAllowed = canManage && Boolean(activePerson.email && activePerson.profileId);
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={confirmDelete ? "Retirar persona" : title}
            description={confirmDelete
                ? "Se desactivará su acceso y se conservará el historial institucional."
                : "Información de contacto, matrícula y cuenta institucional."}
            size="lg"
            closeOnBackdrop={!busy}
        >
            {error && (
                <p
                    role="alert"
                    className="mb-md flex gap-sm rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                    <AlertCircle size={17} className="shrink-0" />
                    {error}
                </p>
            )}

            {notice && (
                <p
                    role="status"
                    className="mb-md rounded-lg bg-green-50 p-3 text-sm text-green-800"
                >
                    {notice}
                </p>
            )}

            {confirmDelete ? (
                <div className="flex flex-col gap-md">
                    <p className="text-sm text-gray-700">
                        ¿Retirar a <strong>{activePerson.name}</strong> de la institución?
                        Se revocará su membresía o vínculo de apoderado. No se borran
                        los registros históricos ni la cuenta de acceso compartida con
                        otras instituciones.
                    </p>
                    <div className="flex justify-end gap-sm">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDelete(false)}
                            disabled={Boolean(busy)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => action("delete", onDelete)}
                            loading={busy === "delete"}
                            loadingText="Retirando…"
                        >
                            Retirar persona
                        </Button>
                    </div>
                </div>
            ) : editing ? (
                <form className="flex flex-col gap-md" onSubmit={save}>
                    {activePerson.type === "STUDENT" ? (
                        <div className="grid sm:grid-cols-2 gap-md">
                            {[
                                ["first_names", "Nombres"],
                                ["last_names", "Apellidos"],
                                ["student_code", "Código de alumno"],
                                ["document_type", "Tipo de documento"],
                                ["document_number", "Número de documento"],
                                ["birth_date", "Fecha de nacimiento", "date"],
                                ["admission_date", "Fecha de ingreso", "date"],
                                ["phone", "Teléfono"],
                            ].map(([key, label, type]) => (
                                <Input
                                    key={key}
                                    name={key}
                                    label={label}
                                    type={type || "text"}
                                    value={form[key]}
                                    onChange={event => update(key, event.target.value)}
                                    fullWidth
                                />
                            ))}
                        </div>
                    ) : (
                        <>
                            <Input
                                name="full_name"
                                label="Nombre completo"
                                value={form.full_name}
                                onChange={event => update("full_name", event.target.value)}
                                required
                                fullWidth
                            />
                            {activePerson.type === "GUARDIAN" && (
                                <Input
                                    name="relationship"
                                    label="Parentesco"
                                    value={form.relationship}
                                    onChange={event => update("relationship", event.target.value)}
                                    fullWidth
                                />
                            )}
                        </>
                    )}

                    <p className="text-xs text-gray-500">
                        El correo de acceso no se cambia desde aquí.
                    </p>

                    <div className="flex justify-end gap-sm">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditing(false)}
                            disabled={Boolean(busy)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            loading={busy === "save"}
                            loadingText="Guardando…"
                        >
                            Guardar cambios
                        </Button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="mb-lg flex items-center gap-md rounded-xl border bg-gray-50 p-md">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-600">
                            <UserRound size={23} />
                        </span>
                        <div className="min-w-0">
                            <p className="font-semibold">{activePerson.name}</p>
                            <p className="text-sm text-gray-500">
                                {activePerson.typeLabel} · {activePerson.detail}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-md text-xs text-gray-500">
                                {activePerson.email && (
                                    <span className="inline-flex items-center gap-xs">
                                        <Mail size={13} />
                                        {activePerson.email}
                                    </span>
                                )}
                                {activePerson.phone && (
                                    <span className="inline-flex items-center gap-xs">
                                        <Phone size={13} />
                                        {activePerson.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {loadingDetails ? (
                        <p className="py-lg text-center text-sm text-gray-500">
                            Cargando información completa…
                        </p>
                    ) : (
                        <Detail person={activePerson} />
                    )}

                    <div className="mt-lg flex flex-wrap justify-end gap-sm">
                        {canManage && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => action("invite", onInvite)}
                                    loading={busy === "invite"}
                                    loadingText="Enviando invitación…"
                                    disabled={!inviteAllowed || loadingDetails}
                                    title={!inviteAllowed
                                        ? "La persona requiere un correo y una cuenta vinculada"
                                        : "Enviar credenciales de acceso"}
                                    icon={Mail}
                                >
                                    Invitar
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setForm(initialForm(activePerson));
                                        setEditing(true);
                                    }}
                                    icon={UserRound}
                                >
                                    Editar
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => {
                                        setError("");
                                        setConfirmDelete(true);
                                    }}
                                    icon={ShieldCheck}
                                >
                                    Eliminar
                                </Button>
                            </>
                        )}
                        <Button variant="ghost" onClick={onClose}>
                            Cancelar
                        </Button>
                    </div>
                </>
            )}
        </Modal>
    );
}
