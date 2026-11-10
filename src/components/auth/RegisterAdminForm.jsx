'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, Mail, School, UserRound } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";

const slugify = value => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function RegisterAdminForm() {
    const router = useRouter();
    const { user, loading: checkingSession, signUp } = useAuth();
    const [fullName, setFullName] = useState(user?.user_metadata?.display_name ?? "");
    const [email, setEmail] = useState(user?.email ?? "");
    const [password, setPassword] = useState("");
    const [legalName, setLegalName] = useState("");
    const [tradeName, setTradeName] = useState("");
    const [slug, setSlug] = useState("");
    const [slugEdited, setSlugEdited] = useState(false);
    const [taxId, setTaxId] = useState("");
    const [institutionEmail, setInstitutionEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [website, setWebsite] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const resolvedFullName = fullName || user?.user_metadata?.display_name || "";
    const resolvedEmail = user?.email ?? email;

    const handleLegalNameChange = value => {
        setLegalName(value);
        if (!slugEdited) setSlug(slugify(value));
    };

    const handleSubmit = async event => {
        event.preventDefault();
        setError("");
        setNotice("");
        setSubmitting(true);

        try {
            let activeUser = user;
            if (!activeUser) {
                const result = await signUp(email.trim(), password, fullName.trim());
                if (result.error) throw new Error(result.error.message);
                activeUser = result.data?.user ?? null;
                if (!result.data?.session || !activeUser) {
                    setNotice("La cuenta se creó. Confirma tu correo y luego inicia sesión para completar la configuración del colegio.");
                    return;
                }
            }

            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: fullName.trim() || activeUser.user_metadata?.display_name || activeUser.email,
                    legalName: legalName.trim(),
                    tradeName,
                    slug: slug.trim(),
                    taxId,
                    institutionEmail,
                    phone,
                    website,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "No se pudo completar la configuración del colegio.");
            router.replace("/dashboard");
            router.refresh();
        } catch (submitError) {
            setError(submitError.message || "No se pudo completar el registro. Inténtalo de nuevo.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="auth-shell auth-shell--register">
            <Card variant="default" size="lg" className="auth-card auth-card--register">
                <div className="auth-card__brand">
                    <div className="auth-card__mark" aria-hidden="true">T</div>
                    <p className="auth-card__eyebrow">TTUTIS · CONFIGURACIÓN INICIAL</p>
                </div>

                <div className="auth-card__intro">
                    <h1 className="auth-card__title">Registra tu colegio</h1>
                    <p className="auth-card__description">Crea tu cuenta administradora y configura la institución para comenzar.</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <section className="auth-register-section" aria-labelledby="admin-section-title">
                        <h2 id="admin-section-title" className="auth-register-section__title"><UserRound size={17} /> Cuenta administradora</h2>
                        <Input id="admin-name" name="fullName" label="Nombre completo" autoComplete="name" leftIcon={UserRound} value={resolvedFullName} onChange={event => setFullName(event.target.value)} required fullWidth />
                        <Input id="admin-email" name="email" label="Correo electrónico" type="email" autoComplete="email" inputMode="email" leftIcon={Mail} value={resolvedEmail} onChange={event => setEmail(event.target.value)} disabled={Boolean(user)} required fullWidth />
                        {!user && <Input id="admin-password" name="password" label="Contraseña" type="password" autoComplete="new-password" leftIcon={KeyRound} value={password} onChange={event => setPassword(event.target.value)} minLength={8} helperText="Usa al menos 8 caracteres." required showPasswordToggle fullWidth />}
                    </section>

                    <section className="auth-register-section" aria-labelledby="school-section-title">
                        <h2 id="school-section-title" className="auth-register-section__title"><School size={17} /> Datos del colegio</h2>
                        <Input id="legal-name" name="legalName" label="Razón social" value={legalName} onChange={event => handleLegalNameChange(event.target.value)} autoComplete="organization" required fullWidth />
                        <Input id="trade-name" name="tradeName" label="Nombre comercial" value={tradeName} onChange={event => setTradeName(event.target.value)} fullWidth />
                        <Input id="institution-slug" name="slug" label="Identificador web" value={slug} onChange={event => { setSlug(slugify(event.target.value)); setSlugEdited(true); }} pattern="[a-z0-9]+(-[a-z0-9]+)*" helperText="Único, en minúsculas y separado por guiones." leftIcon={Building2} required fullWidth />
                        <div className="auth-register-grid">
                            <Input id="tax-id" name="taxId" label="RUC" value={taxId} onChange={event => setTaxId(event.target.value)} inputMode="numeric" fullWidth />
                            <Input id="school-phone" name="phone" label="Teléfono" type="tel" value={phone} onChange={event => setPhone(event.target.value)} fullWidth />
                        </div>
                        <Input id="school-email" name="institutionEmail" label="Correo del colegio" type="email" value={institutionEmail} onChange={event => setInstitutionEmail(event.target.value)} fullWidth />
                        <Input id="school-website" name="website" label="Sitio web" type="url" value={website} onChange={event => setWebsite(event.target.value)} placeholder="https://" fullWidth />
                    </section>

                    {error && <p className="auth-form__error" role="alert">{error}</p>}
                    {notice && <p className="auth-form__notice" role="status">{notice}</p>}
                    <Button type="submit" fullWidth loading={submitting} loadingText="Configurando colegio…" disabled={checkingSession || !resolvedFullName.trim() || !resolvedEmail.trim() || (!user && password.length < 8)}>
                        Crear cuenta ADMIN y colegio
                    </Button>
                </form>

                <p className="auth-card__footer">
                    ¿Ya tienes cuenta? <Link href="/auth">Inicia sesión</Link>
                </p>
            </Card>
        </main>
    );
}
