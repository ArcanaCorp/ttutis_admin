'use client';

import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export default function DashboardSkeleton() {
    return (
        <SkeletonTheme
            baseColor="var(--color-neutral-100)"
            highlightColor="var(--color-neutral-50)"
            borderRadius="var(--radius-sm)"
            duration={1.25}
        >
            <div className="dashboard-skeleton page-shell" aria-label="Cargando pantalla" aria-busy="true">
                <div className="flex flex-col gap-sm">
                    <Skeleton width={220} height={30} />
                    <Skeleton width="min(480px, 80%)" height={16} />
                </div>
                <div className="dashboard-skeleton__stats">
                    {Array.from({ length: 4 }, (_, index) => (
                        <section className="card" key={index}>
                            <Skeleton width="56%" height={16} />
                            <Skeleton width="38%" height={30} />
                            <Skeleton width="72%" height={13} />
                        </section>
                    ))}
                </div>
                <section className="card flex flex-col gap-md">
                    <Skeleton width={200} height={20} />
                    <Skeleton width="72%" height={15} />
                    <Skeleton count={5} height={42} />
                </section>
            </div>
        </SkeletonTheme>
    );
}
