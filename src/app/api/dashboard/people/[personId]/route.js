import { randomBytes, randomInt } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";

const clean = value => typeof value === "string" ? value.trim() : "";
const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

async function getAdminContext(request, payload) {
    const sessionClient = await createSessionClient();
    const { data: { user }, error: userError } = await sessionClient.auth.getUser();
    if (userError || !user) return { response: fail("Inicia sesión para continuar.", 401) };
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return { response: fail("La gestión de personas no está configurada en el servidor.", 503) };
    const admin = createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: membership, error } = await admin.from("memberships").select("id").eq("institution_id", payload.institutionId).eq("profile_id", user.id).eq("role", "ADMIN").eq("status", "ACTIVE").maybeSingle();
    if (error) return { response: fail(error.message, 400) };
    if (!membership) return { response: fail("Necesitas una membresía ADMIN activa en esta institución.", 403) };
    return { admin, user };
}

export async function GET(request) {
    const params = new URL(request.url).searchParams;
    const payload = { type: params.get("type"), institutionId: params.get("institutionId"), studentId: params.get("studentId"), membershipId: params.get("membershipId"), profileId: params.get("profileId") };
    if (!payload.institutionId || !["STUDENT", "TEACHER", "ASSISTANT", "GUARDIAN"].includes(payload.type)) return fail("No se identificó la persona o la institución.");
    const context = await getAdminContext(request, payload);
    if (context.response) return context.response;
    const { admin } = context;
    try {
        if (payload.type === "STUDENT") {
            const { data: student, error } = await admin.from("students").select("id,institution_id,membership_id,first_names,last_names,document_type,document_number,birth_date,phone,email,student_code,admission_date,status,created_at").eq("id", payload.studentId).eq("institution_id", payload.institutionId).maybeSingle();
            if (error) throw error;
            if (!student) return fail("No se encontró el alumno.", 404);
            let membership = null;
            if (student.membership_id) {
                const { data, error: membershipError } = await admin.from("memberships").select("id,profile_id,full_name,email,role,login_code,status").eq("id", student.membership_id).eq("institution_id", payload.institutionId).maybeSingle();
                if (membershipError) throw membershipError;
                membership = data;
            }
            let accountEmail = student.email || membership?.email || "";
            if (membership?.profile_id) {
                const { data } = await admin.auth.admin.getUserById(membership.profile_id);
                accountEmail = accountEmail || data?.user?.email || "";
            }
            const { data: enrollmentRows, error: enrollmentError } = await admin.from("enrollments").select("id,academic_year_id,classroom_id,enrolled_at,ended_at,status").eq("institution_id", payload.institutionId).eq("student_id", student.id).order("enrolled_at", { ascending: false });
            if (enrollmentError) throw enrollmentError;
            const ids = [...new Set((enrollmentRows || []).map(row => row.classroom_id))];
            const { data: classroomRows, error: classroomError } = ids.length ? await admin.from("classrooms").select("id,grade_label,section_name,level").in("id", ids) : { data: [], error: null };
            if (classroomError) throw classroomError;
            const { data: links, error: linkError } = await admin.from("guardian_student_links").select("id,guardian_profile_id,relationship,status").eq("institution_id", payload.institutionId).eq("student_id", student.id);
            if (linkError) throw linkError;
            const yearIds = [...new Set((enrollmentRows || []).map(row => row.academic_year_id))];
            const { data: years, error: yearError } = yearIds.length ? await admin.from("academic_years").select("id,name").eq("institution_id", payload.institutionId).in("id", yearIds) : { data: [], error: null };
            if (yearError) throw yearError;
            const guardianLinks = await Promise.all((links || []).map(async link => {
                const { data: profile } = await admin.from("profiles").select("display_name").eq("id", link.guardian_profile_id).maybeSingle();
                const { data: auth } = await admin.auth.admin.getUserById(link.guardian_profile_id);
                return { ...link, name: profile?.display_name || "Apoderado", email: auth?.user?.email || "" };
            }));
            return NextResponse.json({ ...student, profileId: membership?.profile_id, membershipId: membership?.id, loginCode: membership?.login_code, accountEmail, enrollments: (enrollmentRows || []).map(row => ({ ...row, yearName: (years || []).find(item => item.id === row.academic_year_id)?.name || "", classroom: (classroomRows || []).find(item => item.id === row.classroom_id) || null })), guardianLinks });
        }
        if (payload.type === "GUARDIAN") {
            const { data: links, error } = await admin.from("guardian_student_links").select("id,student_id,relationship,status,can_view_attendance,can_view_grades,can_view_behavior,can_view_fees,can_receive_notifications,verified_at,created_at").eq("institution_id", payload.institutionId).eq("guardian_profile_id", payload.profileId).order("created_at", { ascending: false });
            if (error) throw error;
            if (!links?.length) return fail("No se encontró el apoderado.", 404);
            const studentIds = [...new Set(links.map(link => link.student_id))];
            const { data: studentsForLinks, error: studentsError } = await admin.from("students").select("id,first_names,last_names,student_code,status").eq("institution_id", payload.institutionId).in("id", studentIds);
            if (studentsError) throw studentsError;
            const { data: profile, error: profileError } = await admin.from("profiles").select("display_name,status,created_at").eq("id", payload.profileId).maybeSingle();
            if (profileError) throw profileError;
            const { data: account, error: accountError } = await admin.auth.admin.getUserById(payload.profileId);
            if (accountError) throw accountError;
            return NextResponse.json({ ...profile, profileId: payload.profileId, email: account?.user?.email || "", links: links.map(link => ({ ...link, student: (studentsForLinks || []).find(item => item.id === link.student_id) || null })) });
        }
        const { data: membership, error } = await admin.from("memberships").select("id,profile_id,full_name,email,role,login_code,status,created_at").eq("id", payload.membershipId).eq("institution_id", payload.institutionId).maybeSingle();
        if (error) throw error;
        if (!membership) return fail("No se encontró la membresía de esta persona.", 404);
        const { data: account } = membership.profile_id ? await admin.auth.admin.getUserById(membership.profile_id) : { data: null };
        return NextResponse.json({ ...membership, email: membership.email || account?.user?.email || "", profileId: membership.profile_id, created_at: membership.created_at });
    } catch (error) { return fail(error.message || "No se pudo cargar el detalle de la persona.", 400); }
}

