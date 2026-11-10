import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Navbar from "@/components/layout/Navbar";
import DashboardSkeleton from "@/components/ui/DashboardSkeleton";
import { createClient } from "@/lib/supabase/server";

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
            <main className="h-screen p-md scroll scroll-y-auto">
                {children}
            </main>
        </div>
    );
}
