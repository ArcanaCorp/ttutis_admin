import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getSupportContext() {
    const sessionClient = await createSessionClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();

    if (authError || !user) {
        return { error: { message: "Inicia sesión para acceder a soporte.", status: 401 } };
    }

    let admin;
    try {
        admin = createAdminClient(user.id);
    } catch (error) {
        return { error: { message: error.message, status: 503 } };
    }

    return { user, admin };
}

export async function getOwnedSupportTicket(admin, userId, ticketId) {
    return admin
        .from("support_tickets")
        .select("id,requester_profile_id")
        .eq("id", ticketId)
        .eq("requester_profile_id", userId)
        .maybeSingle();
}
