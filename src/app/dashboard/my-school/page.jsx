'use client';

import { useEffect, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import Avatar from "@/components/ui/Avatar";
import { useProfile } from "@/context/ProfileContext";
import {
    getInstitutionLogoUrl,
    INSTITUTION_LOGO_ACCEPT,
    INSTITUTION_LOGO_MAX_SIZE,
    removeInstitutionLogo,
    uploadInstitutionLogo,
} from "@/services/institutionLogo.services";
import {
    Building2,
    Check,
    Globe,
    ImagePlus,
    Mail,
    Phone,
    School,
    ShieldCheck,
    Trash2,
} from "lucide-react";

const nullableFields = new Set(["trade_name", "tax_id", "email", "phone", "website", "description"]);

function createForm(institution) {
    return {
        legal_name: institution?.legal_name || "",
        trade_name: institution?.trade_name || "",
        slug: institution?.slug || "",
        tax_id: institution?.tax_id || "",
        email: institution?.email || "",
        phone: institution?.phone || "",
        website: institution?.website || "",
        description: institution?.description || "",
        timezone: institution?.timezone || "America/Lima",
        currency: institution?.currency?.trim() || "PEN",
    };
}

function displayValue(value) {
    return value === null || value === undefined || value === "" ? "No registrado" : value;
}

function validateForm(form, logoFile) {
    if (["legal_name", "slug", "timezone", "currency"].some(key => !form[key].trim())) {
        return "Completa la razón social, el identificador, la zona horaria y la moneda.";
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim().toLowerCase())) {
        return "El identificador debe usar minúsculas, números y guiones entre palabras.";
    }
    if (!/^[A-Z]{3}$/.test(form.currency.trim().toUpperCase())) {
        return "La moneda debe escribirse con su código de tres letras, por ejemplo PEN.";
    }
    if (form.website.trim()) {
        try {
            const website = new URL(form.website.trim());
            if (!["http:", "https:"].includes(website.protocol)) return "El sitio web debe comenzar con http:// o https://.";
        } catch {
            return "Ingresa una dirección web válida.";
        }
    }
    if (logoFile && logoFile.size > INSTITUTION_LOGO_MAX_SIZE) {
        return "El logo debe pesar menos de 2 MB.";
    }
    return "";
}

