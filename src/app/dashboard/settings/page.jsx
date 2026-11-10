'use client';

import { useEffect, useState } from "react";
import {
    Bell,
    Check,
    ChevronRight,
    Clock3,
    ExternalLink,
    FileLock2,
    Globe2,
    Headset,
    KeyRound,
    MonitorCog,
    RefreshCw,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import AccountActionModal from "@/components/settings/AccountActionModal";
import SupportModal from "@/components/support/SupportModal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import Switch from "@/components/ui/Switch";
import { legalDocuments } from "@/constants/legalDocuments";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { createClient } from "@/lib/supabase/client";
import {
    defaultProfilePreferences,
    getProfilePreferences,
    saveProfilePreferences,
} from "@/services/settings.services";
import { getSupportTickets } from "@/services/support.services";
import { recordAuditEvent } from "@/services/audit.services";
import { updateDeviceStatus } from "@/services/devices.services";

const settingTabs = [
    ["account", "Cuenta y seguridad", UserRound],
    ["preferences", "Preferencias", MonitorCog],
    ["notifications", "Notificaciones", Bell],
    ["support", "Soporte", Headset],
    ["legal", "Legal y privacidad", FileLock2],
];

const timezoneOptions = [
    ["America/Lima", "Lima (UTC−05:00)"],
    ["America/Bogota", "Bogotá (UTC−05:00)"],
    ["America/Santiago", "Santiago"],
    ["America/Mexico_City", "Ciudad de México"],
    ["America/New_York", "Nueva York"],
    ["UTC", "UTC"],
];

const notificationOptions = [
    {
        key: "email_notifications",
        title: "Avisos por correo",
        description: "Mensajes relacionados con tu cuenta y actividad institucional.",
    },
    {
        key: "in_app_notifications",
        title: "Avisos dentro de TTUTIS",
        description: "Alertas y novedades visibles al iniciar sesión.",
    },
    {
        key: "attendance_notifications",
        title: "Asistencia",
        description: "Avisos asociados a entradas, salidas y asistencia.",
    },
    {
        key: "academic_notifications",
        title: "Actividad académica",
        description: "Avisos sobre calificaciones y seguimiento escolar.",
    },
    {
        key: "payment_notifications",
        title: "Pagos",
        description: "Avisos sobre obligaciones y pagos registrados.",
    },
    {
        key: "communication_notifications",
        title: "Comunicaciones institucionales",
        description: "Anuncios, citaciones y comunicados de tu institución.",
    },
];

const supportCategoryLabels = {
    ACCESS: "Acceso a mi cuenta",
    ACADEMIC: "Gestión académica",
    PAYMENTS: "Pagos",
    COMMUNICATIONS: "Comunicaciones",
    OTHER: "Otro tema",
};

const supportStatusLabels = {
    OPEN: "Abierto",
    IN_PROGRESS: "En atención",
    RESOLVED: "Resuelto",
    CLOSED: "Cerrado",
};

function formatDate(value) {
    if (!value) return "No disponible";

    return new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Lima",
    }).format(new Date(value));
}

