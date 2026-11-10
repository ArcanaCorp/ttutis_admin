import { Suspense } from "react";
import { redirect } from "next/navigation";
import DashboardSkeleton from "@/components/ui/DashboardSkeleton";
import SignInForm from "@/components/auth/SignInForm";
import { createClient } from "@/lib/supabase/server";

export default function Page() {
    return <Suspense fallback={<DashboardSkeleton />}><AuthPageContent /></Suspense>;
}

async function AuthPageContent() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) redirect("/dashboard");
    return <SignInForm />;
}
