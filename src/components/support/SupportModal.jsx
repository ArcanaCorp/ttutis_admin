'use client';

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createSupportTicket } from "@/services/support.services";

const supportPhone = "51966327426";
const maxAttachments = 5;
const maxAttachmentBytes = 5 * 1024 * 1024;
const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const supportCategories = [
    ["ACCESS", "Acceso a mi cuenta"],
    ["ACADEMIC", "Gestión académica"],
    ["PAYMENTS", "Pagos"],
    ["COMMUNICATIONS", "Comunicaciones"],
    ["OTHER", "Otro tema"],
];

export default function SupportModal({ open, institutionId, onClose, onCreated }) {
    const [category, setCategory] = useState("ACCESS");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [createdTicket, setCreatedTicket] = useState(null);

    const submit = async event => {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            const ticket = await createSupportTicket({
                institutionId,
                category,
                subject,
                description,
            }, attachments);
            setCreatedTicket(ticket);
            onCreated?.(ticket);
        } catch (submitError) {
            setError(submitError.message || "No se pudo registrar tu solicitud.");
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setCategory("ACCESS");
        setSubject("");
        setDescription("");
        setAttachments([]);
        setError("");
        setCreatedTicket(null);
    };

    const addAttachments = event => {
        const selectedFiles = Array.from(event.target.files || []);
        event.target.value = "";
        setError("");

        if (attachments.length + selectedFiles.length > maxAttachments) {
            setError("Puedes adjuntar un máximo de cinco capturas por ticket.");
            return;
        }

        const invalidFile = selectedFiles.find(file => !acceptedImageTypes.includes(file.type));
        if (invalidFile) {
            setError("Solo se permiten imágenes JPG, PNG o WebP.");
            return;
        }

        const oversizedFile = selectedFiles.find(file => file.size > maxAttachmentBytes);
        if (oversizedFile) {
            setError("Cada captura puede pesar hasta 5 MB.");
            return;
        }

        setAttachments(current => [...current, ...selectedFiles]);
    };

    const handleClose = () => {
        if (saving) return;
        resetForm();
        onClose();
    };

    return (
        <Modal
            open={open}
            title={createdTicket ? "Solicitud registrada" : "Centro de soporte"}
            description={createdTicket
                ? "Tu solicitud quedó guardada para atención."
                : "Cuéntanos qué necesitas y el equipo de TTUTIS podrá revisar tu solicitud."}
            onClose={handleClose}
            size="lg"
        >
            {createdTicket ? (
                <div className="flex flex-col gap-md">
                    <div className="rounded-lg bg-success p-md text-sm">
                        Ticket registrado con el código <strong>{createdTicket.id.slice(0, 8).toUpperCase()}</strong>.
                        Conserva este código para hacer seguimiento.
                    </div>
                    {createdTicket.notification?.message && (
                        <p className={`text-sm ${createdTicket.notification.sent ? "text-success" : "text-warning"}`}>
                            {createdTicket.notification.message}
                        </p>
                    )}
                    {createdTicket.attachmentError && (
                        <p role="alert" className="text-sm text-error">
                            El ticket se guardó, pero no se pudieron adjuntar todas las capturas: {createdTicket.attachmentError}
                        </p>
                    )}
                    {createdTicket.attachmentCount > 0 && (
                        <p className="text-sm text-secondary">
                            Capturas adjuntadas: {createdTicket.attachmentCount}.
                        </p>
                    )}
                    <div className="flex flex-wrap justify-end gap-sm">
                        <Button variant="outline" onClick={resetForm}>
                            Crear otro ticket
                        </Button>
                        <Button onClick={handleClose}>Cerrar</Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-md">
                    <form className="flex flex-col gap-md" onSubmit={submit}>
                        <label className="flex flex-col gap-xs text-sm font-medium">
                            Motivo de la solicitud
                            <select
                                value={category}
                                onChange={event => setCategory(event.target.value)}
                                className="w-full rounded-md border bg-surface px-md py-sm"
                                disabled={saving}
                            >
                                {supportCategories.map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </label>

                        <Input
                            name="support-subject"
                            label="Asunto"
                            placeholder="Resume el motivo de tu consulta"
                            value={subject}
                            onChange={event => setSubject(event.target.value)}
                            minLength={4}
                            maxLength={140}
                            required
                            fullWidth
                            disabled={saving}
                        />

                        <label className="flex flex-col gap-xs text-sm font-medium">
                            Detalle
                            <textarea
                                name="support-description"
                                value={description}
                                onChange={event => setDescription(event.target.value)}
                                placeholder="Describe el problema e incluye los pasos para reproducirlo, si aplica."
                                rows={5}
                                minLength={10}
                                maxLength={5000}
                                required
                                disabled={saving}
                                className="w-full rounded-md border bg-surface px-md py-sm text-sm"
                            />
                            <span className="text-xs text-secondary">Máximo 5,000 caracteres.</span>
                        </label>

                        <label className="flex flex-col gap-xs text-sm font-medium">
                            Capturas de pantalla <span className="font-normal text-secondary">(opcional, máximo 5)</span>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={addAttachments}
                                disabled={saving || attachments.length >= maxAttachments}
                                className="w-full rounded-md border bg-surface p-sm text-sm"
                            />
                            <span className="text-xs font-normal text-secondary">
                                JPG, PNG o WebP; hasta 5 MB por imagen.
                            </span>
                        </label>

                        {attachments.length > 0 && (
                            <ul className="flex flex-col gap-xs" aria-label="Capturas seleccionadas">
                                {attachments.map((file, index) => (
                                    <li
                                        key={`${file.name}-${file.lastModified}-${index}`}
                                        className="flex items-center justify-between gap-sm rounded-md bg-surface p-sm text-xs"
                                    >
                                        <span className="min-w-0 truncate">{file.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            icon={X}
                                            iconOnly
                                            accessibilityLabel={`Quitar ${file.name}`}
                                            disabled={saving}
                                            onClick={() => setAttachments(current => current.filter((_, fileIndex) => fileIndex !== index))}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}

                        {error && (
                            <p role="alert" className="text-sm text-error">{error}</p>
                        )}

                        <div className="flex flex-wrap justify-end gap-sm">
                            <Button variant="ghost" onClick={handleClose} disabled={saving}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                icon={Send}
                                loading={saving}
                                loadingText="Enviando solicitud…"
                            >
                                Crear ticket
                            </Button>
                        </div>
                    </form>

                    <div className="flex items-center gap-md border-t pt-md">
                        <div className="flex-1">
                            <p className="text-sm font-medium">¿Necesitas atención directa?</p>
                            <p className="text-xs text-secondary">También puedes contactarnos por WhatsApp.</p>
                        </div>
                        <a
                            href={`https://wa.me/${supportPhone}?text=${encodeURIComponent("Hola, necesito soporte con TTUTIS.")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="button button--outline button--sm button--rounded-md"
                        >
                            <MessageCircle size={16} />
                            WhatsApp
                        </a>
                    </div>
                </div>
            )}
        </Modal>
    );
}
