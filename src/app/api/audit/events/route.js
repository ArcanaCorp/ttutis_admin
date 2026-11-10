import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";

const allowedEvents = new Set([
    "LOGIN_SUCCESS",
    "LOGOUT",
    "ACCOUNT_SIGNUP",
    "PASSWORD_CHANGED",
]);

export async function POST(request) {
    try {
        const sessionClient = await createSessionClient();
        const { data: { user }, error: authError } = await sessionClient.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Inicia sesión para registrar este evento." }, { status: 401 });
        }

        const payload = await request.json();
        const eventType = String(payload?.eventType || "").trim();

        if (!allowedEvents.has(eventType)) {
            return NextResponse.json({ error: "El evento de auditoría no es válido." }, { status: 400 });
        }

        const admin = createAdminClient(user.id);
        const { error } = await admin
            .from("app_audit_events")
            .insert({
                actor_profile_id: user.id,
                event_type: eventType,
                metadata: { source: "authenticated_web_app" },
            });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message || "No se pudo registrar el evento." }, { status: 500 });
    }
}
