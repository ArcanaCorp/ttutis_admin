import { siteUrl } from "@/lib/metadata";

export default function robots() {
    return {
        rules: {
            userAgent: "*",
            disallow: "/",
        },
        host: siteUrl,
    };
}
