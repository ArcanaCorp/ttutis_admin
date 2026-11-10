import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 500;

async function selectByInstitution(table, institutionId, { orderBy = "created_at", ascending = false } = {}) {
    if (!institutionId) return [];
    const supabase = createClient();
    const rows = [];
    let from = 0;

    while (true) {
        let query = supabase.from(table).select("*").eq("institution_id", institutionId);
        if (orderBy) query = query.order(orderBy, { ascending });
        const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
        if (error) throw new Error(`No se pudieron cargar ${table}: ${error.message}`);
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    return rows;
}

async function loadTables(institutionId, tables) {
    const entries = await Promise.all(tables.map(async ([key, table, options]) => [
        key,
        await selectByInstitution(table, institutionId, options),
    ]));
    return Object.fromEntries(entries);
}

export const getDashboardData = institutionId => loadTables(institutionId, [
    ["students", "students"],
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
    ["students", "students"],
    ["memberships", "memberships"],
    ["academic_years", "academic_years", { orderBy: "starts_on", ascending: false }],
]);

export const getCommunicationsData = institutionId => loadTables(institutionId, [
    ["student_updates", "student_updates", { orderBy: "visible_from" }],
]);

export const getPaymentsData = institutionId => loadTables(institutionId, [
    ["student_fees", "student_fees", { orderBy: "due_date" }],
    ["students", "students"],
    ["memberships", "memberships"],
]);

export const getSchoolYearData = institutionId => loadTables(institutionId, [
    ["academic_years", "academic_years", { orderBy: "starts_on", ascending: false }],
    ["enrollments", "enrollments", { orderBy: "enrolled_at" }],
    ["classrooms", "classrooms"],
    ["students", "students"],
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

export const getPeopleData = institutionId => loadTables(institutionId, [
    ["memberships", "memberships"],
    ["students", "students"],
    ["guardian_student_links", "guardian_student_links"],
    ["enrollments", "enrollments"],
    ["classrooms", "classrooms"],
]);

export const getSettingsData = institutionId => loadTables(institutionId, [
    ["memberships", "memberships"],
]);
