import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Actualizar contraseña",
    description: "Establece una nueva contraseña para proteger tu cuenta de TTUTIS Admin.",
    path: "/auth/update-password",
});

export default function UpdatePasswordLayout({ children }) {
    return children;
}
