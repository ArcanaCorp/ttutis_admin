import { createClient } from "@/lib/supabase/client";

export const defaultProfilePreferences = {
    timezone: "America/Lima",
    notifications_enabled: true,
    email_notifications: true,
    in_app_notifications: true,
    attendance_notifications: true,
    academic_notifications: true,
    payment_notifications: true,
    communication_notifications: true,
};

export async function getProfilePreferences(profileId) {
    const { data, error } = await createClient()
        .from("profile_preferences")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();

    if (error) throw new Error(error.message);

    return data
        ? { ...defaultProfilePreferences, ...data }
        : { ...defaultProfilePreferences };
}

export async function saveProfilePreferences(profileId, preferences) {
    const { data, error } = await createClient()
        .from("profile_preferences")
        .upsert({
            profile_id: profileId,
            ...preferences,
            updated_at: new Date().toISOString(),
        }, { onConflict: "profile_id" })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data;
}
