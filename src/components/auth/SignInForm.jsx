'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { KeyRound, Mail } from "lucide-react";

export default function SignInForm() {
    const router = useRouter();
    const { signIn, loading: checkingSession } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async event => {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        const result = await signIn(email.trim(), password);
        setSubmitting(false);

        if (result.error) {
            setError("No se pudo iniciar sesión. Verifica tu correo y contraseña e inténtalo de nuevo.");
            return;
        }

        const requestedPath = new URL(window.location.href).searchParams.get("next");
        const safePath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") && !requestedPath.startsWith("/auth")
            ? requestedPath
            : "/dashboard";

        router.replace(safePath);
        router.refresh();
    };

    return (
        <main className="auth-shell">
            <Card variant="default" size="lg" className="auth-card">
                <div className="auth-card__brand">
                    <div className="auth-card__mark" aria-hidden="true">T</div>
                    <p className="auth-card__eyebrow">TTUTIS · ADMINISTRACIÓN</p>
                </div>

                <div className="auth-card__intro">
                    <h1 className="auth-card__title">Iniciar sesión</h1>
                    <p className="auth-card__description">Ingresa con el correo y contraseña de tu cuenta institucional.</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <Input
                        id="email"
                        name="email"
                        label="Correo electrónico"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        leftIcon={Mail}
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        placeholder="nombre@institucion.edu.pe"
                        required
                        fullWidth
                    />
                    <Input
                        id="password"
                        name="password"
                        label="Contraseña"
                        type="password"
                        autoComplete="current-password"
                        leftIcon={KeyRound}
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        placeholder="Ingresa tu contraseña"
                        required
                        showPasswordToggle
                        fullWidth
                    />
                    {error && <p className="auth-form__error" role="alert">{error}</p>}
                    <Button type="submit" fullWidth loading={submitting || checkingSession} loadingText="Ingresando…" disabled={!email || !password}>
                        Ingresar
                    </Button>
                </form>
                <p className="auth-card__footer">
                    ¿Vas a configurar un colegio por primera vez? <a href="/auth/register">Registra una cuenta ADMIN</a>
                </p>
            </Card>
        </main>
    );
}
