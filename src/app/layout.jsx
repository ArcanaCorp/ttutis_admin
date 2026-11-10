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
                    {children}
                </Providers>
            </body>
        </html>
    )
}
