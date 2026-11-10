import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Acceso",
    description: "Ingresa a TTUTIS Admin para gestionar tu institución educativa.",
    path: "/auth",
});

export default function AuthLayout ({ children }) {
    return (
        <main>
            {children}
        </main>
    )
}
