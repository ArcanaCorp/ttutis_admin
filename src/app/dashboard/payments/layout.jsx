import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Pagos",
    description: "Administra conceptos, obligaciones y pagos escolares de tu institución.",
    path: "/dashboard/payments",
});

export default function PaymentsLayout({ children }) {
    return children;
}
