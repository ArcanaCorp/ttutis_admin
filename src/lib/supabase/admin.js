import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient(actorProfileId = null) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Falta configurar el acceso administrativo a Supabase en el servidor.");
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        global: {
            headers: actorProfileId
                ? { "x-ttutis-actor-id": actorProfileId }
                : {},
        },
    });
}
