export async function recordAuditEvent(eventType) {
    try {
        await fetch("/api/audit/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventType }),
            keepalive: eventType === "LOGOUT",
        });
    } catch (error) {
        console.warn("No se pudo registrar el evento de auditoría.", error);
    }
}
