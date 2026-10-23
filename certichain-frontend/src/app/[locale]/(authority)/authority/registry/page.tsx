"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useInstitutions } from "@/features/accreditation"
import { TableSkeleton } from "@/shared/components/ui/skeletons"
import { Pager } from "@/shared/components/ui/pager"
import type { InstitutionStatus } from "@/features/accreditation"

const GRID_COLS = "72px 3fr 2fr 2fr 2fr 1fr"

export default function InstitutionRegistryPage() {
  const t = useTranslations("authority")
  const tc = useTranslations("common")
  const locale = useLocale()

  const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
    PENDING: { bg: "#e0e3e5", color: "#44474e", icon: "schedule", label: tc("pending") },
    APPROVED: { bg: "#d8e2ff", color: "#02275A", icon: "check_circle", label: tc("approved") },
    SUSPENDED: { bg: "#eef0f3", color: "#75777f", icon: "pause_circle", label: t("suspended") },
    REJECTED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: tc("rejected") },
    REVOKED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: t("revoked") },
  }

  const FILTERS: { key: InstitutionStatus | "ALL"; label: string }[] = [
    { key: "ALL", label: tc("all") },
    { key: "PENDING", label: t("pendingReview") },
    { key: "APPROVED", label: t("approved") },
    { key: "SUSPENDED", label: t("suspended") },
    { key: "REVOKED", label: t("revoked") },
  ]

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filter, setFilter] = useState<InstitutionStatus | "ALL">("ALL")
  const [page, setPage] = useState(0)

  // Debounce the name query so we don't fire a request per keystroke; reset to
  // page 0 whenever the term changes so results aren't hidden past the end.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isError } = useInstitutions(filter === "ALL" ? null : filter, page, 20, debouncedSearch)
  const rows = data?.data.content ?? []
  const { data: pendingData } = useInstitutions("PENDING")
  const pendingCount = pendingData?.data.totalElements ?? 0

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading m-0 text-[32px] font-bold">{t("registryTitle")}</h2>
        <Link
          href="/authority/registry"
          onClick={() => setFilter("PENDING")}
          className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "#02275A" }}
        >
          <span className="material-symbols-outlined text-[18px]">schedule</span>
          {t("pendingCount", { n: pendingCount })}
        </Link>
      </div>

      <div className="relative mb-4">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#75777f]">search</span>
        <input
          type="search"
          name="registry-search"
          autoComplete="off"
          placeholder={t("searchPh")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-[#c5c6cf] py-2.5 pl-10 pr-3.5 text-sm"
        />
      </div>

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => { setFilter(f.key); setPage(0) }}
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
            style={filter === f.key ? { background: "#02275A", color: "#fff" } : { background: "#eef0f3", color: "#44474e" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
        <div className="grid gap-4 px-6 py-3.5" style={{ gridTemplateColumns: GRID_COLS, background: "#f2f4f6", borderBottom: "1px solid #c5c6cf" }}>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">{t("regId")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">{tc("name")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">{tc("ministry")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">{tc("status")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">{tc("submitted")}</span>
          <span className="text-right text-[12px] font-bold uppercase tracking-wide text-[#44474e]">{tc("action")}</span>
        </div>
        {isLoading ? (
          <TableSkeleton columns={GRID_COLS} />
        ) : isError ? (
          <p className="p-6 text-sm text-[#C0392B]">
            {t("loadFailed")}
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[#75777f]">
            {debouncedSearch ? t("noMatchQ", { q: debouncedSearch }) : t("noMatch")}
          </p>
        ) : (
          rows.map((r) => {
            const style = STATUS_STYLE[r.status]
            const reviewable = r.status === "PENDING"
            const href = reviewable ? "/authority/registry/" + r.id + "/documents" : "/authority/registry/" + r.id
            return (
              <Link key={r.id} href={href} className="grid items-center gap-4 border-b border-[#c5c6cf] px-6 py-4 last:border-0" style={{ gridTemplateColumns: GRID_COLS }}>
                <span className="font-mono text-xs tabular-nums text-[#75777f]" title={r.id}>{r.id.slice(0, 8)}</span>
                <span className="text-sm font-bold">{r.name}</span>
                <span className="text-sm text-[#44474e]">{r.ministry}</span>
                <span className="inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: style.bg, color: style.color }}>
                  <span className="material-symbols-outlined text-[13px]">{style.icon}</span>
                  {style.label}
                </span>
                <span className="text-sm text-[#44474e]">{new Date(r.appliedAt).toLocaleDateString(locale)}</span>
                <span className="flex items-center justify-end gap-1 text-sm font-bold" style={{ color: reviewable ? "#02275A" : "#75777f" }}>
                  {reviewable ? t("review") : tc("view")}
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </span>
              </Link>
            )
          })
        )}
        <div className="px-6 py-3.5 text-xs text-[#44474e]">
          {t("showingOf", { n: rows.length, t: data?.data.totalElements ?? 0 })}
          {debouncedSearch ? t("matchingQ", { q: debouncedSearch }) : t("institutionsSuffix")}
        </div>
        <Pager page={data?.data} onPageChange={setPage} />
      </div>
    </main>
  )
}