export default function Page() {
    const {
        currentInstitution: institution,
        currentMembership,
        loading: profileLoading,
        error: profileError,
        updateInstitution,
    } = useProfile();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(() => createForm(null));
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [formError, setFormError] = useState("");
    const [notice, setNotice] = useState("");
    const logoPreviewRef = useRef(null);

    const institutionName = institution?.trade_name || institution?.legal_name || "Nombre de la institución";
    const canEdit = Boolean(
        currentMembership?.role === "ADMIN" && currentMembership?.status === "ACTIVE"
    );
    const institutionLogoUrl = getInstitutionLogoUrl(institution?.id, institution?.logo_path);
    const logoSource = logoPreviewUrl || (removeLogo ? null : institutionLogoUrl);

    const clearLogoPreview = () => {
        if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
        logoPreviewRef.current = null;
        setLogoPreviewUrl(null);
    };

    useEffect(() => () => {
        if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
    }, []);

    const openEditor = () => {
        setForm(createForm(institution));
        clearLogoPreview();
        setLogoFile(null);
        setRemoveLogo(false);
        setFileInputKey(key => key + 1);
        setFormError("");
        setNotice("");
        setEditing(true);
    };

    const closeEditor = () => {
        if (saving) return;
        setEditing(false);
        clearLogoPreview();
        setLogoFile(null);
        setRemoveLogo(false);
        setFormError("");
    };

    const handleFieldChange = event => {
        const { name, value } = event.target;
        setForm(current => ({ ...current, [name]: value }));
    };

    const handleLogoChange = event => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!INSTITUTION_LOGO_ACCEPT.split(",").includes(file.type)) {
            clearLogoPreview();
            setLogoFile(null);
            setFormError("El logo debe ser una imagen PNG, JPG o WebP.");
            setFileInputKey(key => key + 1);
            return;
        }
        if (file.size > INSTITUTION_LOGO_MAX_SIZE) {
            clearLogoPreview();
            setLogoFile(null);
            setFormError("El logo debe pesar menos de 2 MB.");
            setFileInputKey(key => key + 1);
            return;
        }

        clearLogoPreview();
        const previewUrl = URL.createObjectURL(file);
        logoPreviewRef.current = previewUrl;
        setLogoPreviewUrl(previewUrl);
        setFormError("");
        setLogoFile(file);
        setRemoveLogo(false);
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (!institution || !canEdit) return;

        const validationMessage = validateForm(form, logoFile);
        if (validationMessage) {
            setFormError(validationMessage);
            return;
        }

        const normalizedValues = Object.fromEntries(Object.entries(form).map(([key, value]) => {
            let normalized = value.trim();
            if (key === "slug") normalized = normalized.toLowerCase();
            if (key === "currency") normalized = normalized.toUpperCase();
            if (nullableFields.has(key)) normalized = normalized || null;
            return [key, normalized];
        }));
        const updates = Object.fromEntries(Object.entries(normalizedValues).filter(([key, value]) =>
            value !== (institution[key] ?? null)
        ));
        const hasLogoChange = Boolean(logoFile || removeLogo);

        if (!Object.keys(updates).length && !hasLogoChange) {
            setNotice("La información ya está actualizada.");
            setEditing(false);
            return;
        }

        setSaving(true);
        setFormError("");
        let uploadedLogoPath = null;
        let institutionSaved = false;
        const previousLogoPath = institution.logo_path;

        try {
            if (logoFile) {
                uploadedLogoPath = await uploadInstitutionLogo(institution.id, logoFile);
                updates.logo_path = uploadedLogoPath;
            } else if (removeLogo) {
                updates.logo_path = null;
            }

            const { error } = await updateInstitution(updates);
            if (error) {
                if (uploadedLogoPath) {
                    try {
                        await removeInstitutionLogo(institution.id, uploadedLogoPath);
                    } catch {
                        // Keep the institution record unchanged if temporary-file cleanup fails.
                    }
                }
                setFormError(error.message || "No se pudo actualizar la institución.");
                return;
            }

            institutionSaved = true;
            let cleanupFailed = false;
            if (hasLogoChange && previousLogoPath) {
                try {
                    const cleanup = await removeInstitutionLogo(institution.id, previousLogoPath);
                    cleanupFailed = Boolean(cleanup.error);
                } catch {
                    cleanupFailed = true;
                }
            }

            setNotice(cleanupFailed
                ? "La información se guardó, pero no se pudo eliminar el logo anterior."
                : "Información actualizada correctamente.");
            setEditing(false);
            clearLogoPreview();
            setLogoFile(null);
            setRemoveLogo(false);
        } catch (error) {
            if (uploadedLogoPath && !institutionSaved) {
                try {
                    await removeInstitutionLogo(institution.id, uploadedLogoPath);
                } catch {
                    // The save error is more useful than a cleanup error here.
                }
            }
            setFormError(error.message || "No se pudo guardar la información institucional.");
        } finally {
            setSaving(false);
        }
    };

    const institutionStatus = {
        ACTIVE: "Activa",
        SUSPENDED: "Suspendida",
        CLOSED: "Cerrada",
    }[institution?.status] || institution?.status || "Sin estado";

    const detailFields = [
        { label: "Razón social", value: institution?.legal_name },
        { label: "RUC", value: institution?.tax_id },
        { label: "Identificador", value: institution?.slug },
        { label: "Descripción", value: institution?.description },
        { label: "Zona horaria", value: institution?.timezone },
        { label: "Moneda", value: institution?.currency },
    ];

    return (
        <div className="page-shell">
            <PageHeader
                title="Mi colegio"
                description="Consulta y administra la información de tu institución."
                actions={(
                    <Button
                        variant="outline"
                        icon={ImagePlus}
                        onClick={openEditor}
                        disabled={profileLoading || !institution || !canEdit}
                    >
                        Actualizar información
                    </Button>
                )}
            />

            {profileError && <p className="auth-form__error" role="alert">No se pudo cargar el perfil institucional: {profileError.message}</p>}
            {notice && <p className="border radius-md bg-success p-md text-sm text-success" role="status">{notice}</p>}
            {!profileLoading && institution && !canEdit && (
                <p className="border radius-md bg-surface-secondary p-md text-sm text-secondary">
                    Solo una membresía ADMIN activa puede actualizar estos datos.
                </p>
            )}

            <Card variant="default" size="lg">
                <div className="flex flex-col items-start gap-lg sm:flex-row sm:items-center">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-surface-secondary">
                        {logoSource
                            ? <Avatar name={institutionName} src={logoSource} alt={`Logo de ${institutionName}`} size={96} />
                            : <School size={40} className="text-tertiary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="mb-xs text-xs text-secondary">INSTITUCIÓN EDUCATIVA</p>
                        <h2 className="text-xl font-semibold">{profileLoading ? "Cargando colegio…" : institutionName}</h2>
                        <p className="mt-xs text-sm text-secondary">{displayValue(institution?.trade_name)}</p>
                    </div>
                    <div className="flex items-center gap-xs text-sm text-success">
                        <ShieldCheck size={18} />
                        {institutionStatus}
                    </div>
                </div>
            </Card>

            <section className="grid grid-cols-2 gap-md">
                <Card variant="default" title="Información de contacto" subtitle="Medios de contacto institucionales" icon={Phone} iconVariant="info">
                    <div className="flex flex-col gap-lg">
                        <div className="flex items-start gap-md">
                            <Phone size={18} className="mt-1 shrink-0 text-secondary" />
                            <div><p className="text-xs text-secondary">Teléfono</p><p className="text-sm font-medium">{displayValue(institution?.phone)}</p></div>
                        </div>
                        <div className="flex items-start gap-md">
                            <Mail size={18} className="mt-1 shrink-0 text-secondary" />
                            <div><p className="text-xs text-secondary">Correo electrónico</p><p className="break-words text-sm font-medium">{displayValue(institution?.email)}</p></div>
                        </div>
                        <div className="flex items-start gap-md">
                            <Globe size={18} className="mt-1 shrink-0 text-secondary" />
                            <div>
                                <p className="text-xs text-secondary">Sitio web</p>
                                {institution?.website
                                    ? <a className="break-words text-sm font-medium text-link" href={institution.website} target="_blank" rel="noreferrer">{institution.website}</a>
                                    : <p className="text-sm font-medium">No registrado</p>}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card variant="default" title="Datos de la institución" subtitle="Información registrada" icon={Building2} iconVariant="primary">
                    <dl className="grid grid-cols-2 gap-lg">
                        {detailFields.map(field => (
                            <div key={field.label} className="min-w-0">
                                <dt className="mb-xs text-xs text-secondary">{field.label}</dt>
                                <dd className="break-words text-sm font-medium">{displayValue(field.value)}</dd>
                            </div>
                        ))}
                    </dl>
                </Card>
            </section>

            <div className="flex items-start gap-md rounded-lg border p-md">
                <ShieldCheck size={19} className="mt-0.5 shrink-0 text-secondary" />
                <div>
                    <p className="text-sm font-medium">Información institucional</p>
                    <p className="text-sm text-secondary">Los cambios se guardan en la institución activa y se reflejan de inmediato en el panel.</p>
                </div>
            </div>

            <Modal
                open={editing}
                onClose={closeEditor}
                title="Actualizar información"
                description="Edita los datos institucionales y guarda los cambios."
                size="lg"
                closeOnBackdrop={!saving}
            >
                <form id="institution-edit-form" className="flex flex-col gap-md" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-md">
                        <Input name="trade_name" label="Nombre comercial" value={form.trade_name} onChange={handleFieldChange} fullWidth />
                        <Input name="legal_name" label="Razón social" value={form.legal_name} onChange={handleFieldChange} required fullWidth />
                        <Input name="tax_id" label="RUC" value={form.tax_id} onChange={handleFieldChange} fullWidth />
                        <Input name="slug" label="Identificador" value={form.slug} onChange={handleFieldChange} helperText="Usa minúsculas, números y guiones." required fullWidth />
                        <Input name="email" label="Correo electrónico" type="email" value={form.email} onChange={handleFieldChange} fullWidth />
                        <Input name="phone" label="Teléfono" type="tel" value={form.phone} onChange={handleFieldChange} fullWidth />
                        <Input name="website" label="Sitio web" type="url" value={form.website} onChange={handleFieldChange} placeholder="https://colegio.edu.pe" fullWidth />
                        <Input name="timezone" label="Zona horaria" value={form.timezone} onChange={handleFieldChange} required fullWidth />
                        <Input name="currency" label="Moneda" value={form.currency} onChange={handleFieldChange} maxLength={3} helperText="Código de tres letras, como PEN." required fullWidth />
                        <Input name="description" label="Descripción" value={form.description} onChange={handleFieldChange} maxLength={500} fullWidth />
                    </div>

                    <div className="grid grid-cols-1 gap-md rounded-lg border p-md sm:grid-cols-[auto_1fr] sm:items-center">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-surface-secondary">
                            {logoSource
                                ? <Avatar name={institutionName} src={logoSource} alt={`Vista previa del logo de ${institutionName}`} size={80} />
                                : <School size={32} className="text-tertiary" />}
                        </div>
                        <div className="flex min-w-0 flex-col gap-sm">
                            <Input
                                key={fileInputKey}
                                name="institution-logo"
                                label="Logo de la institución"
                                type="file"
                                accept={INSTITUTION_LOGO_ACCEPT}
                                onChange={handleLogoChange}
                                helperText="PNG, JPG o WebP. Máximo 2 MB."
                                fullWidth
                            />
                            <div className="flex flex-wrap gap-sm">
                                {logoFile && (
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        clearLogoPreview();
                                        setLogoFile(null);
                                        setFileInputKey(key => key + 1);
                                    }}>Cancelar nuevo logo</Button>
                                )}
                                {institution?.logo_path && !removeLogo && (
                                    <Button variant="ghost" size="sm" icon={Trash2} onClick={() => {
                                        clearLogoPreview();
                                        setLogoFile(null);
                                        setFileInputKey(key => key + 1);
                                        setRemoveLogo(true);
                                    }}>Quitar logo actual</Button>
                                )}
                                {removeLogo && (
                                    <Button variant="ghost" size="sm" onClick={() => setRemoveLogo(false)}>Conservar logo actual</Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {formError && <p className="rounded-md bg-error p-md text-sm text-error" role="alert">{formError}</p>}
                </form>
                <div className="mt-5 flex flex-wrap justify-end gap-sm">
                    <Button variant="outline" onClick={closeEditor} disabled={saving}>Cancelar</Button>
                    <Button type="submit" form="institution-edit-form" icon={Check} loading={saving} loadingText="Guardando…" disabled={!canEdit}>
                        Guardar cambios
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
