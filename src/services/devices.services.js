export async function registerCurrentBrowser({ reactivate = false } = {}) {
    if (typeof window === "undefined") return;

    try {
        const storageKey = "ttutis_browser_device_key";
        let deviceKey = window.localStorage.getItem(storageKey);

        if (!deviceKey) {
            deviceKey = window.crypto.randomUUID();
            window.localStorage.setItem(storageKey, deviceKey);
        }

        const response = await fetch("/api/account/devices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceKey, reactivate }),
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error || "No se pudo registrar este navegador.");
        }
    } catch (error) {
        console.warn("No se pudo registrar este navegador.", error);
    }
}

export async function updateDeviceStatus(deviceId, status) {
    const response = await fetch("/api/account/devices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, status }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.error || "No se pudo actualizar el dispositivo.");
    }

    return result.data;
}
