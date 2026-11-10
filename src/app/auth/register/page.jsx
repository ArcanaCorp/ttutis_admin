import RegisterAdminForm from "@/components/auth/RegisterAdminForm";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Registrar institución",
    description: "Configura la institución y la cuenta administradora para comenzar a usar TTUTIS Admin.",
    path: "/auth/register",
});

export default function RegisterPage() {
    return <RegisterAdminForm />;
}
