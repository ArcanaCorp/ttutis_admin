import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";

const fail = (message, status = 400) =>
    NextResponse.json({ error: message }, { status });

const CONCEPT_TYPES = ["MATRICULA", "PENSION", "OTHER"];
const SCOPE_TYPES = ["INSTITUTION", "LEVEL", "GRADE", "CLASSROOM", "STUDENTS"];
const FREQUENCIES = ["MONTHLY", "WEEKLY", "ONCE"];
const PAYMENT_METHODS = ["CASH", "TRANSFER", "DEPOSIT", "OTHER"];
const PAGE_SIZE = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const clean = value => typeof value === "string" ? value.trim() : "";
const money = value => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0
        ? Math.round(amount * 100) / 100
        : null;
};

function dateOnly(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return date.toISOString().slice(0, 10) === value ? value : null;
}

async function getContext(request, institutionId) {
    const sessionClient = await createSessionClient();
    const {
        data: { user },
        error: authError,
    } = await sessionClient.auth.getUser();

    if (authError || !user) {
        return { response: fail("Inicia sesión para acceder a Pagos.", 401) };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return { response: fail("El módulo de pagos no está configurado en el servidor.", 503) };
    }

    const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    const { data: membership, error: membershipError } = await admin
        .from("memberships")
        .select("id,role,status,institution_id,profile_id")
        .eq("institution_id", institutionId)
        .eq("profile_id", user.id)
        .eq("role", "ADMIN")
        .eq("status", "ACTIVE")
        .maybeSingle();

    if (membershipError) {
        return { response: fail(membershipError.message, 400) };
    }

    if (!membership) {
        return { response: fail("Necesitas una membresía ADMIN activa en esta institución.", 403) };
    }

    const { data: institution, error: institutionError } = await admin
        .from("institutions")
        .select("id,currency,status,payments_enabled")
        .eq("id", institutionId)
        .maybeSingle();

    if (institutionError) {
        return { response: fail(institutionError.message, 400) };
    }

    if (!institution) {
        return { response: fail("No se encontró la institución.", 404) };
    }

    if (institution.status !== "ACTIVE") {
        return { response: fail("La institución no está activa.", 403) };
    }

    return { admin, user, membership, institution };
}

async function readAll(admin, table, columns, institutionId, orderBy) {
    const rows = [];
    let start = 0;

    while (true) {
        let query = admin
            .from(table)
            .select(columns)
            .eq("institution_id", institutionId);

        if (orderBy) {
            query = query.order(orderBy, { ascending: false });
        }

        const { data, error } = await query.range(start, start + PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
        start += PAGE_SIZE;
    }

    return rows;
}

function firstDueDate(rule) {
    const start = new Date(`${rule.starts_on}T00:00:00Z`);

    if (rule.frequency === "ONCE") {
        return start;
    }

    if (rule.frequency === "WEEKLY") {
        start.setUTCDate(start.getUTCDate() + 7);
        return start;
    }

    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() + 1);
    return monthlyDueDate(start.getUTCFullYear(), start.getUTCMonth(), rule.due_day);
}

function monthlyDueDate(year, month, requestedDay) {
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(Number(requestedDay), lastDay)));
}

function getRuleDates(rule, throughDate) {
    const limitDate = dateOnly(throughDate);
    if (!limitDate) throw new Error("La fecha final para generar obligaciones no es válida.");

    const endDate = rule.ends_on && rule.ends_on < limitDate
        ? rule.ends_on
        : limitDate;
    const dates = [];
    let dueDate = firstDueDate(rule);

    while (dueDate && dueDate.toISOString().slice(0, 10) <= endDate) {
        dates.push(dueDate.toISOString().slice(0, 10));
        if (dates.length > 1200) {
            throw new Error("La regla genera más de 1,200 periodos. Reduce su vigencia antes de continuar.");
        }
        if (rule.frequency === "ONCE") break;
        if (rule.frequency === "WEEKLY") {
            dueDate.setUTCDate(dueDate.getUTCDate() + 7);
        } else {
            dueDate = monthlyDueDate(
                dueDate.getUTCFullYear(),
                dueDate.getUTCMonth() + 1,
                rule.due_day,
            );
        }
    }

    return dates;
}

