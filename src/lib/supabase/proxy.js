import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function updateSession(request) {
    let response = NextResponse.next({ request });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_KEY en .env.local.");
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet, headers) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
            },
        },
    });

    const { data, error } = await supabase.auth.getClaims();
    // Supabase may return a null data payload when no valid session is present.
    // Treat that as unauthenticated instead of destructuring data.claims.
    const claims = data?.claims ?? null;
    const pathname = request.nextUrl.pathname;

    if (error || !claims?.sub) {
        if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
            const destination = request.nextUrl.clone();
            destination.pathname = "/auth";
            destination.search = "";
            destination.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
            const redirectResponse = NextResponse.redirect(destination);

            response.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie));
            for (const headerName of ["cache-control", "expires", "pragma"]) {
                const headerValue = response.headers.get(headerName);
                if (headerValue) redirectResponse.headers.set(headerName, headerValue);
            }

            return redirectResponse;
        }
    }

    return response;
}
