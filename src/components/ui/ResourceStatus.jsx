import Skeleton from "react-loading-skeleton";

export default function ResourceStatus({ loading, error, onRetry }) {
    if (loading) {
        return <div className="flex flex-col gap-xs" aria-live="polite" aria-busy="true"><Skeleton height={18} width={220} /><Skeleton height={14} width={320} /></div>;
    }
    if (!error) return null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-sm border radius-md bg-error p-md" role="alert">
            <p className="text-sm text-error-foreground">No se pudieron cargar los datos de esta institución: {error.message}</p>
            {onRetry && <button type="button" className="text-sm font-semibold text-error-foreground underline" onClick={onRetry}>Reintentar</button>}
        </div>
    );
}
