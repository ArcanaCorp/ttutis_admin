'use client';

import { useCallback, useEffect, useRef, useState } from "react";

const EMPTY_DATA = Object.freeze({});

export default function useInstitutionResource(loader, institutionId, emptyData = EMPTY_DATA) {
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

    const refresh = useCallback(async () => {
        if (!institutionId) return { data: emptyData, error: new Error("No hay una institución activa.") };
        const requestId = ++requestIdRef.current;
        setState(current => ({
            institutionId,
            loading: true,
            error: null,
            data: current.institutionId === institutionId ? current.data : emptyData,
        }));
        try {
            const data = await loader(institutionId);
            if (requestId === requestIdRef.current) setState({ institutionId, loading: false, error: null, data });
            return { data, error: null };
        } catch (error) {
            if (requestId === requestIdRef.current) setState({ institutionId, loading: false, error, data: emptyData });
            return { data: emptyData, error };
        }
    }, [emptyData, institutionId, loader]);

    const isCurrentInstitution = Boolean(institutionId && state.institutionId === institutionId);
    return {
        data: isCurrentInstitution ? state.data : emptyData,
        loading: Boolean(institutionId && (!isCurrentInstitution || state.loading)),
        error: isCurrentInstitution ? state.error : null,
        refresh,
    };
}
