import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Mi institución",
    description: "Consulta y actualiza la información general de tu institución educativa.",
    path: "/dashboard/my-school",
});

export default function MySchoolLayout({ children }) {
    return children;
}