async function updateMembership(admin, payload, updates) {
    if (!payload.membershipId) return null;
    const { data, error } = await admin.from("memberships").update(updates).eq("id", payload.membershipId).eq("institution_id", payload.institutionId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("No se encontró la membresía de esta persona en la institución.");
    return data;
}

export async function POST(request) {
    let payload;
    try { payload = await request.json(); } catch { return fail("La solicitud no tiene un formato válido."); }
    if (!payload?.institutionId || !["STUDENT", "TEACHER", "ASSISTANT", "GUARDIAN"].includes(payload.type)) return fail("No se identificó la persona o la institución.");
    const context = await getAdminContext(request, payload);
    if (context.response) return context.response;
    const { admin } = context;
    let email = "";
    let userName = "";
    let accessCode = "";
    if (payload.type === "STUDENT") {
        const { data: student, error } = await admin.from("students").select("id,email,membership_id,first_names,last_names,student_code").eq("id", payload.studentId).eq("institution_id", payload.institutionId).maybeSingle();
        if (error) return fail(error.message);
        if (!student) return fail("No se encontró el alumno.", 404);
        email = student.email;
        userName = `${student.first_names} ${student.last_names}`.trim();
        payload.membershipId = student.membership_id;
        if (student.membership_id) {
            const { data: member } = await admin.from("memberships").select("id,profile_id,email,login_code,full_name").eq("id", student.membership_id).eq("institution_id", payload.institutionId).maybeSingle();
            payload.profileId = member?.profile_id;
            email = email || member?.email;
            userName = member?.full_name || userName;
            accessCode = member?.login_code || "";
        }
    } else if (payload.type === "GUARDIAN") {
        const { data: link, error } = await admin.from("guardian_student_links").select("guardian_profile_id").eq("institution_id", payload.institutionId).eq("guardian_profile_id", payload.profileId).limit(1).maybeSingle();
        if (error) return fail(error.message);
        if (!link) return fail("No se encontró el apoderado en esta institución.", 404);
        const { data: account } = await admin.auth.admin.getUserById(payload.profileId);
        email = account?.user?.email;
        const { data: profile } = await admin.from("profiles").select("display_name").eq("id", payload.profileId).maybeSingle();
        userName = profile?.display_name || "Apoderado";
        accessCode = email || "Ingreso con correo";
    } else {
        const { data: member, error } = await admin.from("memberships").select("id,email,profile_id,full_name,login_code").eq("id", payload.membershipId).eq("institution_id", payload.institutionId).maybeSingle();
        if (error) return fail(error.message);
        if (!member) return fail("No se encontró la membresía de esta persona.", 404);
        email = member.email;
        payload.profileId = member.profile_id;
        userName = member.full_name;
        accessCode = member.login_code || "";
        if (!accessCode) {
            for (let attempt = 0; attempt < 10; attempt += 1) {
                const candidate = `S${String(randomInt(0, 100000000)).padStart(8, "0")}`;
                const { data: exists, error: codeError } = await admin.from("memberships").select("id").eq("login_code", candidate).maybeSingle();
                if (codeError) return fail(codeError.message);
                if (!exists) { accessCode = candidate; break; }
            }
            if (!accessCode) return fail("No se pudo generar un código de acceso único. Intenta nuevamente.", 500);
            const { error: updateError } = await admin.from("memberships").update({ login_code: accessCode }).eq("id", member.id).eq("institution_id", payload.institutionId);
            if (updateError) return fail(updateError.message, 500);
        }
    }
    if (!email) return fail("Esta persona no tiene un correo de acceso registrado.");
    if (!payload.profileId) return fail("La cuenta todavía no está vinculada. Registra nuevamente a la persona con un correo válido.");
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(payload.profileId);
    if (accountError || !account?.user) return fail("No se encontró la cuenta de acceso.", 404);
    email = account.user.email || email;
    const temporaryPassword = randomBytes(18).toString("base64url");
    const institutionResult = await admin.from("institutions").select("legal_name,trade_name").eq("id", payload.institutionId).maybeSingle();
    if (institutionResult.error) return fail(institutionResult.error.message, 500);
    const institutionName = institutionResult.data?.trade_name || institutionResult.data?.legal_name || "Institución educativa";
    const accountTypes = { STUDENT: "Alumno", TEACHER: "Docente", ASSISTANT: "Auxiliar", GUARDIAN: "Apoderado" };
    const { error: passwordError } = await admin.auth.admin.updateUserById(payload.profileId, { password: temporaryPassword, email_confirm: true });
    if (passwordError) return fail(`No se pudo preparar la contraseña temporal: ${passwordError.message}`, 500);

    const templateId = process.env.RESEND_INVITATION_TEMPLATE_ID || "invitacion-ttutis";
    const emailVariables = {
        USER_NAME: userName || email,
        INSTITUTION_NAME: institutionName,
        ACCOUNT_TYPE: accountTypes[payload.type],
        ACCESS_CODE: accessCode || email,
        TEMP_PASSWORD: temporaryPassword,
        LOGIN_URL: new URL("/auth", request.url).toString(),
    };

    let emailResponse;
    try {
        emailResponse = await fetch(new URL("/api/emails", request.url), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({
                to: email,
                templateId,
                variables: emailVariables,
                institutionId: payload.institutionId,
                profileId: payload.profileId,
                membershipId: payload.membershipId,
                studentId: payload.studentId,
                type: payload.type,
            }),
        });
    } catch {
        return fail("No se pudo conectar con la ruta de correo. La contraseña temporal cambió; vuelve a invitar para generar otra.", 502);
    }

    const emailResult = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok) {
        return fail(
            `${emailResult.error || "No se pudo enviar la invitación."} La contraseña temporal cambió; vuelve a invitar para generar otra.`,
            emailResponse.status,
        );
    }

    return NextResponse.json({
        success: true,
        email,
        accessCode: accessCode || email,
        message: `Se envió la invitación con los datos de acceso a ${email}.`,
    });
}

