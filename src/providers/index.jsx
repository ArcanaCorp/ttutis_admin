import { AuthProvider } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";

export default function Providers ({ children }) {
    return (
        <>
            <AuthProvider>
                <ProfileProvider>
                    {children}
                </ProfileProvider>
            </AuthProvider>
        </>
    )
}
