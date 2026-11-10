'use client';

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import { useProfile } from "@/context/ProfileContext";
import { School, MapPin, Phone, Mail, Building2, Globe, Pencil, CalendarDays, ShieldCheck, Info } from "lucide-react";

export default function Page() {
    const { currentInstitution, loading: profileLoading, error: profileError } = useProfile();
    const institution = currentInstitution || {};

    const [editing, setEditing] = useState(false);

    // ========================================
    // HELPERS
    // ========================================

    const formatLabel = (key) => {
        return key
            .replace(/_/g, " ")
            .replace(/\b\w/g, letter => letter.toUpperCase());
    };

    const formatValue = (value) => {
        if (value === null || value === undefined || value === "") {
            return "No registrado";
        }

        if (typeof value === "boolean") {
            return value ? "Sí" : "No";
        }

        if (typeof value === "object") {
            return JSON.stringify(value);
        }

        return String(value);
    };

    const schoolName = institution.trade_name || institution.legal_name || "Nombre de la institución";

    const address = null;
    const phone = institution.phone;
    const email = institution.email;
    const website = institution.website;

    const excludedFields = [
        "id",
        "logo",
        "logo_path",
        "logo_url",
        "image_url",
        "created_at",
        "updated_at",
    ];

    const informationFields = Object.entries(institution)
        .filter(([key, value]) =>
            !excludedFields.includes(key) &&
            value !== null &&
            value !== undefined &&
            value !== ""
        );

    // ========================================
    // RENDER
    // ========================================

    return (
        <div className="page-shell">
            <PageHeader
                title="Mi colegio"
                description="Consulta y administra la información de tu institución."
                actions={<Button variant="outline" icon={Pencil} onClick={() => setEditing(!editing)}>{editing ? "Cancelar edición" : "Editar información"}</Button>}
            />

            {profileError && <p className="auth-form__error" role="alert">No se pudo cargar el perfil institucional: {profileError.message}</p>}

            {/* SCHOOL IDENTITY */}

            <Card
                variant="default"
                size="lg"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-lg">

                    <div className="w-24 h-24 rounded-xl border bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                        <School size={40} className="text-gray-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-xs">
                            INSTITUCIÓN EDUCATIVA
                        </p>

                        <h2 className="text-xl font-semibold">
                            {profileLoading ? "Cargando colegio…" : schoolName}
                        </h2>

                        <p className="text-sm text-gray-500 mt-xs">
                            {address || "Dirección no registrada"}
                        </p>
                    </div>

                    <div className="flex items-center gap-xs text-sm text-green-600">
                        <ShieldCheck size={18} />
                        Institución registrada
                    </div>

                </div>
            </Card>

            {/* CONTACT INFORMATION */}

            <section className="grid grid-cols-2 gap-md">

                <Card
                    variant="default"
                    title="Información de contacto"
                    subtitle="Medios de contacto de la institución"
                    icon={Phone}
                    iconVariant="info"
                >
                    <div className="flex flex-col gap-lg">

                        <div className="flex items-start gap-md">
                            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                <Phone size={17} />
                            </div>

                            <div>
                                <p className="text-xs text-gray-500">
                                    Teléfono
                                </p>

                                <p className="text-sm font-medium">
                                    {formatValue(phone)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-md">
                            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                <Mail size={17} />
                            </div>

                            <div>
                                <p className="text-xs text-gray-500">
                                    Correo electrónico
                                </p>

                                <p className="text-sm font-medium">
                                    {formatValue(email)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-md">
                            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                <Globe size={17} />
                            </div>

                            <div>
                                <p className="text-xs text-gray-500">
                                    Sitio web
                                </p>

                                <p className="text-sm font-medium">
                                    {formatValue(website)}
                                </p>
                            </div>
                        </div>

                    </div>
                </Card>

                {/* LOCATION */}

                <Card
                    variant="default"
                    title="Ubicación"
                    subtitle="Dirección de la institución"
                    icon={MapPin}
                    iconVariant="success"
                >
                    <div className="flex items-start gap-md">
                        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                            <MapPin size={17} />
                        </div>

                        <div>
                            <p className="text-xs text-gray-500">
                                Dirección registrada
                            </p>

                            <p className="text-sm font-medium">
                                {formatValue(address)}
                            </p>
                        </div>
                    </div>
                </Card>

            </section>

            {/* INSTITUTION DATA */}

            <Card
                variant="default"
                title="Datos de la institución"
                subtitle="Información registrada en el sistema"
                icon={Building2}
                iconVariant="primary"
            >
                {informationFields.length > 0 ? (
                    <div className="grid grid-cols-3 gap-lg">

                        {informationFields.map(([key, value]) => (
                            <div key={key} className="min-w-0">
                                <p className="text-xs text-gray-500 mb-xs">
                                    {formatLabel(key)}
                                </p>

                                <p className="text-sm font-medium break-words">
                                    {formatValue(value)}
                                </p>
                            </div>
                        ))}

                    </div>
                ) : (
                    <div className="py-lg text-center text-sm text-gray-500">
                        No hay información institucional registrada.
                    </div>
                )}
            </Card>

            {/* INFORMATION NOTICE */}

            <div className="flex items-start gap-md p-md rounded-lg border">
                <Info size={19} className="shrink-0 mt-0.5" />

                <div>
                    <p className="text-sm font-medium">
                        Información institucional
                    </p>

                    <p className="text-sm text-gray-500">
                        Los datos de esta sección identifican a tu institución
                        dentro de TTUTIS. Mantenerlos actualizados permitirá
                        utilizar correctamente la información en documentos,
                        comunicaciones y otros módulos.
                    </p>
                </div>
            </div>

        </div>
    );
}
