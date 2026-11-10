import { NextResponse } from "next/server";
import { resend } from "@/lib/resend/resend";
import { getSupportContext } from "@/lib/support/server";

const validCategories = ["ACCESS", "ACADEMIC", "PAYMENTS", "COMMUNICATIONS", "OTHER"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const attachmentBucket = "support-ticket-attachments";

const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET() {
    try {
        const context = await getSupportContext();
        if (context.error) return fail(context.error.message, context.error.status);

        const { data: tickets, error: ticketError } = await context.admin
            .from("support_tickets")
            .select("id,category,subject,description,status,created_at,updated_at")
            .eq("requester_profile_id", context.user.id)
            .order("created_at", { ascending: false })
            .limit(100);

        if (ticketError) return fail(ticketError.message, 400);
        if (!tickets?.length) return NextResponse.json({ data: [] });

        const ticketIds = tickets.map(ticket => ticket.id);
        const { data: attachments, error: attachmentError } = await context.admin
            .from("support_ticket_attachments")
            .select("id,ticket_id,storage_path,file_name,mime_type,size_bytes,created_at")
            .in("ticket_id", ticketIds)
            .order("created_at", { ascending: true });

        if (attachmentError) return fail(attachmentError.message, 400);

        const paths = (attachments || []).map(attachment => attachment.storage_path);
        const signedResult = paths.length
            ? await context.admin.storage.from(attachmentBucket).createSignedUrls(paths, 3600)
            : { data: [], error: null };

        if (signedResult.error) {
            console.error("Could not sign support ticket attachments", signedResult.error);
        }

        const signedUrls = new Map((signedResult.data || []).map(item => [item.path, item.signedUrl]));
        const attachmentsByTicket = new Map();

        for (const attachment of attachments || []) {
            const ticketAttachments = attachmentsByTicket.get(attachment.ticket_id) || [];
            ticketAttachments.push({
                ...attachment,
                signed_url: signedUrls.get(attachment.storage_path) || null,
            });
            attachmentsByTicket.set(attachment.ticket_id, ticketAttachments);
        }

        return NextResponse.json({
            data: tickets.map(ticket => ({
                ...ticket,
                attachments: attachmentsByTicket.get(ticket.id) || [],
            })),
        });
    } catch (error) {
        return fail(error.message || "No se pudieron cargar tus solicitudes.", 500);
    }
}

export async function POST(request) {
    try {
        const context = await getSupportContext();
        if (context.error) return fail(context.error.message, context.error.status);

        const payload = await request.json();
        const category = String(payload?.category || "").trim();
        const subject = String(payload?.subject || "").trim();
        const description = String(payload?.description || "").trim();
        const institutionId = payload?.institutionId
            ? String(payload.institutionId).trim()
            : null;
        const attachmentCount = Number(payload?.attachmentCount || 0);

        if (!validCategories.includes(category)) {
            return fail("Selecciona un motivo válido para tu solicitud.");
        }

        if (subject.length < 4 || subject.length > 140) {
            return fail("El asunto debe tener entre 4 y 140 caracteres.");
        }

        if (description.length < 10 || description.length > 5000) {
            return fail("El detalle debe tener entre 10 y 5,000 caracteres.");
        }

        if (!Number.isInteger(attachmentCount) || attachmentCount < 0 || attachmentCount > 5) {
            return fail("Puedes adjuntar hasta cinco capturas de pantalla.");
        }

        if (institutionId && !uuidPattern.test(institutionId)) {
            return fail("La institución asociada no es válida.");
        }

        if (!context.user.email) {
            return fail("La cuenta no tiene un correo asociado para dar seguimiento al ticket.");
        }

        if (institutionId) {
            const { data: membership, error: membershipError } = await context.admin
                .from("memberships")
                .select("id")
                .eq("institution_id", institutionId)
                .eq("profile_id", context.user.id)
                .eq("status", "ACTIVE")
                .maybeSingle();

            if (membershipError) return fail(membershipError.message, 400);
            if (!membership) return fail("No tienes acceso activo a la institución seleccionada.", 403);
        }

        const { data: profile, error: profileError } = await context.admin
            .from("profiles")
            .select("display_name")
            .eq("id", context.user.id)
            .maybeSingle();

        if (profileError) return fail(profileError.message, 400);

        const { data: ticket, error: ticketError } = await context.admin
            .from("support_tickets")
            .insert({
                requester_profile_id: context.user.id,
                requester_name: profile?.display_name || context.user.user_metadata?.display_name || null,
                requester_email: context.user.email,
                institution_id: institutionId,
                category,
                subject,
                description,
            })
            .select("id,status,created_at")
            .single();

        if (ticketError) return fail(ticketError.message, 400);

        let notification = {
            sent: false,
            message: "El ticket quedó guardado. Falta configurar el correo receptor de soporte.",
        };
        const supportEmail = process.env.SUPPORT_NOTIFICATION_EMAIL;

        if (supportEmail && process.env.EMAIL_FROM) {
            const ticketCode = ticket.id.slice(0, 8).toUpperCase();
            const categoryLabel = {
                ACCESS: "Acceso a mi cuenta",
                ACADEMIC: "Gestión académica",
                PAYMENTS: "Pagos",
                COMMUNICATIONS: "Comunicaciones",
                OTHER: "Otro tema",
            }[category];

            try {
                const { error: emailError } = await resend.emails.send({
                    from: process.env.EMAIL_FROM,
                    to: [supportEmail],
                    replyTo: context.user.email,
                    subject: `[TTUTIS] Nuevo ticket ${ticketCode}: ${subject}`,
                    text: [
                        `Ticket: ${ticketCode}`,
                        `Solicitante: ${profile?.display_name || "Usuario TTUTIS"}`,
                        `Correo: ${context.user.email}`,
                        `Categoría: ${categoryLabel}`,
                        `Institución: ${institutionId || "No asociada"}`,
                        `Capturas adjuntas: ${attachmentCount}`,
                        "",
                        "Detalle:",
                        description,
                    ].join("\n"),
                });

                if (emailError) throw emailError;
                notification = { sent: true, message: "También enviamos un aviso al equipo de soporte." };
            } catch (emailError) {
                console.error("Could not send support ticket notification", emailError);
                notification = {
                    sent: false,
                    message: "El ticket quedó guardado, pero no se pudo enviar el aviso por correo.",
                };
            }
        }

        return NextResponse.json({ data: ticket, notification }, { status: 201 });
    } catch (error) {
        return fail(error.message || "No se pudo registrar tu solicitud.", 500);
    }
}
