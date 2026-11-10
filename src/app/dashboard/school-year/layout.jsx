import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Año escolar",
    description: "Configura los años académicos, las aulas y las matrículas de tu institución.",
    path: "/dashboard/school-year",
});

export default function SchoolYearLayout({ children }) {
    return children;
}
