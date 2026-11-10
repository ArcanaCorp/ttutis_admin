'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const EMPTY_DATA = Object.freeze({});

export default function useInstitutionResource(
    loader,
    institutionId,
    emptyData = EMPTY_DATA,
) {
    const requestIdRef = useRef(0);
    const [state, setState] = useState({ institutionId: null, loading: false, error: null, data: emptyData });

    useEffect(() => {
        if (!institutionId) return undefined;
        let active = true;
        const requestId = ++requestIdRef.current;

        loader(institutionId).then(data => {
            if (active && requestId === requestIdRef.current) {
                setState({ institutionId, loading: false, error: null, data });
            }
        }).catch(error => {
            if (active && requestId === requestIdRef.current) {
                setState({ institutionId, loading: false, error, data: emptyData });
            }
        });

        return () => {
            active = false;
            requestIdRef.current += 1;
        };
    }, [loader, institutionId, emptyData]);

    const refresh = useCallback(async ({ silent = false } = {}) => {
        if (!institutionId) return { data: emptyData, error: new Error("No hay una institución activa.") };
        const requestId = ++requestIdRef.current;
        if (!silent) {
            setState(current => ({
                institutionId,
                loading: true,
                error: null,
                data: current.institutionId === institutionId ? current.data : emptyData,
            }));
        }
        try {
            const data = await loader(institutionId);
            if (requestId === requestIdRef.current) setState({ institutionId, loading: false, error: null, data });
            return { data, error: null };
        } catch (error) {
            if (requestId === requestIdRef.current) {
                setState(current => silent && current.institutionId === institutionId
                    ? { ...current, loading: false, error }
                    : { institutionId, loading: false, error, data: emptyData });
            }
            return { data: emptyData, error };
        }
    }, [emptyData, institutionId, loader]);

    useEffect(() => {
        if (!institutionId) return undefined;

        const supabase = createClient();
        let debounceTimer;
        const scheduleRefresh = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => refresh({ silent: true }), 180);
        };
        const channel = supabase
            .channel(`institution-data-${institutionId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "institution_change_pulses",
                filter: `institution_id=eq.${institutionId}`,
            }, scheduleRefresh)
            .subscribe(status => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    console.warn(`Realtime no pudo suscribirse a la institución ${institutionId}.`);
                }
            });

        return () => {
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [institutionId, refresh]);

    const isCurrentInstitution = Boolean(institutionId && state.institutionId === institutionId);
    return {
        data: isCurrentInstitution ? state.data : emptyData,
        loading: Boolean(institutionId && (!isCurrentInstitution || state.loading)),
        error: isCurrentInstitution ? state.error : null,
        refresh,
    };
}