export async function PATCH(request) {
    let payload;
    try { payload = await request.json(); } catch { return fail("La solicitud no tiene un formato válido."); }
    if (!payload?.institutionId || !["STUDENT", "TEACHER", "ASSISTANT", "GUARDIAN"].includes(payload.type)) return fail("No se identificó la persona o la institución.");
    const context = await getAdminContext(request, payload);
    if (context.response) return context.response;
    const { admin } = context;
    const values = payload.values || {};
    try {
        if (payload.type === "STUDENT") {
            const firstNames = clean(values.first_names);
            const lastNames = clean(values.last_names);
            if (!firstNames || !lastNames) return fail("Nombres y apellidos son obligatorios.");
            const studentUpdates = {
                first_names: firstNames, last_names: lastNames,
                student_code: clean(values.student_code) || null,
                document_type: clean(values.document_type) || null,
                document_number: clean(values.document_number) || null,
                birth_date: clean(values.birth_date) || null,
                admission_date: clean(values.admission_date) || null,
                phone: clean(values.phone) || null,
            };
            if (studentUpdates.student_code) {
                const { data: duplicate, error: duplicateError } = await admin.from("students").select("id").eq("institution_id", payload.institutionId).ilike("student_code", studentUpdates.student_code).neq("id", payload.studentId).limit(1).maybeSingle();
                if (duplicateError) throw duplicateError;
                if (duplicate) return fail("Ese código de alumno ya está registrado en esta institución.", 409);
            }
            const { data, error } = await admin.from("students").update(studentUpdates).eq("id", payload.studentId).eq("institution_id", payload.institutionId).select("id,membership_id").maybeSingle();
            if (error) throw error;
            if (!data) return fail("No se encontró el alumno.", 404);
            if (data.membership_id) {
                const { data: member } = await admin.from("memberships").select("profile_id").eq("id", data.membership_id).eq("institution_id", payload.institutionId).maybeSingle();
                await updateMembership(admin, { ...payload, membershipId: data.membership_id }, { full_name: `${firstNames} ${lastNames}` });
                if (member?.profile_id) {
                    const { error: profileError } = await admin.from("profiles").update({ display_name: `${firstNames} ${lastNames}` }).eq("id", member.profile_id);
                    if (profileError) throw profileError;
                }
            }
        } else if (payload.type === "GUARDIAN") {
            const displayName = clean(values.full_name);
            if (!displayName) return fail("El nombre es obligatorio.");
            const { data: link, error: linkError } = await admin.from("guardian_student_links").select("id").eq("institution_id", payload.institutionId).eq("guardian_profile_id", payload.profileId).limit(1).maybeSingle();
            if (linkError) throw linkError;
            if (!link) return fail("No se encontró el apoderado.", 404);
            const { error } = await admin.from("profiles").update({ display_name: displayName }).eq("id", payload.profileId);
            if (error) throw error;
            const relationship = clean(values.relationship);
            if (relationship) {
                const { error: relationshipError } = await admin.from("guardian_student_links").update({ relationship }).eq("institution_id", payload.institutionId).eq("guardian_profile_id", payload.profileId);
                if (relationshipError) throw relationshipError;
            }
        } else {
            const fullName = clean(values.full_name);
            if (!fullName) return fail("El nombre es obligatorio.");
            await updateMembership(admin, payload, { full_name: fullName });
            if (payload.profileId) {
                const { error: profileError } = await admin.from("profiles").update({ display_name: fullName }).eq("id", payload.profileId);
                if (profileError) throw profileError;
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) { return fail(error.message || "No se pudieron guardar los cambios.", 400); }
}

export async function DELETE(request) {
    let payload;
    try { payload = await request.json(); } catch { return fail("La solicitud no tiene un formato válido."); }
    if (!payload?.institutionId || !["STUDENT", "TEACHER", "ASSISTANT", "GUARDIAN"].includes(payload.type)) return fail("No se identificó la persona o la institución.");
    const context = await getAdminContext(request, payload);
    if (context.response) return context.response;
    const { admin } = context;
    try {
        if (payload.type === "STUDENT") {
            const { data: student, error } = await admin.from("students").update({ status: "INACTIVE" }).eq("id", payload.studentId).eq("institution_id", payload.institutionId).select("id,membership_id").maybeSingle();
            if (error) throw error;
            if (!student) return fail("No se encontró el alumno.", 404);
            if (student.membership_id) await updateMembership(admin, { ...payload, membershipId: student.membership_id }, { status: "REVOKED" });
            const today = new Date().toISOString().slice(0, 10);
            const { error: enrollmentError } = await admin.from("enrollments").update({ status: "INACTIVE", ended_at: today }).eq("institution_id", payload.institutionId).eq("student_id", payload.studentId).eq("status", "ACTIVE");
            if (enrollmentError) throw enrollmentError;
        } else if (payload.type === "GUARDIAN") {
            const { data, error } = await admin.from("guardian_student_links").update({ status: "REVOKED" }).eq("institution_id", payload.institutionId).eq("guardian_profile_id", payload.profileId).in("status", ["ACTIVE", "PENDING"]).select("id");
            if (error) throw error;
            if (!data?.length) return fail("No se encontraron vínculos activos para este apoderado.", 404);
        } else {
            await updateMembership(admin, payload, { status: "REVOKED" });
        }
        return NextResponse.json({ success: true });
    } catch (error) { return fail(error.message || "No se pudo retirar a la persona del directorio.", 400); }
}
