'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const supabaseRef = useRef(null);
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const supabase = createClient();
        supabaseRef.current = supabase;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!active) return;
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
            setLoading(false);
        });

        supabase.auth.getSession().then(({ data, error }) => {
            if (!active) return;
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setLoading(false);
            if (error) console.error("No se pudo leer la sesión de Supabase.", error.message);
        }).catch(error => {
            if (!active) return;
            setLoading(false);
            console.error("No se pudo leer la sesión de Supabase.", error);
        });

        return () => {
            active = false;
            subscription.unsubscribe();
            supabaseRef.current = null;
        };
    }, []);

    const signIn = useCallback(async (email, password) => {
        const supabase = supabaseRef.current;
        if (!supabase) return { error: new Error("El cliente de autenticación aún no está disponible.") };
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error };
        setSession(data.session);
        setUser(data.user);
        return { error: null };
    }, []);

    const signUp = useCallback(async (email, password, displayName) => {
        const supabase = supabaseRef.current;
        if (!supabase) return { data: null, error: new Error("El cliente de autenticación aún no está disponible.") };
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName },
                emailRedirectTo: `${window.location.origin}/auth/register`,
            },
        });
        if (error) return { data, error };
        if (data.session) {
            setSession(data.session);
            setUser(data.user);
        }
        return { data, error: null };
    }, []);

    const signOut = useCallback(async () => {
        const supabase = supabaseRef.current;
        if (!supabase) return { error: new Error("El cliente de autenticación aún no está disponible.") };
        const { error } = await supabase.auth.signOut();
        if (error) return { error };
        setSession(null);
        setUser(null);
        return { error: null };
    }, []);

    const value = useMemo(() => ({
        user,
        session,
        loading,
        isAuthenticated: Boolean(user),
        signIn,
        signUp,
        signOut,
    }), [user, session, loading, signIn, signUp, signOut]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
    return context;
}

export default AuthContext;
