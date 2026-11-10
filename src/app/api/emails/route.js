import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { resend } from "@/lib/resend/resend";

const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

const templateAlias = process.env.RESEND_INVITATION_TEMPLATE_ID || "invitacion-ttutis";

export async function POST(request) {
    try {
        const payload = await request.json();
        const {
            to,
            templateId,
            variables,
            institutionId,
            profileId,
            membershipId,
            studentId,
            type,
        } = payload || {};

        if (!to || !templateId || !institutionId || !profileId) {
            return fail("Faltan datos obligatorios para enviar la invitación.");
        }

        if (templateId !== templateAlias) {
            return fail("Esta ruta solo puede enviar la plantilla de invitación TTutis.", 403);
        }

        const sessionClient = await createSessionClient();
        const { data: { user }, error: authError } = await sessionClient.auth.getUser();

        if (authError || !user) {
            return fail("Inicia sesión para enviar la invitación.", 401);
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return fail("La gestión de personas no está configurada en el servidor.", 503);
        }

        const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const { data: adminMembership, error: adminError } = await admin
            .from("memberships")
            .select("id")
            .eq("institution_id", institutionId)
            .eq("profile_id", user.id)
            .eq("role", "ADMIN")
            .eq("status", "ACTIVE")
            .maybeSingle();

        if (adminError) {
            return fail(adminError.message, 400);
        }

        if (!adminMembership) {
            return fail("Necesitas una membresía ADMIN activa en esta institución.", 403);
        }

        if (type === "STUDENT") {
            const { data: student, error } = await admin
                .from("students")
                .select("membership_id")
                .eq("id", studentId)
                .eq("institution_id", institutionId)
                .maybeSingle();

            if (error) return fail(error.message, 400);
            if (!student || student.membership_id !== membershipId) {
                return fail("El alumno no pertenece a esta institución.", 404);
            }
        } else if (type === "GUARDIAN") {
            const { data: guardianLink, error } = await admin
                .from("guardian_student_links")
                .select("id")
                .eq("institution_id", institutionId)
                .eq("guardian_profile_id", profileId)
                .limit(1)
                .maybeSingle();

            if (error) return fail(error.message, 400);
            if (!guardianLink) return fail("El apoderado no pertenece a esta institución.", 404);
        } else {
            const { data: membership, error } = await admin
                .from("memberships")
                .select("id,profile_id,role")
                .eq("id", membershipId)
                .eq("institution_id", institutionId)
                .maybeSingle();

            if (error) return fail(error.message, 400);
            if (
                !membership ||
                membership.profile_id !== profileId ||
                membership.role !== type
            ) {
                return fail("La membresía no pertenece a esta institución.", 404);
            }
        }

        const { data: account, error: accountError } = await admin.auth.admin.getUserById(profileId);

        if (accountError || !account?.user?.email) {
            return fail("No se encontró el correo de la cuenta de acceso.", 404);
        }

        if (account.user.email.toLowerCase() !== String(to).trim().toLowerCase()) {
            return fail("El destinatario no coincide con el correo de la cuenta.", 400);
        }

        const displayName =
            account?.user?.user_metadata?.display_name ||
            account?.user?.user_metadata?.full_name ||
            account?.user?.email?.split("@")[0] ||
            "Usuario";

        const emailOptions = {
            to: [to],
            subject: `¡${displayName}, tu cuenta TTUTIS ya está activa! Accede ahora`,
            template: {
                id: templateId,
                variables: variables || {},
            },
        };

        if (process.env.EMAIL_FROM) {
            emailOptions.from = process.env.EMAIL_FROM;
        }

        const { data, error } = await resend.emails.send(emailOptions);

        if (error) {
            return fail(error.message, 502);
        }

        return NextResponse.json({
            success: true,
            id: data?.id,
            message: "La invitación se envió correctamente.",
        });

    } catch (error) {
        return fail(error.message || "No se pudo enviar la invitación.", 500);
    }
}