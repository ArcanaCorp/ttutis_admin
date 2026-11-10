import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Navbar from "@/components/layout/Navbar";
import DashboardSkeleton from "@/components/ui/DashboardSkeleton";
import { createClient } from "@/lib/supabase/server";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
    title: "Panel de inicio",
    description: "Resumen de la actividad y el estado de tu institución educativa.",
    path: "/dashboard",
});

export default function DashboardLayout({ children }) {
    return <Suspense fallback={<DashboardSkeleton />}><ProtectedDashboard>{children}</ProtectedDashboard></Suspense>;
}

async function ProtectedDashboard({ children }) {
    // Dashboard output depends on the signed-in user and request-time session.
    // Keep it out of static prerendering before auth/Supabase reads run.
    await connection();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth");

    return (
        <div className="h-screen grid grid-dashboard bg-subtle overflow-hidden">
            <Navbar />
            <main className="h-screen px-md py-lg scroll scroll-y-auto">
                {children}
            </main>
        </div>
    );
}
