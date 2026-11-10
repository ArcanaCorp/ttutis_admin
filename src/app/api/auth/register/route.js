import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const optionalText = value => typeof value === "string" && value.trim() ? value.trim() : null;

export async function POST(request) {
    let payload;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: "La solicitud no tiene un formato válido." }, { status: 400 });
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return NextResponse.json({ error: "La solicitud no tiene un formato válido." }, { status: 400 });
    }

    const fullName = typeof payload.fullName === "string" ? payload.fullName.trim() : "";
    const legalName = typeof payload.legalName === "string" ? payload.legalName.trim() : "";
    const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";

    if (!fullName || !legalName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return NextResponse.json({ error: "Completa el nombre del administrador, la razón social y un identificador válido." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Inicia sesión para terminar la configuración del colegio." }, { status: 401 });
    }

    const { data: institutionId, error: bootstrapError } = await supabase.rpc("bootstrap_admin_institution", {
        p_full_name: fullName,
        p_legal_name: legalName,
        p_slug: slug,
        p_trade_name: optionalText(payload.tradeName),
        p_tax_id: optionalText(payload.taxId),
        p_institution_email: optionalText(payload.institutionEmail),
        p_phone: optionalText(payload.phone),
        p_website: optionalText(payload.website),
    });
    if (bootstrapError) {
        return NextResponse.json({ error: bootstrapError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, institutionId });
}
