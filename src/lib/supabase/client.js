import { createBrowserClient } from "@supabase/ssr";

let browserClient;

export function createClient() {
    if (browserClient) return browserClient;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_KEY en .env.local.");
    }

    browserClient = createBrowserClient(supabaseUrl, supabaseKey);
    return browserClient;
}
