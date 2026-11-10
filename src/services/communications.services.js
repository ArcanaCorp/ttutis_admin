export async function createNotification(values) {
    const response = await fetch("/api/dashboard/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.error || "No se pudo crear la notificación.");
    }

    return result.data;
}
