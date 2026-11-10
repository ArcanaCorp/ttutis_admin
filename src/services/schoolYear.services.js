import { createClient } from "@/lib/supabase/client";

async function insertInstitutionRecord(table, institutionId, values) {
    if (!institutionId) {
        return { data: null, error: new Error("No hay una institución activa para guardar este registro.") };
    }

    return createClient()
        .from(table)
        .insert({ ...values, institution_id: institutionId })
        .select("*")
        .single();
}

export const insertAcademicYear = (institutionId, values) =>
    insertInstitutionRecord("academic_years", institutionId, values);

export const insertClassroom = (institutionId, values) =>
    insertInstitutionRecord("classrooms", institutionId, values);

export async function insertClassrooms(institutionId, academicYearId, classrooms) {
    if (!institutionId) {
        return { data: null, error: new Error("No hay una institución activa para guardar estos registros.") };
    }
    if (!academicYearId || !classrooms.length) {
        return { data: null, error: new Error("Selecciona un año académico y al menos un aula para importar.") };
    }

    const rows = classrooms.map(classroom => ({
        ...classroom,
        academic_year_id: academicYearId,
        institution_id: institutionId,
    }));

    return createClient().from("classrooms").insert(rows).select("*");
}

export const insertEnrollment = (institutionId, values) =>
    insertInstitutionRecord("enrollments", institutionId, values);
