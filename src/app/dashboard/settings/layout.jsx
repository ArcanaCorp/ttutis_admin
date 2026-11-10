import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Configuración",
    description: "Administra la cuenta, las preferencias, las notificaciones y el soporte de TTUTIS Admin.",
    path: "/dashboard/settings",
});

export default function SettingsLayout({ children }) {
    return children;
}
