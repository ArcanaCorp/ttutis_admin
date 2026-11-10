import { Suspense } from "react";
import { redirect } from "next/navigation";
import DashboardSkeleton from "@/components/ui/DashboardSkeleton";
import { createClient } from "@/lib/supabase/server";

export default function Page() {
    return <Suspense fallback={<DashboardSkeleton />}><RedirectBySession /></Suspense>;
}

async function RedirectBySession() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    redirect(user ? "/dashboard" : "/auth");
}
