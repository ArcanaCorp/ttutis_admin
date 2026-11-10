async function requestPayments(payload) {
    const response = await fetch("/api/dashboard/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.error || "No se pudo completar la operación de pagos.");
    }

    return result;
}

export async function getPaymentsData(institutionId) {
    if (!institutionId) return {};

    const response = await fetch(
        `/api/dashboard/payments?institutionId=${encodeURIComponent(institutionId)}`,
        { cache: "no-store" },
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.error || "No se pudieron cargar los datos de pagos.");
    }

    return result;
}

export const runPaymentsAction = requestPayments;
