import { createClient } from "@/lib/supabase/client";

const profileFields = "id, display_name, avatar_path, status, created_at, updated_at";

export function toAccount(user) {
    if (!user) return null;
    return {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        emailConfirmedAt: user.email_confirmed_at ?? null,
        createdAt: user.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        displayName: user.user_metadata?.display_name ?? null,
    };
}

export async function fetchProfileData(user) {
    const supabase = createClient();
    const [profileResult, membershipsResult, devicesResult, guardianLinksResult] = await Promise.all([
        supabase.from("profiles").select(profileFields).eq("id", user.id).maybeSingle(),
        supabase.from("memberships").select("*").eq("profile_id", user.id).order("created_at", { ascending: true }),
        supabase
            .from("user_devices")
            .select("id,profile_id,device_key,device_name,platform,status,last_seen_at,created_at")
            .eq("profile_id", user.id)
            .order("last_seen_at", { ascending: false, nullsFirst: false }),
        supabase.from("guardian_student_links").select("*").eq("guardian_profile_id", user.id).order("created_at", { ascending: false }),
    ]);

    const memberships = membershipsResult.data ?? [];
    const institutionIds = [...new Set(memberships.map(membership => membership.institution_id).filter(Boolean))];
    const institutionsResult = institutionIds.length
        ? await supabase.from("institutions").select("*").in("id", institutionIds)
        : { data: [], error: null };

    const results = [profileResult, membershipsResult, devicesResult, guardianLinksResult, institutionsResult];
    const errors = results.map(result => result.error).filter(Boolean);
    const institutions = institutionsResult.data ?? [];
    const institutionsById = new Map(institutions.map(institution => [institution.id, institution]));

    return {
        data: {
            account: toAccount(user),
            profile: profileResult.data ?? null,
            memberships: memberships.map(membership => ({
                ...membership,
                institution: institutionsById.get(membership.institution_id) ?? null,
            })),
            institutions,
            userDevices: devicesResult.data ?? [],
            guardianStudentLinks: guardianLinksResult.data ?? [],
        },
        error: errors.length ? new Error(errors.map(error => error.message).join(" · ")) : null,
    };
}

export async function updateProfileRecord(userId, updates) {
    return createClient()
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select(profileFields)
        .single();
}

export async function updateInstitutionRecord(institutionId, updates) {
    return createClient()
        .from("institutions")
        .update(updates)
        .eq("id", institutionId)
        .select("*")
        .single();
}
