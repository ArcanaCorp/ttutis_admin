import { Outfit } from "next/font/google";
import "@/styles/global.css";
import "react-loading-skeleton/dist/skeleton.css";
import Providers from "@/providers";

const outfit = Outfit({
    variable: '--font-outfit',
    subsets: ["latin"],
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
})

export const metadata = {
    title: 'Bienvenido a ttutis'
}

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
