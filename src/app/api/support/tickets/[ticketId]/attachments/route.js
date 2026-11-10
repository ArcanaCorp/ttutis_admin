import { NextResponse } from "next/server";
import { getOwnedSupportTicket, getSupportContext } from "@/lib/support/server";

const bucketName = "support-ticket-attachments";
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumFiles = 5;
const maximumFileSize = 5 * 1024 * 1024;
const extensionByMimeType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

function validateFiles(files) {
    if (!Array.isArray(files) || files.length < 1 || files.length > maximumFiles) {
        return "Puedes adjuntar entre una y cinco capturas por carga.";
    }

    for (const file of files) {
        if (!allowedMimeTypes.has(file.mimeType)) {
            return "Solo se permiten capturas en formato JPG, PNG o WebP.";
        }
        if (!Number.isInteger(file.sizeBytes) || file.sizeBytes < 1 || file.sizeBytes > maximumFileSize) {
            return "Cada captura debe pesar como máximo 5 MB.";
        }
        if (typeof file.fileName !== "string" || !file.fileName.trim() || file.fileName.length > 180) {
            return "Uno de los nombres de archivo no es válido.";
        }
    }

    return "";
}

export async function POST(request, { params }) {
    try {
        const { ticketId } = await params;
        const context = await getSupportContext();
        if (context.error) return fail(context.error.message, context.error.status);

        const { data: ticket, error: ticketError } = await getOwnedSupportTicket(
            context.admin,
            context.user.id,
            ticketId,
        );

        if (ticketError) return fail(ticketError.message, 400);
        if (!ticket) return fail("No se encontró el ticket solicitado.", 404);

        const payload = await request.json();
        const operation = String(payload?.operation || "");
        const files = payload?.files;
        const storage = context.admin.storage.from(bucketName);
        const folder = `${context.user.id}/${ticket.id}`;

        if (operation === "sign") {
            const validationMessage = validateFiles(files);
            if (validationMessage) return fail(validationMessage);

            const { count, error: countError } = await context.admin
                .from("support_ticket_attachments")
                .select("id", { count: "exact", head: true })
                .eq("ticket_id", ticket.id);

            if (countError) return fail(countError.message, 400);
            if ((count || 0) + files.length > maximumFiles) {
                return fail("Este ticket ya alcanzó el máximo de cinco capturas.");
            }

            const uploads = [];

            for (const file of files) {
                const extension = extensionByMimeType[file.mimeType];
                const path = `${folder}/${crypto.randomUUID()}.${extension}`;
                const { data, error } = await storage.createSignedUploadUrl(path, { upsert: false });

                if (error) {
                    return fail(error.message, 400);
                }

                uploads.push({
                    path,
                    token: data.token,
                    fileName: file.fileName.trim(),
                    mimeType: file.mimeType,
                    sizeBytes: file.sizeBytes,
                });
            }

            return NextResponse.json({ data: uploads });
        }

        if (operation === "complete") {
            const validationMessage = validateFiles(files);
            if (validationMessage) return fail(validationMessage);

            const { data: existing, error: existingError } = await context.admin
                .from("support_ticket_attachments")
                .select("storage_path")
                .eq("ticket_id", ticket.id);

            if (existingError) return fail(existingError.message, 400);
            if ((existing?.length || 0) + files.length > maximumFiles) {
                return fail("Este ticket ya alcanzó el máximo de cinco capturas.");
            }

            const { data: storedObjects, error: listError } = await storage.list(folder);
            if (listError) return fail(listError.message, 400);
            const storedNames = new Set((storedObjects || []).map(object => object.name));
            const rows = [];

            for (const file of files) {
                const path = String(file.path || "");
                const pathParts = path.split("/");
                const filePath = pathParts.at(-1);

                if (
                    pathParts.length !== 3
                    || pathParts[0] !== context.user.id
                    || pathParts[1] !== ticket.id
                    || !storedNames.has(filePath)
                ) {
                    return fail("No se pudo verificar una de las capturas subidas.");
                }

                rows.push({
                    ticket_id: ticket.id,
                    uploaded_by_profile_id: context.user.id,
                    storage_path: path,
                    file_name: file.fileName.trim(),
                    mime_type: file.mimeType,
                    size_bytes: file.sizeBytes,
                });
            }

            const { data, error } = await context.admin
                .from("support_ticket_attachments")
                .insert(rows)
                .select("id,ticket_id,storage_path,file_name,mime_type,size_bytes,created_at");

            if (error) return fail(error.message, 400);
            return NextResponse.json({ data });
        }

        if (operation === "cleanup") {
            const paths = Array.isArray(files) ? files : [];
            const ownedPaths = paths.filter(path =>
                typeof path === "string" && path.startsWith(`${folder}/`)
            );

            if (ownedPaths.length) {
                const { error } = await storage.remove(ownedPaths);
                if (error) return fail(error.message, 400);
            }

            return NextResponse.json({ success: true });
        }

        return fail("La operación de capturas no es válida.");
    } catch (error) {
        return fail(error.message || "No se pudieron procesar las capturas.", 500);
    }
}
