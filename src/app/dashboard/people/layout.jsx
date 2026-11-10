import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Personas",
    description: "Administra las cuentas, los perfiles y los vínculos de la comunidad educativa.",
    path: "/dashboard/people",
});

export default function PeopleLayout({ children }) {
    return children;
}
