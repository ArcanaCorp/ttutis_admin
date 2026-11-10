import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";

const deviceFields = "id,profile_id,device_key,device_name,platform,status,last_seen_at,created_at";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

async function getContext() {
    const sessionClient = await createSessionClient();
    const { data: { user }, error } = await sessionClient.auth.getUser();

    if (error || !user) return { response: fail("Inicia sesión para gestionar tus dispositivos.", 401) };

    try {
        return { user, admin: createAdminClient(user.id) };
    } catch (adminError) {
        return { response: fail(adminError.message, 503) };
    }
}

function nameFromUserAgent(userAgent = "") {
    const browser = /Edg\//.test(userAgent)
        ? "Edge"
        : /Firefox\//.test(userAgent)
            ? "Firefox"
            : /Chrome\//.test(userAgent)
                ? "Chrome"
                : /Safari\//.test(userAgent)
                    ? "Safari"
                    : "Navegador";
    const operatingSystem = /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS|Macintosh/.test(userAgent)
            ? "macOS"
            : /Linux/.test(userAgent)
                ? "Linux"
                : "Equipo";

    return `${operatingSystem} · ${browser}`;
}

export async function GET() {
    try {
        const context = await getContext();
        if (context.response) return context.response;

        const { data, error } = await context.admin
            .from("user_devices")
            .select(deviceFields)
            .eq("profile_id", context.user.id)
            .order("last_seen_at", { ascending: false, nullsFirst: false });

        if (error) return fail(error.message, 400);
        return NextResponse.json({ data: data || [] });
    } catch (error) {
        return fail(error.message || "No se pudieron cargar los dispositivos.", 500);
    }
}

export async function POST(request) {
    try {
        const context = await getContext();
        if (context.response) return context.response;

        const payload = await request.json();
        const deviceKey = String(payload?.deviceKey || "").trim();
        const reactivate = payload?.reactivate === true;

        if (!uuidPattern.test(deviceKey)) {
            return fail("No se pudo identificar este navegador.");
        }

        const { data: existingDevice, error: lookupError } = await context.admin
            .from("user_devices")
            .select(deviceFields)
            .eq("profile_id", context.user.id)
            .eq("device_key", deviceKey)
            .maybeSingle();

        if (lookupError) return fail(lookupError.message, 400);

        if (existingDevice) {
            if (existingDevice.status === "INACTIVE" && !reactivate) {
                return NextResponse.json({ data: existingDevice });
            }

            const { data, error } = await context.admin
                .from("user_devices")
                .update({
                    device_name: nameFromUserAgent(request.headers.get("user-agent") || ""),
                    status: "ACTIVE",
                    last_seen_at: new Date().toISOString(),
                })
                .eq("id", existingDevice.id)
                .eq("profile_id", context.user.id)
                .select(deviceFields)
                .single();

            if (error) return fail(error.message, 400);
            return NextResponse.json({ data });
        }

        const { data, error } = await context.admin
            .from("user_devices")
            .insert({
                profile_id: context.user.id,
                device_key: deviceKey,
                device_name: nameFromUserAgent(request.headers.get("user-agent") || ""),
                platform: "WEB",
                status: "ACTIVE",
                last_seen_at: new Date().toISOString(),
                push_token: null,
            })
            .select(deviceFields)
            .single();

        if (error) return fail(error.message, 400);
        return NextResponse.json({ data }, { status: 200 });
    } catch (error) {
        return fail(error.message || "No se pudo registrar este navegador.", 500);
    }
}

export async function PATCH(request) {
    try {
        const context = await getContext();
        if (context.response) return context.response;

        const payload = await request.json();
        const deviceId = String(payload?.deviceId || "").trim();
        const status = String(payload?.status || "").trim();

        if (!uuidPattern.test(deviceId) || !["ACTIVE", "INACTIVE"].includes(status)) {
            return fail("Selecciona un dispositivo y un estado válido.");
        }

        const updates = { status };
        if (status === "ACTIVE") updates.last_seen_at = new Date().toISOString();

        const { data, error } = await context.admin
            .from("user_devices")
            .update(updates)
            .eq("id", deviceId)
            .eq("profile_id", context.user.id)
            .select(deviceFields)
            .maybeSingle();

        if (error) return fail(error.message, 400);
        if (!data) return fail("No se encontró ese dispositivo en tu cuenta.", 404);

        return NextResponse.json({ data });
    } catch (error) {
        return fail(error.message || "No se pudo actualizar el dispositivo.", 500);
    }
}
