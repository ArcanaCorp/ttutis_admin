import { createClient } from "@/lib/supabase/client";

export const INSTITUTION_LOGO_BUCKET = "institution";
export const INSTITUTION_LOGO_MAX_SIZE = 2 * 1024 * 1024;
export const INSTITUTION_LOGO_ACCEPT = "image/png,image/jpeg,image/webp";

const extensionByMimeType = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
};

function createFileId() {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
    if (!cryptoApi?.getRandomValues) return null;

    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getObjectPath(institutionId, logoPath) {
    if (!institutionId || !logoPath) return null;

    let path = String(logoPath).trim();
    const publicObjectPrefix = `/storage/v1/object/public/${INSTITUTION_LOGO_BUCKET}/`;
    const publicUrlIndex = path.indexOf(publicObjectPrefix);
    if (publicUrlIndex >= 0) {
        path = path.slice(publicUrlIndex + publicObjectPrefix.length).split("?")[0];
    } else if (/^https?:\/\//i.test(path)) {
        return null;
    }

    path = path.replace(/^\/+/, "");
    if (path.startsWith(`${INSTITUTION_LOGO_BUCKET}/`)) {
        path = path.slice(INSTITUTION_LOGO_BUCKET.length + 1);
    }

    return path.split("/")[0] === institutionId ? path : null;
}

export function getInstitutionLogoUrl(institutionId, logoPath) {
    const objectPath = getObjectPath(institutionId, logoPath);
    if (!objectPath) return null;

    return createClient()
        .storage
        .from(INSTITUTION_LOGO_BUCKET)
        .getPublicUrl(objectPath)
        .data
        .publicUrl;
}

export async function uploadInstitutionLogo(institutionId, file) {
    if (!institutionId) throw new Error("Selecciona una institución antes de subir el logo.");
    if (!file || !extensionByMimeType[file.type]) {
        throw new Error("El logo debe ser PNG, JPG o WebP.");
    }
    if (file.size <= 0 || file.size > INSTITUTION_LOGO_MAX_SIZE) {
        throw new Error("El logo debe pesar menos de 2 MB.");
    }

    const fileId = createFileId();
    if (!fileId) throw new Error("Este navegador no permite generar un nombre seguro para el archivo.");

    const path = `${institutionId}/${fileId}.${extensionByMimeType[file.type]}`;
    const { data, error } = await createClient()
        .storage
        .from(INSTITUTION_LOGO_BUCKET)
        .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
        });

    if (error) throw new Error(`No se pudo subir el logo: ${error.message}`);
    return data.path;
}

export async function removeInstitutionLogo(institutionId, logoPath) {
    const objectPath = getObjectPath(institutionId, logoPath);
    if (!objectPath) return { error: null };

    const { error } = await createClient()
        .storage
        .from(INSTITUTION_LOGO_BUCKET)
        .remove([objectPath]);

    return { error };
}
