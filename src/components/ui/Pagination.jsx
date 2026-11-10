'use client';

import Button from "@/components/ui/Button";

export default function Pagination({ page, pageCount, from, to, total, onPageChange }) {
    if (total <= 0) return null;

    return (
        <nav
            className="flex items-center justify-between gap-md border-t px-md py-sm"
            aria-label="Paginación de resultados"
        >
            <p className="text-xs text-secondary" aria-live="polite">
                Mostrando {from}–{to} de {total}
            </p>
            <div className="flex items-center gap-xs">
                <Button
                    size="xs"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    Anterior
                </Button>
                <span className="min-w-16 text-center text-xs text-secondary">
                    Página {page} de {pageCount}
                </span>
                <Button
                    size="xs"
                    variant="outline"
                    disabled={page >= pageCount}
                    onClick={() => onPageChange(page + 1)}
                >
                    Siguiente
                </Button>
            </div>
        </nav>
    );
}
