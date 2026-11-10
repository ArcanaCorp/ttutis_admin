'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        let active = true;
        supabase.auth.getSession().then(({ data }) => { if (active) setReady(Boolean(data.session)); });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (active) setReady(Boolean(session)); });
        return () => { active = false; subscription.unsubscribe(); };
    }, []);

    const submit = async event => {
        event.preventDefault(); setError("");
        if (!ready) { setError("El enlace no es válido o ya venció. Solicita una nueva invitación."); return; }
        if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
        if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
        setBusy(true);
        const { error: updateError } = await createClient().auth.updateUser({ password });
        setBusy(false);
        if (updateError) setError(updateError.message);
        else { setSuccess(true); window.setTimeout(() => router.push("/auth"), 1800); }
    };

    return <main className="auth-shell"><section className="auth-card"><h1 className="text-2xl font-semibold">Establece tu contraseña</h1><p className="mt-sm text-sm text-gray-500">Usa una contraseña segura para activar el acceso a TTutis.</p>{success ? <p role="status" className="mt-lg rounded-lg bg-green-50 p-md text-sm text-green-800">Contraseña actualizada. Ya puedes iniciar sesión.</p> : <form onSubmit={submit} className="mt-lg flex flex-col gap-md"><Input name="new-password" type="password" label="Nueva contraseña" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required fullWidth/><Input name="confirm-password" type="password" label="Confirma la contraseña" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} required fullWidth/>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button type="submit" loading={busy} disabled={!ready}>Guardar contraseña</Button></form>}</section></main>;
}
