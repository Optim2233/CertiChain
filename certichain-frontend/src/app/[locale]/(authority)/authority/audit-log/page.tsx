"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { backendText } from "@/i18n/backend-copy"
import { useAuditLog } from "@/features/accreditation"
import { TableSkeleton } from "@/shared/components/ui/skeletons"
import { Pager } from "@/shared/components/ui/pager"

const GRID_COLS = "1fr 4fr 2fr"
const EVENT_COLOR: Record<string, string> = {
  suspend: "#C0392B",
  reject: "#C0392B",
  revoke: "#C0392B",
}

function eventColor(event: string) {
  const lower = event.toLowerCase()
  for (const key in EVENT_COLOR) if (lower.includes(key)) return EVENT_COLOR[key]
  return "#191c1e"
}

export default function AuditLogPage() {
  const t = useTranslations("authority")
  const tc = useTranslations("common")
  const locale = useLocale()
  const [search, setSearch] = useState("")
  const [eventFilter, setEventFilter] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(0)
  const { data, isLoading, isError } = useAuditLog(null, page)
  const rows = data?.data.content ?? []
  // ponytail: both the search box and the event dropdown work off the loaded
  // page only - the audit-log endpoint takes neither a search nor an event
  // param, so eventTypes lists just the events present on this page. Labelled
  // in the footer rather than left to look global.
  // Upgrade path: add ?q=/?event= to GET /audit-log and filter server-side.
  const eventTypes = Array.from(new Set(rows.map((r) => r.event))).sort()
  const filtered = rows
    .filter((r) => !search || r.event.toLowerCase().includes(search.toLowerCase()))
    .filter((r) => !eventFilter || r.event === eventFilter)

  return (
    <main className="w-full px-6 py-8">
      <h2 className="font-heading m-0 mb-1 text-[32px] font-bold">{t("auditTitle")}</h2>
      <p className="m-0 mb-6 text-sm text-[#44474e]">{t("auditSub")}</p>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#75777f]">search</span>
          <input
            type="search"
            name="audit-log-search"
            autoComplete="off"
            placeholder={t("searchLogPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-[#c5c6cf] py-2.5 pl-10 pr-3.5 text-sm"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-2 rounded border px-4 py-2.5 text-sm font-semibold"
            style={{
              borderColor: eventFilter ? "#02275A" : "#c5c6cf",
              color: eventFilter ? "#02275A" : "#44474e",
              background: eventFilter ? "#eef2ff" : "#fff",
            }}
          >
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            {eventFilter || tc("filter")}
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-11 z-10 max-h-72 w-64 overflow-y-auto rounded border border-[#c5c6cf] bg-white shadow-lg">
              <button
                type="button"
                onClick={() => { setEventFilter(""); setFilterOpen(false); setPage(0) }}
                className="block w-full px-4 py-2.5 text-left text-[13px] hover:bg-[#f7f9fb]"
                style={{ color: eventFilter ? "#191c1e" : "#02275A", fontWeight: eventFilter ? 400 : 700 }}
              >
                {t("allEvents")}
              </button>
              {eventTypes.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setEventFilter(e); setFilterOpen(false); setPage(0) }}
                  className="block w-full border-t border-[#eef0f3] px-4 py-2.5 text-left text-[13px] hover:bg-[#f7f9fb]"
                  style={{ color: eventFilter === e ? "#02275A" : "#191c1e", fontWeight: eventFilter === e ? 700 : 400 }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
        <div className="grid gap-4 px-6 py-3.5" style={{ gridTemplateColumns: GRID_COLS, background: "#f2f4f6", borderBottom: "1px solid #c5c6cf" }}>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">{tc("when")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">{tc("event")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">{tc("actor")}</span>
        </div>
        {isLoading ? (
          <TableSkeleton columns={GRID_COLS} />
        ) : isError ? (
          <p className="p-6 text-sm text-[#C0392B]">
            {t("loadFailed")}
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-[#75777f]">{t("noEntries")}</p>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="grid items-start gap-4 border-b border-[#c5c6cf] px-6 py-4 last:border-0" style={{ gridTemplateColumns: GRID_COLS }}>
              <div className="text-[13px]">
                <span className="font-semibold">{new Date(a.occurredAt).toLocaleDateString(locale)}</span>{" "}
                <span className="text-[#75777f]">{new Date(a.occurredAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="m-0 text-sm font-bold" style={{ color: eventColor(a.event) }}>{backendText(tc, a.event)}</p>
              <p className="m-0 text-[13px] text-[#44474e]">{a.actorEmail ?? a.institutionId ?? tc("system")}</p>
            </div>
          ))
        )}
        <div className="px-6 py-3.5 text-xs text-[#44474e]">
          {t("showingEntries", { n: filtered.length, t: data?.data.totalElements ?? 0 })}
          {(search || eventFilter) && " " + t("filtersNote")}
        </div>
        <Pager page={data?.data} onPageChange={setPage} />
      </div>
    </main>
  )
}
