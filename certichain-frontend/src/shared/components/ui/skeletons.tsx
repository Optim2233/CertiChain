import { Skeleton } from "@/shared/components/ui/skeleton"

/**
 * Rows shaped like the grid tables used across the portals. Pass the same
 * gridTemplateColumns string the real table uses so the skeleton occupies the
 * exact final layout and nothing jumps when data lands.
 */
export function TableSkeleton({ rows = 8, columns }: { rows?: number; columns: string }) {
  const colCount = columns.trim().split(/\s+/).length

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid items-center gap-4 border-t border-[#c5c6cf] px-6 py-3.5"
          style={{ gridTemplateColumns: columns }}
        >
          {Array.from({ length: colCount }).map((_, c) => (
            <Skeleton key={c} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Stat-card row / card grid placeholder. */
export function CardGridSkeleton({ count = 3, columns = 3, height = 200 }: { count?: number; columns?: number; height?: number }) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="rounded-2xl" style={{ height }} />
      ))}
    </div>
  )
}

/** Single inline value still resolving (e.g. an email on a Settings page). */
export function TextSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className ?? "h-4 w-40"} />
}
