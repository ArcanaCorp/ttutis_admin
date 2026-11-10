import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Asistencia",
    description: "Consulta y administra los registros de asistencia de tu institución.",
    path: "/dashboard/attendance",
});

export default function AttendanceLayout({ children }) {
    return children;
}
