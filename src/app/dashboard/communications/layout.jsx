import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Comunicaciones",
    description: "Redacta y administra los avisos dirigidos a estudiantes y familias.",
    path: "/dashboard/communications",
});

export default function CommunicationsLayout({ children }) {
    return children;
}
