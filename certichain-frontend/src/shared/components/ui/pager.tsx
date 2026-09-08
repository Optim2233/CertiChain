"use client"

import { useTranslations } from "next-intl"
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
  const t = useTranslations("common")
  if (!page || page.totalPages <= 1) return null

  const btn =
    "rounded border border-[#c5c6cf] px-3 py-1.5 text-sm font-semibold text-[#02275A] disabled:opacity-40 disabled:cursor-not-allowed"

  return (
    <nav
      aria-label={t("pagination")}
      className={`flex items-center justify-between border-t border-[#c5c6cf] px-6 py-3 ${className}`}
    >
      <span className="text-xs text-[#75777f]">
        {t("pageOf", { n: page.number + 1, m: page.totalPages, t: page.totalElements })}
      </span>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={page.first} onClick={() => onPageChange(page.number - 1)}>
          {t("previous")}
        </button>
        <button type="button" className={btn} disabled={page.last} onClick={() => onPageChange(page.number + 1)}>
          {t("next")}
        </button>
      </div>
    </nav>
  )
}
