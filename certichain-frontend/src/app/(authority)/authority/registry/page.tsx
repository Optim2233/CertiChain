"use client"

import { useState } from "react"
import Link from "next/link"
import { useInstitutions } from "@/features/accreditation"
import type { InstitutionStatus } from "@/features/accreditation"

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  PENDING: { bg: "#e0e3e5", color: "#44474e", icon: "schedule", label: "Pending" },
  APPROVED: { bg: "#d8e2ff", color: "#02275A", icon: "check_circle", label: "Approved" },
  SUSPENDED: { bg: "#eef0f3", color: "#75777f", icon: "pause_circle", label: "Suspended" },
  REJECTED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: "Rejected" },
  REVOKED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: "Revoked" },
}

const FILTERS: { key: InstitutionStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "SUSPENDED", label: "Suspended" },
  { key: "REVOKED", label: "Revoked" },
]

export default function InstitutionRegistryPage() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<InstitutionStatus | "ALL">("ALL")
  const { data, isLoading, isError } = useInstitutions(filter === "ALL" ? null : filter)
  const rows = data?.data.content ?? []
  const filtered = rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()))
  const { data: pendingData } = useInstitutions("PENDING")
  const pendingCount = pendingData?.data.totalElements ?? 0

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading m-0 text-[32px] font-bold">Institution Registry</h2>
        <Link
          href="/authority/registry"
          onClick={() => setFilter("PENDING")}
          className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "#02275A" }}
        >
          <span className="material-symbols-outlined text-[18px]">schedule</span>
          {pendingCount} Pending Review
        </Link>
      </div>

      <div className="relative mb-4">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#75777f]">search</span>
        <input
          type="search"
          name="registry-search"
          autoComplete="off"
          placeholder="Search institutions..."
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
            onClick={() => setFilter(f.key)}
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
            style={filter === f.key ? { background: "#02275A", color: "#fff" } : { background: "#eef0f3", color: "#44474e" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
        <div className="grid gap-4 px-6 py-3.5" style={{ gridTemplateColumns: "3fr 2fr 2fr 2fr 1fr", background: "#f2f4f6", borderBottom: "1px solid #c5c6cf" }}>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">Name</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">Ministry</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">Status</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">Submitted</span>
          <span className="text-right text-[12px] font-bold uppercase tracking-wide text-[#44474e]">Action</span>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-[#75777f]">Loading…</p>
        ) : isError ? (
          <p className="p-6 text-sm text-[#C0392B]">
            Couldn&apos;t load institutions — you may be signed in with an account that doesn&apos;t have
            accreditation-authority access.
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-[#75777f]">No institutions match.</p>
        ) : (
          filtered.map((r) => {
            const style = STATUS_STYLE[r.status]
            const reviewable = r.status === "PENDING"
            const href = reviewable ? "/authority/registry/" + r.id + "/documents" : "/authority/registry/" + r.id
            return (
              <Link key={r.id} href={href} className="grid items-center gap-4 border-b border-[#c5c6cf] px-6 py-4 last:border-0">
                <span className="text-sm font-bold">{r.name}</span>
                <span className="text-sm text-[#44474e]">{r.ministry}</span>
                <span className="inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: style.bg, color: style.color }}>
                  <span className="material-symbols-outlined text-[13px]">{style.icon}</span>
                  {style.label}
                </span>
                <span className="text-sm text-[#44474e]">{new Date(r.appliedAt).toLocaleDateString()}</span>
                <span className="flex items-center justify-end gap-1 text-sm font-bold" style={{ color: reviewable ? "#02275A" : "#75777f" }}>
                  {reviewable ? "Review" : "View"}
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </span>
              </Link>
            )
          })
        )}
        <div className="px-6 py-3.5 text-xs text-[#44474e]">Showing {filtered.length} of {data?.data.totalElements ?? 0} institutions</div>
      </div>
    </main>
  )
}