async function getRuleStudents(admin, institutionId, rule, enrollments, classrooms, students) {
    const activeStudentIds = new Set(students
        .filter(student => student.status === "ACTIVE")
        .map(student => student.id));

    if (rule.scope_type === "STUDENTS") {
        const { data, error } = await admin
            .from("billing_rule_students")
            .select("student_id")
            .eq("institution_id", institutionId)
            .eq("billing_rule_id", rule.id);
        if (error) throw error;
        const activeEnrolledIds = new Set(enrollments
            .filter(enrollment => enrollment.academic_year_id === rule.academic_year_id
                && enrollment.status === "ACTIVE")
            .map(enrollment => enrollment.student_id));

        return [...new Set((data || [])
            .map(row => row.student_id)
            .filter(studentId => activeStudentIds.has(studentId) && activeEnrolledIds.has(studentId)))];
    }

    const matchingClassroomIds = new Set(classrooms
        .filter(classroom => {
            if (classroom.academic_year_id !== rule.academic_year_id) return false;
            if (classroom.status !== "ACTIVE") return false;
            if (rule.scope_type === "CLASSROOM") return classroom.id === rule.classroom_id;
            if (rule.scope_type === "LEVEL") return classroom.level === rule.target_level;
            if (rule.scope_type === "GRADE") {
                return classroom.level === rule.target_level
                    && classroom.grade_label === rule.target_grade;
            }
            return true;
        })
        .map(classroom => classroom.id));

    return [...new Set(enrollments
        .filter(enrollment => enrollment.academic_year_id === rule.academic_year_id
            && enrollment.status === "ACTIVE"
            && activeStudentIds.has(enrollment.student_id)
            && matchingClassroomIds.has(enrollment.classroom_id))
        .map(enrollment => enrollment.student_id))];
}

async function createConcept(admin, institutionId, values) {
    const name = clean(values.name);
    const conceptType = clean(values.conceptType);
    const amount = money(values.amount);

    if (!name || name.length > 120 || !CONCEPT_TYPES.includes(conceptType) || !amount) {
        return fail("Completa un nombre, tipo e importe válido para el concepto.");
    }

    const { data, error } = await admin
        .from("fee_concepts")
        .insert({
            institution_id: institutionId,
            name,
            description: clean(values.description) || null,
            concept_type: conceptType,
            amount,
        })
        .select("*")
        .single();

    if (error) return fail(error.message, error.code === "23505" ? 409 : 400);
    return NextResponse.json({ data }, { status: 201 });
}

