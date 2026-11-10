'use client';

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

export default function AccountActionModal({
    mode,
    account,
    profile,
    onClose,
    onSaveProfile,
    onChangePassword,
}) {
    const [displayName, setDisplayName] = useState(
        profile?.display_name || account?.displayName || "",
    );
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const isPasswordMode = mode === "password";

    const submit = async event => {
        event.preventDefault();
        setError("");

        if (isPasswordMode) {
            if (newPassword.length < 8) {
                setError("La nueva contraseña debe tener al menos 8 caracteres.");
                return;
            }
            if (newPassword !== confirmPassword) {
                setError("Las contraseñas nuevas no coinciden.");
                return;
            }
            if (newPassword === currentPassword) {
                setError("Elige una contraseña diferente a la actual.");
                return;
            }
        }

        setSaving(true);
        try {
            if (isPasswordMode) {
                await onChangePassword({ currentPassword, newPassword });
            } else {
                await onSaveProfile({ display_name: displayName.trim() });
            }
            onClose();
        } catch (submitError) {
            setError(submitError.message || "No se pudieron guardar los cambios.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={saving ? undefined : onClose}
            title={isPasswordMode ? "Cambiar contraseña" : "Editar datos personales"}
            description={isPasswordMode
                ? "Confirma tu contraseña actual para proteger la cuenta."
                : "Actualiza el nombre que se muestra en TTUTIS."}
        >
            <form className="flex flex-col gap-md" onSubmit={submit}>
                {isPasswordMode ? (
                    <>
                        <Input
                            name="current-password"
                            label="Contraseña actual"
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={event => setCurrentPassword(event.target.value)}
                            required
                            fullWidth
                        />
                        <Input
                            name="new-password"
                            label="Nueva contraseña"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={event => setNewPassword(event.target.value)}
                            minLength={8}
                            required
                            fullWidth
                        />
                        <Input
                            name="confirm-password"
                            label="Confirma la nueva contraseña"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={event => setConfirmPassword(event.target.value)}
                            minLength={8}
                            required
                            fullWidth
                        />
                    </>
                ) : (
                    <Input
                        name="display-name"
                        label="Nombre para mostrar"
                        value={displayName}
                        onChange={event => setDisplayName(event.target.value)}
                        maxLength={120}
                        required
                        fullWidth
                    />
                )}

                {error && (
                    <p role="alert" className="text-sm text-red-700">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-sm">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={saving} loadingText="Guardando…">
                        Guardar
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
