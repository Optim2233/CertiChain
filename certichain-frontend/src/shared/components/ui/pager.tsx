"use client"

import type { Page } from "@/shared/types/types"

/**
 * Prev/next control for the Spring Page envelopes the backend already returns.
 * Boundaries come off page.first/page.last rather than being recomputed here.
 * Renders nothing for a single page of results.
 */
export function Pager({
  page,
  onPageChange,
  className = "",
}: {
  page: Pick<Page<unknown>, "number" | "totalPages" | "totalElements" | "first" | "last"> | undefined
  onPageChange: (next: number) => void
  className?: string
}) {
  if (!page || page.totalPages <= 1) return null

  const btn =
    "rounded border border-[#c5c6cf] px-3 py-1.5 text-sm font-semibold text-[#02275A] disabled:opacity-40 disabled:cursor-not-allowed"

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-between border-t border-[#c5c6cf] px-6 py-3 ${className}`}
    >
      <span className="text-xs text-[#75777f]">
        Page {page.number + 1} of {page.totalPages} · {page.totalElements} total
      </span>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={page.first} onClick={() => onPageChange(page.number - 1)}>
          Previous
        </button>
        <button type="button" className={btn} disabled={page.last} onClick={() => onPageChange(page.number + 1)}>
          Next
        </button>
      </div>
    </nav>
  )
}
