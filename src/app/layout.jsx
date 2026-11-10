import { Outfit } from "next/font/google";
import "@/styles/global.css";
import "react-loading-skeleton/dist/skeleton.css";
import Providers from "@/providers";
import { siteName, siteUrl } from "@/lib/metadata";

const outfit = Outfit({
    variable: '--font-outfit',
    subsets: ["latin"],
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
})

export const metadata = {
    metadataBase: new URL(siteUrl),
    applicationName: siteName,
    title: {
        default: "TTUTIS Admin | Gestión escolar",
        template: "%s | TTUTIS Admin",
    },
    description: "Administra la información, la actividad académica y la comunicación de tu institución educativa con TTUTIS Admin.",
    keywords: [
        "TTUTIS Admin",
        "gestión educativa",
        "administración escolar",
        "institución educativa",
        "ARCANA CORP",
    ],
    creator: "ARCANA CORP S.A.C.",
    publisher: "ARCANA CORP S.A.C.",
    category: "education",
    referrer: "strict-origin-when-cross-origin",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    icons: {
        icon: "/favicon.ico",
    },
    openGraph: {
        type: "website",
        locale: "es_PE",
        siteName: siteName,
        title: "TTUTIS Admin | Gestión escolar",
        description: "Plataforma de administración y seguimiento para instituciones educativas.",
        url: siteUrl,
    },
    twitter: {
        card: "summary",
        title: "TTUTIS Admin | Gestión escolar",
        description: "Plataforma de administración y seguimiento para instituciones educativas.",
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

export const viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#f8fafc",
    colorScheme: "light",
};

export default function RootLayout ({ children }) {
    return (
        <html lang="es" className={`${outfit.className}`} data-scroll-behavior="smooth">
            <body>
                <Providers>
                    <div className="desktop-only-app">{children}</div>
                    <main className="desktop-only-message" role="status" aria-live="polite">
                        <div className="desktop-only-message__icon" aria-hidden="true">▣</div>
                        <p className="desktop-only-message__eyebrow">TTutis Admin</p>
                        <h1>Lo sentimos</h1>
                        <p>Esta aplicación solo está disponible en computadoras.</p>
                        <p className="desktop-only-message__hint">Abre TTutis desde una computadora o laptop para continuar.</p>
                    </main>
                </Providers>
            </body>
        </html>
    )
}
