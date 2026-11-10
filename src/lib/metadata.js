export const siteUrl = "https://ttutis.arcanacorp.dev";
export const siteName = "TTUTIS Admin";

export function createPageMetadata({ title, description, path }) {
    const absoluteUrl = new URL(path, siteUrl).toString();
    const socialTitle = `${title} | ${siteName}`;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteUrl,
        },
        openGraph: {
            type: "website",
            locale: "es_PE",
            siteName,
            title: socialTitle,
            description,
            url: absoluteUrl,
        },
        twitter: {
            card: "summary",
            title: socialTitle,
            description,
        },
        robots: {
            index: false,
            follow: false,
            googleBot: {
                index: false,
                follow: false,
            },
        },
    };
}
