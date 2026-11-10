import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";

const UPDATE_TYPES = [
    "ANNOUNCEMENT",
    "GRADE",
    "BEHAVIOR",
    "CITATION",
    "REPORT",
    "RECOMMENDATION",
    "NOTIFICATION",
];

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const AUDIENCE_TYPES = ["ALL", "GRADE", "CLASSROOM", "STUDENT"];

const fail = (message, status = 400) =>
    NextResponse.json({ error: message }, { status });

const isMissingAudienceSchema = error =>
    error?.code === "PGRST204"
    || /could not find the .* column .*student_updates/i.test(error?.message || "");

export async function POST(request) {
    try {
        const payload = await request.json();
        const institutionId = String(payload?.institutionId || "").trim();
        const title = String(payload?.title || "").trim();
        const body = String(payload?.body || "").trim();
        const updateType = String(payload?.updateType || "").trim();
        const priority = String(payload?.priority || "NORMAL").trim();
        const audienceType = String(payload?.audienceType || "ALL").trim();

        if (!institutionId || !title || !body || !updateType) {
            return fail("Completa el título, contenido y categoría de la notificación.");
        }

        if (!UPDATE_TYPES.includes(updateType)) {
            return fail("La categoría seleccionada no es válida.");
        }

        if (!PRIORITIES.includes(priority)) {
            return fail("La prioridad seleccionada no es válida.");
        }

        if (!AUDIENCE_TYPES.includes(audienceType)) {
            return fail("El destinatario seleccionado no es válido.");
        }

        const sessionClient = await createSessionClient();
        const {
            data: { user },
            error: authError,
        } = await sessionClient.auth.getUser();

        if (authError || !user) {
            return fail("Inicia sesión para crear una notificación.", 401);
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return fail("La gestión de comunicaciones no está configurada en el servidor.", 503);
        }

        const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const { data: membership, error: membershipError } = await admin
            .from("memberships")
            .select("id")
            .eq("institution_id", institutionId)
            .eq("profile_id", user.id)
            .eq("role", "ADMIN")
            .eq("status", "ACTIVE")
            .maybeSingle();

        if (membershipError) {
            return fail(membershipError.message, 400);
        }

        if (!membership) {
            return fail("Necesitas una membresía ADMIN activa en esta institución.", 403);
        }

        let audience = {
            audience_type: audienceType,
            academic_year_id: null,
            target_level: null,
            target_grade: null,
            classroom_id: null,
            student_id: null,
        };
        let gradeClassroomIds = [];

        if (audienceType === "GRADE") {
            const academicYearId = String(payload.academicYearId || "").trim();
            const targetLevel = String(payload.targetLevel || "").trim();
            const targetGrade = String(payload.targetGrade || "").trim();

            if (!academicYearId || !targetLevel || !targetGrade) {
                return fail("Selecciona el año escolar, nivel y grado.");
            }

            const { data: classrooms, error: classroomError } = await admin
                .from("classrooms")
                .select("id")
                .eq("institution_id", institutionId)
                .eq("academic_year_id", academicYearId)
                .eq("level", targetLevel)
                .eq("grade_label", targetGrade)
                .eq("status", "ACTIVE");

            if (classroomError) {
                return fail(classroomError.message, 400);
            }

            if (!classrooms?.length) {
                return fail("No hay secciones activas para ese grado y año escolar.");
            }

            gradeClassroomIds = classrooms.map(classroom => classroom.id);

            audience = {
                ...audience,
                academic_year_id: academicYearId,
                target_level: targetLevel,
                target_grade: targetGrade,
            };
        }

        if (audienceType === "CLASSROOM") {
            const classroomId = String(payload.classroomId || "").trim();

            if (!classroomId) {
                return fail("Selecciona una sección.");
            }

            const { data: classroom, error: classroomError } = await admin
                .from("classrooms")
                .select("id,academic_year_id")
                .eq("id", classroomId)
                .eq("institution_id", institutionId)
                .eq("status", "ACTIVE")
                .maybeSingle();

            if (classroomError) {
                return fail(classroomError.message, 400);
            }

            if (!classroom) {
                return fail("La sección seleccionada no pertenece a esta institución.", 404);
            }

            audience = {
                ...audience,
                classroom_id: classroom.id,
                academic_year_id: classroom.academic_year_id,
            };
        }

        if (audienceType === "STUDENT") {
            const studentId = String(payload.studentId || "").trim();

            if (!studentId) {
                return fail("Selecciona un alumno.");
            }

            const { data: student, error: studentError } = await admin
                .from("students")
                .select("id")
                .eq("id", studentId)
                .eq("institution_id", institutionId)
                .eq("status", "ACTIVE")
                .maybeSingle();

            if (studentError) {
                return fail(studentError.message, 400);
            }

            if (!student) {
                return fail("El alumno seleccionado no pertenece a esta institución.", 404);
            }

            audience = { ...audience, student_id: student.id };
        }

        const visibleFrom = payload.visibleFrom
            ? new Date(payload.visibleFrom)
            : new Date();
        const visibleUntil = payload.visibleUntil
            ? new Date(payload.visibleUntil)
            : null;

        if (Number.isNaN(visibleFrom.getTime())) {
            return fail("La fecha de inicio no es válida.");
        }

        if (visibleUntil && Number.isNaN(visibleUntil.getTime())) {
            return fail("La fecha de finalización no es válida.");
        }

        if (visibleUntil && visibleUntil <= visibleFrom) {
            return fail("La fecha de finalización debe ser posterior al inicio.");
        }

        const notification = {
            institution_id: institutionId,
            author_membership_id: membership.id,
            update_type: updateType,
            title,
            body,
            priority,
            visible_from: visibleFrom.toISOString(),
            visible_until: visibleUntil?.toISOString() || null,
        };

        let { data, error } = await admin
            .from("student_updates")
            .insert({ ...notification, ...audience })
            .select("*")
            .single();

        if (isMissingAudienceSchema(error)) {
            let legacyTargets = [{}];

            if (audienceType === "GRADE") {
                legacyTargets = gradeClassroomIds.map(classroomId => ({
                    classroom_id: classroomId,
                }));
            } else if (audienceType === "CLASSROOM") {
                legacyTargets = [{ classroom_id: audience.classroom_id }];
            } else if (audienceType === "STUDENT") {
                legacyTargets = [{ student_id: audience.student_id }];
            }

            const fallback = await admin
                .from("student_updates")
                .insert(legacyTargets.map(target => ({ ...notification, ...target })))
                .select("*");

            data = fallback.data;
            error = fallback.error;
        }

        if (error) {
            return fail(error.message, 400);
        }

        return NextResponse.json({ data: Array.isArray(data) ? data : [data] }, { status: 201 });
    } catch (error) {
        return fail(error.message || "No se pudo crear la notificación.", 500);
    }
}