function LegalDocumentModal({ document, onClose }) {
    if (!document) return null;

    return (
        <Modal
            open
            title={document.title}
            description="Versión de trabajo · 10 de noviembre de 2026"
            onClose={onClose}
            size="xl"
        >
            <div className="mb-lg rounded-lg border border-amber-200 bg-amber-50 p-md text-sm text-amber-900">
                Este documento es un borrador informativo. Antes de publicarlo como política definitiva, ARCANA CORP y la institución deben completar los datos de contacto y revisar su alcance con asesoría legal.
            </div>

            <div className="flex max-h-[60vh] flex-col gap-lg overflow-y-auto pr-sm">
                {document.sections.map(section => (
                    <section key={section.title} className="flex flex-col gap-sm">
                        <h3 className="font-semibold">{section.title}</h3>
                        {section.paragraphs?.map(paragraph => (
                            <p key={paragraph} className="text-sm leading-6 text-secondary">
                                {paragraph}
                            </p>
                        ))}
                        {section.bullets && (
                            <ul className="ml-lg list-disc space-y-xs text-sm leading-6 text-secondary">
                                {section.bullets.map(item => <li key={item}>{item}</li>)}
                            </ul>
                        )}
                    </section>
                ))}

                {document.references?.length > 0 && (
                    <section className="flex flex-col gap-sm border-t pt-md">
                        <h3 className="font-semibold">Marco normativo de referencia</h3>
                        {document.references.map(reference => (
                            <a
                                key={reference.href}
                                href={reference.href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-xs text-sm text-blue-700 underline"
                            >
                                {reference.label}
                                <ChevronRight size={14} />
                            </a>
                        ))}
                    </section>
                )}
            </div>

            <div className="mt-lg flex justify-end">
                <Button onClick={onClose}>Cerrar</Button>
            </div>
        </Modal>
    );
}

export default function Page() {
    const { user } = useAuth();
    const {
        profile,
        account,
        userDevices = [],
        currentInstitution,
        updateProfile,
        refreshProfile,
    } = useProfile();
    const [activeTab, setActiveTab] = useState("account");
    const [preferences, setPreferences] = useState(defaultProfilePreferences);
    const [preferencesLoading, setPreferencesLoading] = useState(true);
    const [preferencesSaving, setPreferencesSaving] = useState(false);
    const [preferencesError, setPreferencesError] = useState("");
    const [notice, setNotice] = useState("");
    const [accountAction, setAccountAction] = useState("");
    const [legalDocument, setLegalDocument] = useState(null);
    const [supportOpen, setSupportOpen] = useState(false);
    const [supportTickets, setSupportTickets] = useState([]);
    const [supportTicketPage, setSupportTicketPage] = useState(1);
    const [supportTicketTotal, setSupportTicketTotal] = useState(0);
    const [supportLoading, setSupportLoading] = useState(true);
    const [supportError, setSupportError] = useState("");
    const [supportRefreshKey, setSupportRefreshKey] = useState(0);
    const [deviceUpdatingId, setDeviceUpdatingId] = useState("");
    const [deviceError, setDeviceError] = useState("");
    const displayName = profile?.display_name || account?.displayName || "Usuario TTUTIS";

    useEffect(() => {
        if (activeTab !== "support" || !user?.id) return undefined;
        let active = true;
        let debounceTimer;
        const initialLoadTimer = setTimeout(() => {
            if (!active) return;
            setSupportLoading(true);
            setSupportError("");
            getSupportTickets(supportTicketPage)
                .then(result => {
                    if (active) {
                        setSupportTickets(result.tickets);
                        setSupportTicketTotal(result.total);
                    }
                })
                .catch(loadError => {
                    if (active) setSupportError(loadError.message || "No se pudieron cargar tus tickets.");
                })
                .finally(() => {
                    if (active) setSupportLoading(false);
                });
        }, 0);

        const refreshTickets = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                getSupportTickets(supportTicketPage)
                    .then(result => {
                        if (active) {
                            setSupportTickets(result.tickets);
                            setSupportTicketTotal(result.total);
                        }
                    })
                    .catch(loadError => {
                        if (active) setSupportError(loadError.message || "No se pudieron cargar tus tickets.");
                    });
            }, 180);
        };

        const supabase = createClient();
        const channel = supabase
            .channel(`support-tickets-${user.id}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "support_tickets",
                filter: `requester_profile_id=eq.${user.id}`,
            }, refreshTickets)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "support_tickets",
                filter: `requester_profile_id=eq.${user.id}`,
            }, refreshTickets)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "support_ticket_attachments",
            }, refreshTickets)
            .subscribe(status => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    console.warn("Realtime no pudo suscribirse a los tickets de soporte.");
                }
            });

        return () => {
            active = false;
            clearTimeout(initialLoadTimer);
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [activeTab, user?.id, supportRefreshKey, supportTicketPage]);

    useEffect(() => {
        if (!user?.id) return undefined;
        let active = true;
        let debounceTimer;
        const supabase = createClient();

        const loadPreferences = () => getProfilePreferences(user.id)
            .then(saved => {
                if (active) setPreferences(saved);
            })
            .catch(loadError => {
                if (active) {
                    const missingSettingsTable = /profile_preferences|schema cache|PGRST205/i.test(loadError.message);
                    setPreferencesError(missingSettingsTable
                        ? "Las preferencias aún no están disponibles. Aplica la migración 20261110120000_profile_settings_preferences.sql en Supabase y actualiza el esquema de la API."
                        : loadError.message);
                }
            })
            .finally(() => {
                if (active) setPreferencesLoading(false);
            });

        const schedulePreferenceRefresh = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadPreferences, 150);
        };

        loadPreferences();
        const channel = supabase
            .channel(`profile-preferences-${user.id}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "profile_preferences",
                filter: `profile_id=eq.${user.id}`,
            }, schedulePreferenceRefresh)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "profile_preferences",
                filter: `profile_id=eq.${user.id}`,
            }, schedulePreferenceRefresh)
            .subscribe();

        return () => {
            active = false;
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const savePreferences = async () => {
        if (!user?.id) return;
        setPreferencesSaving(true);
        setPreferencesError("");
        setNotice("");

        try {
            const saved = await saveProfilePreferences(user.id, preferences);
            setPreferences({ ...defaultProfilePreferences, ...saved });
            setNotice("Tus preferencias se guardaron correctamente.");
        } catch (saveError) {
            setPreferencesError(saveError.message || "No se pudieron guardar las preferencias.");
        } finally {
            setPreferencesSaving(false);
        }
    };

    const saveProfile = async updates => {
        const result = await updateProfile(updates);
        if (result.error) throw result.error;
        setNotice("Los datos de tu cuenta se actualizaron.");
    };

    const changePassword = async ({ currentPassword, newPassword }) => {
        if (!account?.email) {
            throw new Error("No encontramos un correo asociado a esta cuenta.");
        }

        const supabase = createClient();
        const { error: verificationError } = await supabase.auth.signInWithPassword({
            email: account.email,
            password: currentPassword,
        });

        if (verificationError) {
            throw new Error("La contraseña actual no es correcta.");
        }

        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (updateError) throw updateError;
        await recordAuditEvent("PASSWORD_CHANGED");
        setNotice("La contraseña se cambió correctamente.");
    };

    const toggleDeviceStatus = async device => {
        const nextStatus = device.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        setDeviceUpdatingId(device.id);
        setDeviceError("");

        try {
            await updateDeviceStatus(device.id, nextStatus);
            await refreshProfile();
        } catch (error) {
            setDeviceError(error.message || "No se pudo actualizar el dispositivo.");
        } finally {
            setDeviceUpdatingId("");
        }
    };

    const updatePreference = (key, value) => {
        setPreferences(current => ({ ...current, [key]: value }));
        setNotice("");
    };

    return (
        <div className="page-shell">
            <PageHeader
                title="Configuración"
                description="Administra tu cuenta, preferencias, notificaciones y documentos de TTUTIS."
            />

            <div className="flex flex-wrap gap-sm">
                {settingTabs.map(([value, label, Icon]) => (
                    <Button
                        key={value}
                        size="sm"
                        variant={activeTab === value ? "primary" : "outline"}
                        icon={Icon}
                        onClick={() => {
                            setNotice("");
                            setActiveTab(value);
                        }}
                    >
                        {label}
                    </Button>
                ))}
            </div>

            {notice && (
                <p role="status" className="rounded-lg bg-green-50 p-md text-sm text-green-800">
                    {notice}
                </p>
            )}

            {preferencesError && (
                <p role="alert" className="rounded-lg bg-red-50 p-md text-sm text-red-700">
                    {preferencesError}
                </p>
            )}

            {activeTab === "account" && (
                <div className="grid grid-cols-2 gap-md">
                    <Card
                        variant="default"
                        title="Datos de la cuenta"
                        subtitle="Información asociada a tu perfil TTUTIS"
                        icon={UserRound}
                        iconVariant="primary"
                    >
                        <dl className="grid grid-cols-2 gap-md">
                            <div>
                                <dt className="text-xs text-secondary">Nombre</dt>
                                <dd className="mt-xs break-words text-sm font-medium">{displayName}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-secondary">Correo de acceso</dt>
                                <dd className="mt-xs break-words text-sm font-medium">{account?.email || "No disponible"}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-secondary">Teléfono</dt>
                                <dd className="mt-xs text-sm font-medium">{account?.phone || "No registrado"}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-secondary">Cuenta verificada</dt>
                                <dd className="mt-xs text-sm font-medium">
                                    {account?.emailConfirmedAt ? "Correo confirmado" : "Pendiente de confirmar"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-secondary">Cuenta creada</dt>
                                <dd className="mt-xs text-sm font-medium">{formatDate(account?.createdAt)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-secondary">Último acceso</dt>
                                <dd className="mt-xs text-sm font-medium">{formatDate(account?.lastSignInAt)}</dd>
                            </div>
                        </dl>
                        <div className="mt-lg flex flex-wrap gap-sm">
                            <Button icon={UserRound} variant="outline" onClick={() => setAccountAction("profile")}>
                                Editar nombre
                            </Button>
                            <Button icon={KeyRound} onClick={() => setAccountAction("password")}>
                                Cambiar contraseña
                            </Button>
                        </div>
                        <p className="mt-md text-xs text-secondary">
                            Para cambiar el correo de acceso o el teléfono, utiliza el canal de soporte de TTUTIS.
                        </p>
                    </Card>

                    <Card
                        variant="default"
                        title="Seguridad de la sesión"
                        subtitle="Buenas prácticas para proteger tu acceso"
                        icon={ShieldCheck}
                        iconVariant="success"
                    >
                        <ul className="flex flex-col gap-sm text-sm text-secondary">
                            <li>Usa una contraseña única y evita compartirla con otras personas.</li>
                            <li>Cierra sesión si utilizas un equipo compartido.</li>
                            <li>Solicita al administrador retirar accesos que ya no correspondan.</li>
                        </ul>
                        <Button
                            className="mt-lg"
                            variant="outline"
                            icon={KeyRound}
                            onClick={() => setAccountAction("password")}
                        >
                            Actualizar contraseña
                        </Button>
                    </Card>

                    <Card
                        variant="default"
                        title="Dispositivos registrados"
                        subtitle="Navegadores y dispositivos vinculados a tu cuenta"
                        icon={MonitorCog}
                        iconVariant="neutral"
                    >
                        <p className="mb-md text-xs text-secondary">
                            Puedes desactivar un registro para detener su uso en las funciones de dispositivo. Esto no cierra sesiones abiertas.
                        </p>
                        {deviceError && (
                            <p role="alert" className="mb-md text-sm text-error">{deviceError}</p>
                        )}
                        {userDevices.length ? (
                            <div className="flex flex-col divide-y">
                                {userDevices.map(device => (
                                    <div
                                        key={device.id}
                                        className="flex items-center justify-between gap-md py-md"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">
                                                {device.device_name || (device.platform === "WEB" ? "Navegador web" : device.platform)}
                                            </p>
                                            <p className="text-xs text-secondary">
                                                {device.status === "ACTIVE" ? "Activo" : "Desactivado"}
                                                {device.last_seen_at ? ` · Último acceso ${formatDate(device.last_seen_at)}` : ""}
                                            </p>
                                        </div>
                                        <Button
                                            variant={device.status === "ACTIVE" ? "outline" : "primary"}
                                            size="sm"
                                            loading={deviceUpdatingId === device.id}
                                            loadingText="Actualizando…"
                                            disabled={Boolean(deviceUpdatingId)}
                                            onClick={() => toggleDeviceStatus(device)}
                                        >
                                            {device.status === "ACTIVE" ? "Desactivar" : "Activar"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-secondary">
                                Este navegador se registrará al iniciar sesión. Aún no hay dispositivos vinculados.
                            </p>
                        )}
                    </Card>
                </div>
            )}

            {activeTab === "preferences" && (
                <Card
                    variant="default"
                    title="Preferencias personales"
                    subtitle="Configuración guardada para tu perfil"
                    icon={Globe2}
                    iconVariant="info"
                >
                    <div className="max-w-2xl">
                        <label className="flex flex-col gap-xs text-sm font-medium">
                            Zona horaria personal
                            <select
                                value={preferences.timezone}
                                onChange={event => updatePreference("timezone", event.target.value)}
                                className="w-full rounded-lg border bg-white px-md py-sm"
                                disabled={preferencesLoading || Boolean(preferencesError)}
                            >
                                {timezoneOptions.map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                            <span className="text-xs font-normal text-secondary">
                                Esta preferencia se aplica a las fechas y horas que se muestran en tu cuenta.
                            </span>
                        </label>
                        <div className="mt-lg flex items-center gap-sm rounded-lg bg-surface p-md text-sm text-secondary">
                            <Clock3 size={18} />
                            <span>Idioma de TTUTIS Admin: Español. La interfaz disponible actualmente se muestra en español.</span>
                        </div>
                    </div>

                    <div className="mt-lg flex justify-end">
                        <Button
                            onClick={savePreferences}
                            loading={preferencesSaving}
                            loadingText="Guardando…"
                            disabled={preferencesLoading || Boolean(preferencesError)}
                        >
                            Guardar preferencias
                        </Button>
                    </div>
                </Card>
            )}

            {activeTab === "notifications" && (
                <Card
                    variant="default"
                    title="Preferencias de notificaciones"
                    subtitle="Elige qué clases de avisos quieres recibir en tu perfil"
                    icon={Bell}
                    iconVariant="warning"
                >
                    <div className="mb-md flex items-center justify-between gap-lg rounded-lg border p-md">
                        <div>
                            <p className="font-medium">Notificaciones activas</p>
                            <p className="text-sm text-secondary">
                                {preferences.notifications_enabled
                                    ? "Puedes recibir los tipos de avisos que estén habilitados abajo."
                                    : "Todos los avisos de esta cuenta están desactivados."}
                            </p>
                        </div>
                        <Switch
                            label="Activar o desactivar todas las notificaciones"
                            checked={Boolean(preferences.notifications_enabled)}
                            disabled={preferencesLoading || Boolean(preferencesError)}
                            onChange={value => updatePreference("notifications_enabled", value)}
                        />
                    </div>
                    <div className="flex flex-col divide-y">
                        {notificationOptions.map(option => (
                            <div key={option.key} className="flex items-center justify-between gap-lg py-md">
                                <div>
                                    <p className="font-medium">{option.title}</p>
                                    <p className="text-sm text-secondary">{option.description}</p>
                                </div>
                                <Switch
                                    label={option.title}
                                    checked={Boolean(preferences[option.key])}
                                    disabled={preferencesLoading || Boolean(preferencesError) || !preferences.notifications_enabled}
                                    onChange={value => updatePreference(option.key, value)}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-md rounded-lg bg-surface p-md text-xs text-secondary">
                        Las preferencias se guardan por cuenta. La disponibilidad y entrega de cada canal dependen de que TTUTIS y la institución tengan habilitada la integración correspondiente.
                    </div>
                    <div className="mt-lg flex justify-end">
                        <Button
                            onClick={savePreferences}
                            loading={preferencesSaving}
                            loadingText="Guardando…"
                            disabled={preferencesLoading || Boolean(preferencesError)}
                        >
                            Guardar notificaciones
                        </Button>
                    </div>
                </Card>
            )}

            {activeTab === "legal" && (
                <>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-md text-sm text-amber-900">
                        Los documentos legales están disponibles como borradores de trabajo. Antes de publicarlos como versión vinculante, ARCANA CORP y cada institución deben completar sus datos de contacto y validar el texto.
                    </div>
                    <section className="grid grid-cols-2 gap-md">
                        {legalDocuments.map(document => (
                            <Card
                                key={document.id}
                                variant="default"
                                title={document.title}
                                subtitle={document.summary}
                                icon={document.id === "cookies" ? MonitorCog : FileLock2}
                                iconVariant="neutral"
                            >
                                <div className="flex items-center justify-between gap-md">
                                    <span className="inline-flex items-center gap-xs text-xs text-secondary">
                                        <Check size={14} />
                                        Borrador informativo
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setLegalDocument(document)}
                                    >
                                        Leer documento
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </section>
                    <Card variant="default" title="Responsable de TTUTIS">
                        <p className="text-sm text-secondary">
                            ARCANA CORP S.A.C. · RUC 20612123901. El correo de privacidad y domicilio de atención deben añadirse antes de publicar los documentos definitivos.
                        </p>
                    </Card>
                </>
            )}

            {activeTab === "support" && (
                <div className="flex flex-col gap-md">
                    <Card
                        variant="default"
                        title="Centro de soporte"
                        subtitle="Solicitudes de atención creadas desde tu cuenta"
                        icon={Headset}
                        iconVariant="info"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-md">
                            <p className="text-sm text-secondary">
                                Revisa el estado de tus solicitudes o crea un ticket nuevo con capturas de pantalla.
                            </p>
                            <div className="flex gap-sm">
                                <Button
                                    variant="outline"
                                    icon={RefreshCw}
                                    loading={supportLoading}
                                    loadingText="Actualizando…"
                                    onClick={() => setSupportRefreshKey(value => value + 1)}
                                >
                                    Actualizar
                                </Button>
                                <Button icon={Headset} onClick={() => setSupportOpen(true)}>
                                    Nuevo ticket
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {supportError && (
                        <div role="alert" className="rounded-lg bg-error p-md text-sm text-error">
                            {supportError}
                        </div>
                    )}

                    {supportLoading ? (
                        <p className="p-md text-sm text-secondary">Cargando tus tickets…</p>
                    ) : supportTickets.length ? (
                        <section className="flex flex-col gap-md" aria-label="Mis tickets de soporte">
                            {supportTickets.map(ticket => (
                                <Card
                                    key={ticket.id}
                                    variant="default"
                                    title={ticket.subject}
                                    subtitle={`${supportCategoryLabels[ticket.category] || ticket.category} · ${formatDate(ticket.created_at)}`}
                                    icon={Headset}
                                    iconVariant="neutral"
                                >
                                    <div className="flex flex-col gap-md">
                                        <div className="flex flex-wrap items-center justify-between gap-sm">
                                            <span className="rounded-full bg-surface px-sm py-xs text-xs font-medium">
                                                {supportStatusLabels[ticket.status] || ticket.status}
                                            </span>
                                            <span className="text-xs text-secondary">
                                                Ticket {ticket.id.slice(0, 8).toUpperCase()}
                                            </span>
                                        </div>
                                        <p style={{ whiteSpace: "pre-wrap" }} className="text-sm text-secondary">
                                            {ticket.description}
                                        </p>
                                        {ticket.attachments?.length > 0 && (
                                            <div className="flex flex-wrap gap-sm border-t pt-sm">
                                                {ticket.attachments.map(attachment => (
                                                    attachment.signed_url ? (
                                                        <a
                                                            key={attachment.id}
                                                            href={attachment.signed_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-xs rounded-md border px-sm py-xs text-xs text-link"
                                                        >
                                                            {attachment.file_name}
                                                            <ExternalLink size={13} />
                                                        </a>
                                                    ) : (
                                                        <span key={attachment.id} className="text-xs text-secondary">
                                                            {attachment.file_name}
                                                        </span>
                                                    )
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                            <Pagination
                                page={supportTicketPage}
                                pageCount={Math.max(1, Math.ceil(supportTicketTotal / 25))}
                                from={supportTicketTotal ? (supportTicketPage - 1) * 25 + 1 : 0}
                                to={Math.min(supportTicketPage * 25, supportTicketTotal)}
                                total={supportTicketTotal}
                                onPageChange={setSupportTicketPage}
                            />
                        </section>
                    ) : (
                        <Card variant="default" title="Aún no tienes tickets">
                            <p className="text-sm text-secondary">
                                Cuando envíes una solicitud aparecerá aquí junto con su estado y capturas adjuntas.
                            </p>
                        </Card>
                    )}
                </div>
            )}

            {accountAction && (
                <AccountActionModal
                    key={accountAction}
                    mode={accountAction}
                    account={account}
                    profile={profile}
                    onClose={() => setAccountAction("")}
                    onSaveProfile={saveProfile}
                    onChangePassword={changePassword}
                />
            )}

            <SupportModal
                open={supportOpen}
                institutionId={currentInstitution?.id}
                onClose={() => setSupportOpen(false)}
                onCreated={() => {
                    setSupportTicketPage(1);
                    setSupportRefreshKey(value => value + 1);
                }}
            />

            <LegalDocumentModal
                document={legalDocument}
                onClose={() => setLegalDocument(null)}
            />
        </div>
    );
}