async function updateConcept(admin, institutionId, values) {
    const id = clean(values.id);
    const name = clean(values.name);
    const conceptType = clean(values.conceptType);
    const amount = money(values.amount);

    if (!id || !name || name.length > 120 || !CONCEPT_TYPES.includes(conceptType) || !amount) {
        return fail("Los datos del concepto no son válidos.");
    }

    const { data, error } = await admin
        .from("fee_concepts")
        .update({
            name,
            description: clean(values.description) || null,
            concept_type: conceptType,
            amount,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("institution_id", institutionId)
        .select("*")
        .maybeSingle();

    if (error) return fail(error.message, error.code === "23505" ? 409 : 400);
    if (!data) return fail("No se encontró el concepto.", 404);
    return NextResponse.json({ data });
}

async function createOrUpdateRule(admin, institutionId, values) {
    const id = clean(values.id);
    const name = clean(values.name);
    const scopeType = clean(values.scopeType);
    const frequency = clean(values.frequency);
    const academicYearId = clean(values.academicYearId);
    const feeConceptId = clean(values.feeConceptId);
    const startsOn = dateOnly(values.startsOn);
    const endsOn = clean(values.endsOn) ? dateOnly(values.endsOn) : null;
    const amount = money(values.amount);
    const dueDay = values.dueDay === "" || values.dueDay == null
        ? null
        : Number(values.dueDay);
    const targetLevel = clean(values.targetLevel) || null;
    const targetGrade = clean(values.targetGrade) || null;
    const classroomId = clean(values.classroomId) || null;
    const studentIds = [...new Set((Array.isArray(values.studentIds) ? values.studentIds : [])
        .map(clean)
        .filter(Boolean))];

    if (!name || name.length > 160 || !SCOPE_TYPES.includes(scopeType)
        || !FREQUENCIES.includes(frequency) || !academicYearId || !feeConceptId
        || !startsOn || !amount) {
        return fail("Completa los datos obligatorios de la regla de cobro.");
    }

    if (endsOn && endsOn < startsOn) {
        return fail("La fecha final debe ser igual o posterior a la fecha inicial.");
    }

    if (frequency === "MONTHLY" && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
        return fail("Indica un día de vencimiento entre 1 y 31.");
    }

    if (scopeType === "LEVEL" && !targetLevel) return fail("Selecciona el nivel de aplicación.");
    if (scopeType === "GRADE" && (!targetLevel || !targetGrade)) {
        return fail("Selecciona el nivel y grado de aplicación.");
    }
    if (scopeType === "CLASSROOM" && !classroomId) return fail("Selecciona la sección de aplicación.");
    if (scopeType === "STUDENTS" && !studentIds.length) return fail("Selecciona al menos un alumno.");
    if (studentIds.length > 1000) return fail("Selecciona hasta 1,000 alumnos por regla.", 413);

    const [{ data: academicYear, error: yearError }, { data: concept, error: conceptError }] = await Promise.all([
        admin.from("academic_years")
            .select("id")
            .eq("id", academicYearId)
            .eq("institution_id", institutionId)
            .maybeSingle(),
        admin.from("fee_concepts")
            .select("id")
            .eq("id", feeConceptId)
            .eq("institution_id", institutionId)
            .eq("status", "ACTIVE")
            .maybeSingle(),
    ]);

    if (yearError) return fail(yearError.message);
    if (conceptError) return fail(conceptError.message);
    if (!academicYear) return fail("El año escolar no pertenece a esta institución.", 404);
    if (!concept) return fail("El concepto no está activo o no pertenece a esta institución.", 404);

    if (scopeType === "LEVEL" || scopeType === "GRADE") {
        let classroomQuery = admin
            .from("classrooms")
            .select("id")
            .eq("institution_id", institutionId)
            .eq("academic_year_id", academicYearId)
            .eq("level", targetLevel)
            .eq("status", "ACTIVE");
        if (scopeType === "GRADE") classroomQuery = classroomQuery.eq("grade_label", targetGrade);
        const { data: matchingClassrooms, error } = await classroomQuery.limit(1);
        if (error) return fail(error.message);
        if (!matchingClassrooms?.length) {
            return fail("No hay secciones activas que coincidan con la aplicación seleccionada.");
        }
    }

    if (classroomId) {
        const { data: classroom, error } = await admin
            .from("classrooms")
            .select("id")
            .eq("id", classroomId)
            .eq("institution_id", institutionId)
            .eq("academic_year_id", academicYearId)
            .eq("status", "ACTIVE")
            .maybeSingle();
        if (error) return fail(error.message);
        if (!classroom) return fail("La sección no pertenece al año escolar seleccionado.", 404);
    }

    if (studentIds.length) {
        const { data: students, error } = await admin
            .from("students")
            .select("id")
            .eq("institution_id", institutionId)
            .in("id", studentIds);
        if (error) return fail(error.message);
        if ((students || []).length !== studentIds.length) {
            return fail("Uno o más alumnos no pertenecen a esta institución.", 404);
        }

        const { data: enrollments, error: enrollmentError } = await admin
            .from("enrollments")
            .select("student_id")
            .eq("institution_id", institutionId)
            .eq("academic_year_id", academicYearId)
            .eq("status", "ACTIVE")
            .in("student_id", studentIds);
        if (enrollmentError) return fail(enrollmentError.message);
        const enrolledIds = new Set((enrollments || []).map(enrollment => enrollment.student_id));
        if (studentIds.some(studentId => !enrolledIds.has(studentId))) {
            return fail("Todos los alumnos seleccionados deben tener una matrícula activa en el año escolar.");
        }
    }

    const ruleValues = {
        institution_id: institutionId,
        academic_year_id: academicYearId,
        fee_concept_id: feeConceptId,
        name,
        scope_type: scopeType,
        target_level: scopeType === "LEVEL" || scopeType === "GRADE" ? targetLevel : null,
        target_grade: scopeType === "GRADE" ? targetGrade : null,
        classroom_id: scopeType === "CLASSROOM" ? classroomId : null,
        frequency,
        amount,
        starts_on: startsOn,
        ends_on: endsOn,
        due_day: frequency === "MONTHLY" ? dueDay : null,
        updated_at: new Date().toISOString(),
    };

    let rule;
    let ruleError;

    if (id) {
        const result = await admin
            .from("billing_rules")
            .update(ruleValues)
            .eq("id", id)
            .eq("institution_id", institutionId)
            .select("*")
            .maybeSingle();
        rule = result.data;
        ruleError = result.error;
        if (!ruleError && !rule) return fail("No se encontró la regla.", 404);
    } else {
        const result = await admin
            .from("billing_rules")
            .insert(ruleValues)
            .select("*")
            .single();
        rule = result.data;
        ruleError = result.error;
    }

    if (ruleError) return fail(ruleError.message);

    if (scopeType === "STUDENTS") {
        const { error: deleteError } = await admin
            .from("billing_rule_students")
            .delete()
            .eq("institution_id", institutionId)
            .eq("billing_rule_id", rule.id);
        if (deleteError) return fail(deleteError.message);

        const { error: insertError } = await admin
            .from("billing_rule_students")
            .insert(studentIds.map(studentId => ({
                institution_id: institutionId,
                billing_rule_id: rule.id,
                student_id: studentId,
            })));
        if (insertError) return fail(insertError.message);
    } else if (id) {
        const { error } = await admin
            .from("billing_rule_students")
            .delete()
            .eq("institution_id", institutionId)
            .eq("billing_rule_id", rule.id);
        if (error) return fail(error.message);
    }

    return NextResponse.json({ data: rule }, { status: id ? 200 : 201 });
}

async function generateObligations(admin, institutionId, values) {
    const throughDate = dateOnly(values.throughDate);
    if (!throughDate) return fail("Selecciona una fecha válida hasta la que generar obligaciones.");

    const ruleId = clean(values.ruleId);
    const academicYearId = clean(values.academicYearId);
    let ruleQuery = admin
        .from("billing_rules")
        .select("*")
        .eq("institution_id", institutionId)
        .eq("status", "ACTIVE");
    if (ruleId) ruleQuery = ruleQuery.eq("id", ruleId);
    if (academicYearId) ruleQuery = ruleQuery.eq("academic_year_id", academicYearId);

    const [
        { data: rules, error: rulesError },
        { data: enrollments, error: enrollmentError },
        { data: classrooms, error: classroomError },
        { data: students, error: studentsError },
        { data: academicYears, error: yearsError },
    ] = await Promise.all([
        ruleQuery,
        admin.from("enrollments")
            .select("student_id,classroom_id,academic_year_id,status")
            .eq("institution_id", institutionId)
            .eq("status", "ACTIVE"),
        admin.from("classrooms")
            .select("id,academic_year_id,level,grade_label,status")
            .eq("institution_id", institutionId),
        admin.from("students")
            .select("id,status")
            .eq("institution_id", institutionId),
        admin.from("academic_years")
            .select("id,ends_on")
            .eq("institution_id", institutionId),
    ]);

    if (rulesError) return fail(rulesError.message);
    if (enrollmentError) return fail(enrollmentError.message);
    if (classroomError) return fail(classroomError.message);
    if (studentsError) return fail(studentsError.message);
    if (yearsError) return fail(yearsError.message);

    const { data: concepts, error: conceptError } = await admin
        .from("fee_concepts")
        .select("id,name,status")
        .eq("institution_id", institutionId);
    if (conceptError) return fail(conceptError.message);

    const obligations = [];

    for (const rule of rules || []) {
        const concept = concepts.find(item => item.id === rule.fee_concept_id);
        if (!concept || concept.status !== "ACTIVE") continue;

        const studentIds = await getRuleStudents(
            admin,
            institutionId,
            rule,
            enrollments || [],
            classrooms || [],
            students || [],
        );

        if (!studentIds.length) continue;

        const academicYear = academicYears.find(year => year.id === rule.academic_year_id);
        if (!academicYear) continue;
        const latestDate = academicYear.ends_on < throughDate
            ? academicYear.ends_on
            : throughDate;
        const dates = getRuleDates(rule, latestDate);
        if (obligations.length + studentIds.length * dates.length > 10000) {
            return fail("La generación supera 10,000 obligaciones. Reduce el periodo y vuelve a intentarlo.", 413);
        }

        const periodRows = dates.map(dueDate => {
            const [year, month, day] = dueDate.split("-");
            const periodLabel = rule.frequency === "MONTHLY"
                ? `${year}-${month}`
                : rule.frequency === "WEEKLY"
                    ? `Semana ${day}/${month}/${year}`
                    : `Único ${day}/${month}/${year}`;

            return studentIds.map(studentId => ({
                institution_id: institutionId,
                academic_year_id: rule.academic_year_id,
                student_id: studentId,
                fee_concept_id: concept.id,
                billing_rule_id: rule.id,
                concept: concept.name,
                period_label: periodLabel,
                due_date: dueDate,
                amount: rule.amount,
                paid_amount: 0,
                status: dueDate < new Date().toISOString().slice(0, 10)
                    ? "OVERDUE"
                    : "UNPAID",
            }));
        });

        obligations.push(...periodRows.flat());
    }

    if (!obligations.length) {
        return NextResponse.json({ created: 0, message: "No hay obligaciones nuevas para generar." });
    }

    const { data, error } = await admin
        .from("student_fees")
        .upsert(obligations, {
            onConflict: "billing_rule_id,student_id,period_label",
            ignoreDuplicates: true,
        })
        .select("id");

    if (error) return fail(error.message);
    return NextResponse.json({
        created: data?.length || 0,
        message: `Se generaron ${data?.length || 0} obligaciones nuevas.`,
    });
}

export async function GET(request) {
    const params = new URL(request.url).searchParams;
    const institutionId = clean(params.get("institutionId"));
    if (!institutionId) return fail("No se identificó la institución.");

    const context = await getContext(request, institutionId);
    if (context.response) return context.response;

    const { admin, institution } = context;
    if (!institution.payments_enabled) {
        return NextResponse.json({ enabled: false, currency: institution.currency });
    }

    try {
        const [
            concepts,
            rules,
            ruleStudents,
            fees,
            payments,
            students,
            memberships,
            classrooms,
            academicYears,
            enrollments,
        ] = await Promise.all([
            readAll(admin, "fee_concepts", "*", institutionId, "created_at"),
            readAll(admin, "billing_rules", "*", institutionId, "created_at"),
            readAll(admin, "billing_rule_students", "billing_rule_id,student_id", institutionId),
            readAll(admin, "student_fees", "*", institutionId, "due_date"),
            readAll(admin, "student_fee_payments", "*", institutionId, "paid_at"),
            readAll(admin, "students", "id,institution_id,membership_id,first_names,last_names,student_code,status", institutionId),
            readAll(admin, "memberships", "id,institution_id,full_name,role,status,profile_id", institutionId),
            readAll(admin, "classrooms", "id,institution_id,academic_year_id,level,grade_label,section_name,status", institutionId),
            readAll(admin, "academic_years", "id,institution_id,name,starts_on,ends_on,status", institutionId, "starts_on"),
            readAll(admin, "enrollments", "id,institution_id,academic_year_id,student_id,classroom_id,enrolled_at,ended_at,status", institutionId),
        ]);

        const studentIdsByRule = new Map();
        for (const entry of ruleStudents) {
            const ids = studentIdsByRule.get(entry.billing_rule_id) || [];
            ids.push(entry.student_id);
            studentIdsByRule.set(entry.billing_rule_id, ids);
        }

        return NextResponse.json({
            enabled: true,
            currency: institution.currency || "PEN",
            fee_concepts: concepts,
            billing_rules: rules.map(rule => ({
                ...rule,
                student_ids: studentIdsByRule.get(rule.id) || [],
            })),
            student_fees: fees,
            student_fee_payments: payments,
            students,
            memberships,
            classrooms,
            academic_years: academicYears,
            enrollments,
        });
    } catch (error) {
        return fail(`No se pudieron cargar los datos de pagos: ${error.message}`, 400);
    }
}

export async function POST(request) {
    let payload;
    try {
        payload = await request.json();
    } catch {
        return fail("La solicitud no tiene un formato válido.");
    }

    const institutionId = clean(payload?.institutionId);
    const action = clean(payload?.action);
    if (!institutionId || !action) return fail("No se identificó la operación o institución.");

    const context = await getContext(request, institutionId);
    if (context.response) return context.response;
    if (!context.institution.payments_enabled) {
        return fail("El módulo de pagos no está habilitado para esta institución.", 403);
    }

    const { admin, user, membership } = context;
    const values = payload.values || {};

    try {
        if (action === "create_concept") {
            return await createConcept(admin, institutionId, values);
        }

        if (action === "update_concept") {
            return await updateConcept(admin, institutionId, values);
        }

        if (action === "delete_concept") {
            const conceptId = clean(values.id);
            if (!conceptId) return fail("No se identificó el concepto.");

            const [feeUse, ruleUse] = await Promise.all([
                admin.from("student_fees").select("id", { count: "exact", head: true })
                    .eq("institution_id", institutionId).eq("fee_concept_id", conceptId),
                admin.from("billing_rules").select("id", { count: "exact", head: true })
                    .eq("institution_id", institutionId).eq("fee_concept_id", conceptId),
            ]);
            if (feeUse.error) return fail(feeUse.error.message);
            if (ruleUse.error) return fail(ruleUse.error.message);
            if (feeUse.count || ruleUse.count) {
                return fail("El concepto ya tiene obligaciones o reglas. Desactívalo para conservar su historial.", 409);
            }

            const { data, error } = await admin
                .from("fee_concepts")
                .delete()
                .eq("id", conceptId)
                .eq("institution_id", institutionId)
                .select("id")
                .maybeSingle();
            if (error) return fail(error.message);
            if (!data) return fail("No se encontró el concepto.", 404);
            return NextResponse.json({ success: true });
        }

        if (action === "set_concept_status") {
            if (!["ACTIVE", "INACTIVE"].includes(values.status)) {
                return fail("El estado del concepto no es válido.");
            }
            const { data, error } = await admin.from("fee_concepts")
                .update({ status: values.status, updated_at: new Date().toISOString() })
                .eq("id", clean(values.id)).eq("institution_id", institutionId)
                .select("id,status").maybeSingle();
            if (error) return fail(error.message);
            if (!data) return fail("No se encontró el concepto.", 404);
            return NextResponse.json({ data });
        }

        if (action === "create_rule" || action === "update_rule") {
            return await createOrUpdateRule(admin, institutionId, values);
        }

        if (action === "set_rule_status") {
            if (!["ACTIVE", "INACTIVE"].includes(values.status)) {
                return fail("El estado de la regla no es válido.");
            }
            const { data, error } = await admin.from("billing_rules")
                .update({ status: values.status, updated_at: new Date().toISOString() })
                .eq("id", clean(values.id)).eq("institution_id", institutionId)
                .select("id,status").maybeSingle();
            if (error) return fail(error.message);
            if (!data) return fail("No se encontró la regla.", 404);
            return NextResponse.json({ data });
        }

        if (action === "delete_rule") {
            const ruleId = clean(values.id);
            const { count, error: countError } = await admin
                .from("student_fees")
                .select("id", { count: "exact", head: true })
                .eq("institution_id", institutionId)
                .eq("billing_rule_id", ruleId);
            if (countError) return fail(countError.message);

            if (count) {
                const { data, error } = await admin.from("billing_rules")
                    .update({ status: "INACTIVE", updated_at: new Date().toISOString() })
                    .eq("id", ruleId).eq("institution_id", institutionId)
                    .select("id,status").maybeSingle();
                if (error) return fail(error.message);
                if (!data) return fail("No se encontró la regla.", 404);
                return NextResponse.json({ success: true, deactivated: true });
            }

            const { data, error } = await admin.from("billing_rules")
                .delete().eq("id", ruleId).eq("institution_id", institutionId)
                .select("id").maybeSingle();
            if (error) return fail(error.message);
            if (!data) return fail("No se encontró la regla.", 404);
            return NextResponse.json({ success: true, deactivated: false });
        }

        if (action === "create_obligation" || action === "update_obligation") {
            const obligationId = clean(values.id);
            const studentId = clean(values.studentId);
            const conceptId = clean(values.feeConceptId);
            const academicYearId = clean(values.academicYearId);
            const dueDate = dateOnly(values.dueDate);
            const amount = money(values.amount);
            const periodLabel = clean(values.periodLabel);

            if ((action === "update_obligation" && !obligationId)
                || !studentId || !conceptId || !academicYearId || !dueDate || !amount
                || !periodLabel || periodLabel.length > 120) {
                return fail("Completa alumno, año, concepto, periodo, vencimiento e importe.");
            }

            const [studentResult, conceptResult, yearResult] = await Promise.all([
                admin.from("students").select("id").eq("id", studentId).eq("institution_id", institutionId).eq("status", "ACTIVE").maybeSingle(),
                admin.from("fee_concepts").select("id,name").eq("id", conceptId).eq("institution_id", institutionId).eq("status", "ACTIVE").maybeSingle(),
                admin.from("academic_years").select("id").eq("id", academicYearId).eq("institution_id", institutionId).maybeSingle(),
            ]);
            if (studentResult.error) return fail(studentResult.error.message);
            if (conceptResult.error) return fail(conceptResult.error.message);
            if (yearResult.error) return fail(yearResult.error.message);
            const student = studentResult.data;
            const concept = conceptResult.data;
            const year = yearResult.data;
            if (!student) return fail("El alumno no pertenece a esta institución o está inactivo.", 404);
            if (!concept) return fail("El concepto no pertenece a esta institución o está inactivo.", 404);
            if (!year) return fail("El año escolar no pertenece a esta institución.", 404);

            const { data: enrollment, error: enrollmentError } = await admin
                .from("enrollments")
                .select("id")
                .eq("institution_id", institutionId)
                .eq("academic_year_id", academicYearId)
                .eq("student_id", studentId)
                .eq("status", "ACTIVE")
                .limit(1)
                .maybeSingle();
            if (enrollmentError) return fail(enrollmentError.message);
            if (!enrollment) return fail("El alumno no tiene una matrícula activa en el año seleccionado.", 409);

            if (action === "update_obligation") {
                const { data: existing, error: existingError } = await admin
                    .from("student_fees")
                    .select("id,billing_rule_id,paid_amount")
                    .eq("id", obligationId)
                    .eq("institution_id", institutionId)
                    .maybeSingle();
                if (existingError) return fail(existingError.message);
                if (!existing) return fail("No se encontró la obligación.", 404);
                if (existing.billing_rule_id || Number(existing.paid_amount) > 0) {
                    return fail("Solo puedes editar obligaciones manuales que no tengan pagos.", 409);
                }
                const { count: paymentCount, error: paymentCountError } = await admin
                    .from("student_fee_payments")
                    .select("id", { count: "exact", head: true })
                    .eq("institution_id", institutionId)
                    .eq("student_fee_id", obligationId);
                if (paymentCountError) return fail(paymentCountError.message);
                if (paymentCount) return fail("No se puede editar una obligación con pagos registrados.", 409);
            }

            const status = dueDate < new Date().toISOString().slice(0, 10)
                ? "OVERDUE"
                : "UNPAID";
            const obligationValues = {
                institution_id: institutionId,
                academic_year_id: academicYearId,
                student_id: studentId,
                fee_concept_id: conceptId,
                concept: concept.name,
                period_label: periodLabel,
                due_date: dueDate,
                amount,
                paid_amount: 0,
                status,
            };
            const result = action === "update_obligation"
                ? await admin.from("student_fees")
                    .update(obligationValues)
                    .eq("id", obligationId)
                    .eq("institution_id", institutionId)
                    .select("*")
                    .maybeSingle()
                : await admin.from("student_fees")
                    .insert(obligationValues)
                    .select("*")
                    .single();
            const { data, error } = result;
            if (error) return fail(error.message);
            if (!data) return fail("No se encontró la obligación.", 404);
            return NextResponse.json({ data }, { status: action === "create_obligation" ? 201 : 200 });
        }

        if (action === "delete_obligation") {
            const obligationId = clean(values.id);
            const { data: fee, error: feeError } = await admin
                .from("student_fees")
                .select("id,billing_rule_id,paid_amount")
                .eq("id", obligationId)
                .eq("institution_id", institutionId)
                .maybeSingle();
            if (feeError) return fail(feeError.message);
            if (!fee) return fail("No se encontró la obligación.", 404);
            if (fee.billing_rule_id || Number(fee.paid_amount) > 0) {
                return fail("Solo puedes eliminar obligaciones manuales sin pagos registrados.", 409);
            }
            const { count: paymentCount, error: paymentCountError } = await admin
                .from("student_fee_payments")
                .select("id", { count: "exact", head: true })
                .eq("institution_id", institutionId)
                .eq("student_fee_id", obligationId);
            if (paymentCountError) return fail(paymentCountError.message);
            if (paymentCount) return fail("No se puede eliminar una obligación con pagos registrados.", 409);
            const { error } = await admin.from("student_fees")
                .delete().eq("id", obligationId).eq("institution_id", institutionId);
            if (error) return fail(error.message);
            return NextResponse.json({ success: true });
        }

        if (action === "generate_obligations") {
            return await generateObligations(admin, institutionId, values);
        }

        if (action === "record_payment") {
            const amount = money(values.amount);
            const paidAt = values.paidAt ? new Date(values.paidAt) : new Date();
            const paymentMethod = clean(values.paymentMethod);
            const idempotencyKey = clean(values.idempotencyKey);
            if (!clean(values.studentFeeId) || !amount || !PAYMENT_METHODS.includes(paymentMethod)
                || !UUID_PATTERN.test(idempotencyKey)
                || clean(values.reference).length > 120
                || clean(values.notes).length > 1000
                || Number.isNaN(paidAt.getTime())) {
                return fail("Revisa el importe, fecha, método y obligación seleccionada.");
            }
            if (paidAt.getTime() > Date.now()) {
                return fail("La fecha del pago no puede estar en el futuro.");
            }

            const { data, error } = await admin.rpc("record_student_fee_payment", {
                p_institution_id: institutionId,
                p_student_fee_id: clean(values.studentFeeId),
                p_amount: amount,
                p_paid_at: paidAt.toISOString(),
                p_payment_method: paymentMethod,
                p_reference: clean(values.reference),
                p_notes: clean(values.notes),
                p_idempotency_key: idempotencyKey,
                p_actor_profile_id: user.id,
                p_actor_membership_id: membership.id,
            });
            if (error) return fail(error.message, 400);
            return NextResponse.json({ data });
        }

        return fail("La operación solicitada no está disponible.", 404);
    } catch (error) {
        return fail(error.message || "No se pudo completar la operación de pagos.", 500);
    }
}
