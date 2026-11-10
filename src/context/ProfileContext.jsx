'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchProfileData, toAccount, updateInstitutionRecord, updateProfileRecord } from "@/services/profile.services";

const ProfileContext = createContext(null);

const emptyData = {
    account: null,
    profile: null,
    memberships: [],
    institutions: [],
    userDevices: [],
    guardianStudentLinks: [],
};

const institutionEditableFields = new Set([
    "legal_name", "trade_name", "slug", "tax_id", "email", "phone", "website",
    "logo_path", "description", "timezone", "currency",
]);

export function ProfileProvider({ children }) {
    const { user, loading: authLoading } = useAuth();
    const requestIdRef = useRef(0);
    const [loadedState, setLoadedState] = useState({ userId: null, loading: false, error: null, data: emptyData });
    const [selectedMembershipId, setSelectedMembershipId] = useState(null);

    useEffect(() => {
        if (!user) return undefined;
        let active = true;
        const requestId = ++requestIdRef.current;
        fetchProfileData(user).then(({ data, error }) => {
            if (!active || requestId !== requestIdRef.current) return;
            setLoadedState({ userId: user.id, loading: false, error, data });
        }).catch(error => {
            if (!active || requestId !== requestIdRef.current) return;
            setLoadedState({ userId: user.id, loading: false, error, data: { ...emptyData, account: toAccount(user) } });
        });

        return () => {
            active = false;
            requestIdRef.current += 1;
        };
    }, [user]);

    const refreshProfile = useCallback(async () => {
        if (!user) return { data: emptyData, error: new Error("Inicia sesión para cargar tu perfil.") };
        const requestId = ++requestIdRef.current;
        setLoadedState(current => ({
            userId: user.id,
            loading: true,
            error: null,
            data: current.userId === user.id ? current.data : { ...emptyData, account: toAccount(user) },
        }));

        try {
            const result = await fetchProfileData(user);
            if (requestId === requestIdRef.current) {
                setLoadedState({ userId: user.id, loading: false, error: result.error, data: result.data });
            }
            return result;
        } catch (error) {
            const result = { data: emptyData, error };
            if (requestId === requestIdRef.current) {
                setLoadedState({ userId: user.id, loading: false, error, data: { ...emptyData, account: toAccount(user) } });
            }
            return result;
        }
    }, [user]);

    const updateProfile = useCallback(async updates => {
        if (!user) return { data: null, error: new Error("Inicia sesión para actualizar tu perfil.") };
        const allowedUpdates = Object.fromEntries(
            Object.entries(updates ?? {}).filter(([key]) => ["display_name", "avatar_path"].includes(key))
        );
        if (!Object.keys(allowedUpdates).length) {
            return { data: null, error: new Error("No hay campos de perfil válidos para actualizar.") };
        }

        const { data, error } = await updateProfileRecord(user.id, allowedUpdates);
        if (!error) {
            setLoadedState(current => current.userId === user.id
                ? { ...current, data: { ...current.data, profile: data } }
                : current);
        }
        return { data, error };
    }, [user]);

    const updateInstitution = useCallback(async updates => {
        if (!user) return { data: null, error: new Error("Inicia sesión para actualizar la institución.") };
        const data = loadedState.userId === user.id ? loadedState.data : emptyData;
        const activeMembership = data.memberships.find(membership => membership.id === selectedMembershipId)
            ?? data.memberships.find(membership => membership.status === "ACTIVE")
            ?? data.memberships[0];
        if (!activeMembership || activeMembership.role !== "ADMIN" || activeMembership.status !== "ACTIVE") {
            return { data: null, error: new Error("Necesitas una membresía ADMIN activa para editar esta institución.") };
        }

        const allowedUpdates = Object.fromEntries(
            Object.entries(updates ?? {}).filter(([key]) => institutionEditableFields.has(key))
        );
        if (!Object.keys(allowedUpdates).length) {
            return { data: null, error: new Error("No hay campos institucionales válidos para actualizar.") };
        }

        const { data: institution, error } = await updateInstitutionRecord(activeMembership.institution_id, allowedUpdates);
        if (!error) {
            setLoadedState(current => {
                if (current.userId !== user.id) return current;
                const institutions = current.data.institutions.map(item => item.id === institution.id ? institution : item);
                const memberships = current.data.memberships.map(membership => ({
                    ...membership,
                    institution: membership.institution_id === institution.id ? institution : membership.institution,
                }));
                return { ...current, data: { ...current.data, institutions, memberships } };
            });
        }
        return { data: institution, error };
    }, [loadedState, selectedMembershipId, user]);

    const data = useMemo(() => user && loadedState.userId === user.id
        ? loadedState.data
        : { ...emptyData, account: toAccount(user) }, [user, loadedState.userId, loadedState.data]);
    const currentMembership = data.memberships.find(membership => membership.id === selectedMembershipId)
        ?? data.memberships.find(membership => membership.status === "ACTIVE")
        ?? data.memberships[0]
        ?? null;
    const currentInstitution = currentMembership?.institution
        ?? data.institutions.find(institution => institution.status === "ACTIVE")
        ?? data.institutions[0]
        ?? null;
    const selectMembership = useCallback(membershipId => {
        if (data.memberships.some(membership => membership.id === membershipId)) {
            setSelectedMembershipId(membershipId);
            return true;
        }
        return false;
    }, [data.memberships]);

    useEffect(() => {
        if (!user?.id) return undefined;

        const supabase = createClient();
        let debounceTimer;
        const scheduleRefresh = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => refreshProfile(), 160);
        };
        let channel = supabase.channel(`profile-data-${user.id}`);
        const profileTables = [
            ["profiles", "id"],
            ["memberships", "profile_id"],
            ["user_devices", "profile_id"],
            ["guardian_student_links", "guardian_profile_id"],
        ];

        profileTables.forEach(([table, column]) => {
            ["INSERT", "UPDATE"].forEach(event => {
                channel = channel.on("postgres_changes", {
                    event,
                    schema: "public",
                    table,
                    filter: `${column}=eq.${user.id}`,
                }, scheduleRefresh);
            });
        });

        ["actor_profile_id", "subject_profile_id"].forEach(column => {
            channel = channel.on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "audit_logs",
                filter: `${column}=eq.${user.id}`,
            }, scheduleRefresh);
        });

        const institutionIds = [...new Set(data.memberships
            .map(membership => membership.institution_id)
            .filter(Boolean))];

        institutionIds.forEach(institutionId => {
            ["INSERT", "UPDATE"].forEach(event => {
                channel = channel.on("postgres_changes", {
                    event,
                    schema: "public",
                    table: "institutions",
                    filter: `id=eq.${institutionId}`,
                }, scheduleRefresh);
            });
        });

        channel.subscribe(status => {
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                console.warn("Realtime no pudo suscribirse al perfil de la cuenta.");
            }
        });

        return () => {
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [data.memberships, refreshProfile, user?.id]);

    const value = useMemo(() => ({
        ...data,
        currentMembership,
        currentInstitution,
        loading: authLoading || Boolean(user && (loadedState.userId !== user.id || loadedState.loading)),
        error: loadedState.userId === user?.id ? loadedState.error : null,
        refreshProfile,
        updateProfile,
        updateInstitution,
        selectMembership,
    }), [data, currentMembership, currentInstitution, user, authLoading, loadedState, refreshProfile, updateProfile, updateInstitution, selectMembership]);

    return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
    const context = useContext(ProfileContext);
    if (!context) throw new Error("useProfile debe usarse dentro de ProfileProvider.");
    return context;
}

export default ProfileContext;
