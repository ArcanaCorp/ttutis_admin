import { createClient } from "@/lib/supabase/client";
import { fetchAllPages } from "@/lib/pagination.mjs";

const PAGE_SIZE = 500;
const STUDENT_COLUMNS = "id,institution_id,membership_id,first_names,last_names,phone,email,student_code,status,created_at";

async function selectByInstitution(table, institutionId, { columns = "*", orderBy = "created_at", ascending = false } = {}) {
    if (!institutionId) return [];
    const supabase = createClient();
    return fetchAllPages(async ({ from, to }) => {
        let query = supabase.from(table).select(columns).eq("institution_id", institutionId);
        if (orderBy) query = query.order(orderBy, { ascending });
        return query.range(from, to);
    }, { pageSize: PAGE_SIZE }).catch(error => {
        throw new Error(`No se pudieron cargar ${table}: ${error.message}`);
    });
}

async function loadTables(institutionId, tables) {
    const entries = await Promise.all(tables.map(async ([key, table, options]) => [
        key,
        await selectByInstitution(table, institutionId, options),
    ]));
    return Object.fromEntries(entries);
}

export const getDashboardData = institutionId => loadTables(institutionId, [
    ["students", "students", { columns: STUDENT_COLUMNS }],
    ["memberships", "memberships"],
    ["classrooms", "classrooms"],
    ["enrollments", "enrollments"],
    ["academic_years", "academic_years", { orderBy: "starts_on", ascending: false }],
    ["attendance_events", "attendance_events", { orderBy: "occurred_at" }],
    ["student_updates", "student_updates"],
    ["student_fees", "student_fees"],
]);

export const getAttendanceData = institutionId => loadTables(institutionId, [
    ["attendance_events", "attendance_events", { orderBy: "occurred_at" }],
    ["students", "students", { columns: STUDENT_COLUMNS }],
    ["memberships", "memberships"],
    ["academic_years", "academic_years", { orderBy: "starts_on", ascending: false }],
]);

export const getCommunicationsData = institutionId => loadTables(institutionId, [
    ["student_updates", "student_updates", { orderBy: "visible_from" }],
    ["academic_years", "academic_years", { orderBy: "starts_on", ascending: false }],
    ["classrooms", "classrooms"],
    ["students", "students", { columns: STUDENT_COLUMNS }],
]);

export const getSchoolYearData = institutionId => loadTables(institutionId, [
    ["academic_years", "academic_years", { orderBy: "starts_on", ascending: false }],
    ["enrollments", "enrollments", { orderBy: "enrolled_at" }],
    ["classrooms", "classrooms"],
    ["students", "students", { columns: STUDENT_COLUMNS }],
]);

export const getClassesSchedulesData = institutionId => loadTables(institutionId, [
    ["academic_years", "academic_years", { orderBy: "starts_on", ascending: false }],
    ["classrooms", "classrooms"],
    ["subjects", "subjects"],
    ["memberships", "memberships"],
    ["course_assignments", "course_assignments"],
    ["schedules", "schedules"],
    ["enrollments", "enrollments"],
]);

export async function getPeopleData(institutionId) {
    const data = await loadTables(institutionId, [
        ["memberships", "memberships"],
        ["students", "students", { columns: STUDENT_COLUMNS }],
        ["guardian_student_links", "guardian_student_links"],
        ["enrollments", "enrollments"],
        ["classrooms", "classrooms"],
        ["academic_years", "academic_years", { orderBy: "starts_on", ascending: false }],
    ]);
    const guardianIds = [...new Set(data.guardian_student_links.map(link => link.guardian_profile_id).filter(Boolean))];
    if (!guardianIds.length) return { ...data, guardian_profiles: [] };
    const { data: guardianProfiles, error } = await createClient()
        .from("profiles")
        .select("id,display_name")
        .in("id", guardianIds);
    // The directory remains available even when profile visibility is restricted by RLS.
    return { ...data, guardian_profiles: error ? [] : guardianProfiles ?? [] };
}

export const getSettingsData = institutionId => loadTables(institutionId, [
    ["memberships", "memberships"],
]);
