import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Clases y horarios",
    description: "Organiza aulas, cursos, asignaciones y horarios escolares.",
    path: "/dashboard/classes-schedules",
});

export default function ClassesSchedulesLayout({ children }) {
    return children;
}
