import { createClient } from "@/lib/supabase/client";

const getResponseData = async response => {
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.error || "No se pudo completar la solicitud.");
    }

    return result;
};

async function manageTicketAttachments(ticketId, operation, files) {
    const response = await fetch(`/api/support/tickets/${ticketId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, files }),
    });

    return getResponseData(response);
}

export async function createSupportTicket(values, attachments = []) {
    const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...values,
            attachmentCount: attachments.length,
        }),
    });
    const result = await getResponseData(response);
    const ticket = {
        ...result.data,
        notification: result.notification,
        attachmentCount: 0,
        attachmentError: "",
    };

    if (!attachments.length) return ticket;

    let signedUploads = [];

    try {
        const fileMetadata = attachments.map(file => ({
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
        }));
        const signResult = await manageTicketAttachments(ticket.id, "sign", fileMetadata);
        signedUploads = signResult.data || [];

        const supabase = createClient();
        const completedFiles = [];

        for (let index = 0; index < signedUploads.length; index += 1) {
            const signedUpload = signedUploads[index];
            const file = attachments[index];
            const { error } = await supabase.storage
                .from("support-ticket-attachments")
                .uploadToSignedUrl(signedUpload.path, signedUpload.token, file, {
                    contentType: signedUpload.mimeType,
                });

            if (error) throw new Error(error.message);

            completedFiles.push({
                path: signedUpload.path,
                fileName: signedUpload.fileName,
                mimeType: signedUpload.mimeType,
                sizeBytes: signedUpload.sizeBytes,
            });
        }

        await manageTicketAttachments(ticket.id, "complete", completedFiles);
        ticket.attachmentCount = completedFiles.length;
    } catch (error) {
        if (signedUploads.length) {
            await manageTicketAttachments(
                ticket.id,
                "cleanup",
                signedUploads.map(upload => upload.path),
            ).catch(() => undefined);
        }
        ticket.attachmentError = error.message || "No se pudieron guardar todas las capturas.";
    }

    return ticket;
}

export async function getSupportTickets(page = 1) {
    const response = await fetch(`/api/support/tickets?page=${encodeURIComponent(page)}`, {
        method: "GET",
        cache: "no-store",
    });
    const result = await getResponseData(response);
    return {
        tickets: result.data || [],
        page: result.page || page,
        pageSize: result.pageSize || 25,
        total: result.total || 0,
    };
}
