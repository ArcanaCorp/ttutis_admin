'use client';

import { useMemo, useState } from "react";
import { paginate } from "@/lib/pagination.mjs";

export default function usePagination(items, pageSize = 25) {
    const [requestedPage, setRequestedPage] = useState(1);
    const result = useMemo(
        () => paginate(items, requestedPage, pageSize),
        [items, pageSize, requestedPage],
    );

    return { ...result, setPage: setRequestedPage };
}
