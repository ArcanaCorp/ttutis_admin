export function paginate(items, requestedPage = 1, pageSize = 25) {
    const list = Array.isArray(items) ? items : [];
    const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 25;
    const pageCount = Math.max(1, Math.ceil(list.length / safePageSize));
    const page = Math.min(pageCount, Math.max(1, Number(requestedPage) || 1));
    const start = (page - 1) * safePageSize;

    return {
        items: list.slice(start, start + safePageSize),
        page,
        pageCount,
        pageSize: safePageSize,
        total: list.length,
        from: list.length ? start + 1 : 0,
        to: Math.min(start + safePageSize, list.length),
    };
}

export async function fetchAllPages(
    fetchPage,
    { pageSize = 500, maxRows = 250000 } = {},
) {
    if (typeof fetchPage !== "function") {
        throw new TypeError("fetchPage debe ser una función.");
    }

    const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 500;
    const safeMaxRows = Number.isInteger(maxRows) && maxRows >= safePageSize
        ? maxRows
        : 250000;
    const rows = [];

    for (let from = 0; from < safeMaxRows; from += safePageSize) {
        const to = Math.min(from + safePageSize - 1, safeMaxRows - 1);
        const { data, error } = await fetchPage({ from, to });

        if (error) throw error;

        const pageRows = Array.isArray(data) ? data : [];
        rows.push(...pageRows);

        if (pageRows.length < to - from + 1) return rows;
    }

    throw new Error(`La consulta superó el máximo seguro de ${safeMaxRows} registros.`);
}
