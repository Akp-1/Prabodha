/**
 * Reusable skeleton shimmer components for loading states.
 *
 * Usage:
 *   <Skeleton className="h-4 w-48" />           — single line placeholder
 *   <SkeletonCard />                              — stat card placeholder
 *   <SkeletonTable rows={5} cols={4} />           — table placeholder
 *   <SkeletonList items={3} />                    — list placeholder
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Stat card skeleton — matches the StatCard component layout. */
export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** Table skeleton — renders a header row + data rows with shimmer cells. */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={`r-${ri}`} className="flex gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
          {Array.from({ length: cols }).map((_, ci) => (
            <Skeleton key={`r-${ri}-c-${ci}`} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** List skeleton — renders multiple line-item placeholders. */
export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={`li-${i}`} className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dashboard stat cards skeleton — typically 4 cards in a grid. */
export function SkeletonDashboard({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={`sc-${i}`} />
      ))}
    </div>
  );
}
