'use client';

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { navbarList } from "@/constants/navbar";
import Link from "next/link";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { getInstitutionLogoUrl } from "@/services/institutionLogo.services";
import { Headset } from "lucide-react";

export default function Navbar () {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuth();
    const { currentInstitution, loading: profileLoading } = useProfile();
    const [signingOut, setSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState("");
    const institutionName = currentInstitution?.trade_name || currentInstitution?.legal_name || "Tu colegio";
    const institutionLogoUrl = getInstitutionLogoUrl(currentInstitution?.id, currentInstitution?.logo_path);

    const handleSignOut = async () => {
        setSigningOut(true);
        setSignOutError("");
        const { error } = await signOut();
        setSigningOut(false);
        if (error) {
            setSignOutError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
            return;
        }
        router.replace("/auth");
        router.refresh();
    };

    return (
        <nav aria-label="Navegación principal" className="navbar w bg-surface flex flex-col gap-md justify-between p-md border-r scroll scroll-y-auto" style={{"--w": "var(--layout-sidebar-width)"}}>
            <div className="flex flex-col gap-md">
                <div className="flex gap-sm border p-md radius-md">
                    <div className="square center" style={{"--sq": "40px"}}>
                        <Avatar name={institutionName} src={institutionLogoUrl} alt={`Logo de ${institutionName}`} size={36} />
                    </div>
                    <div>
                        <h2>{profileLoading ? "Cargando colegio…" : institutionName}</h2>
                        <p className="text-xs text-secondary">
                            {currentInstitution?.tax_id ? `RUC ${currentInstitution.tax_id}` : "Administración institucional"}
                        </p>
                    </div>
                </div>
                <ul className="flex flex-col gap-md">
                    {navbarList.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(`${item.url}/`));
                        return (
                            <li key={item.url} className="w-full">
                                <Link href={item.url} aria-current={isActive ? "page" : undefined} className={`navbar__link flex items-center gap-sm p-sm${isActive ? " navbar__link--active" : ""}`}>
                                    <span className="navbar__icon"><Icon size={20} strokeWidth={1.8} /></span>
                                    <p>
                                        <span className="block">{item.title}</span>
                                        <span className="block text-2xs text-secondary font-regular">{item.label}</span>
                                    </p>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </div>
            <div className="flex flex-col gap-sm">
                <Button icon={Headset} variant="outline" fullWidth>Soporte</Button>
                {signOutError && <p className="text-xs text-error" role="alert">{signOutError}</p>}
                <Button variant="dangerSoft" fullWidth loading={signingOut} loadingText="Cerrando sesión…" onClick={handleSignOut}>Cerrar sesión</Button>
            </div>
        </nav>
    )
}
