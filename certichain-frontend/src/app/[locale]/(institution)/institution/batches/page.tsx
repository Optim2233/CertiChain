"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { useBatches, useBatchMembers, useRevokeBatch, useUnrevokeBatch } from "@/features/institution"
import type { BatchSummary } from "@/features/institution"
import { TableSkeleton } from "@/shared/components/ui/skeletons"
import { Pager } from "@/shared/components/ui/pager"

const GRID_COLS = "1.2fr 1.4fr 1fr 1fr 1.2fr"
const PAGE_SIZE = 10

type BatchFilter = "ALL" | "ACTIVE" | "REVOKED"

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

export default function BatchesPage() {
  const t = useTranslations("institution")
  const tc = useTranslations("common")
  const locale = useLocale()
  const { data, isLoading, isError } = useBatches()
  const batches = data?.data ?? []
  const revoke = useRevokeBatch()
  const unrevoke = useUnrevokeBatch()

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<BatchFilter>("ALL")
  const [page, setPage] = useState(0)

  // The endpoint returns every batch in one payload, so search and filter run
  // client-side - no round trip per keystroke, same as the institution directory.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return batches.filter((b) => {
      const name = (b.batchName ?? "").toLowerCase()
      if (q && !name.includes(q)) return false
      // "Active" = anything still issuing; a partly-revoked batch is still active.
      if (filter === "ACTIVE") return b.revoked < b.total
      if (filter === "REVOKED") return b.revoked >= b.total
      return true
    })
  }, [batches, search, filter])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  // Deleting or filtering can strand you past the last page - clamp rather than
  // render an empty table.
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = visible.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const pageEnvelope = {
    number: safePage,
    totalPages,
    totalElements: visible.length,
    first: safePage === 0,
    last: safePage >= totalPages - 1,
  }

  const [revokeTarget, setRevokeTarget] = useState<BatchSummary | null>(null)
  const [unrevokeTarget, setUnrevokeTarget] = useState<BatchSummary | null>(null)
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const activeTarget = revokeTarget ?? unrevokeTarget
  const { data: membersData, isLoading: membersLoading } = useBatchMembers(activeTarget?.batchId ?? null)
  const members = (membersData?.data ?? []).filter((m) =>
    revokeTarget ? m.status !== "REVOKED" : m.status === "REVOKED"
  )

  useEffect(() => {
    // Default to "everyone eligible" selected — matches the old whole-batch button's
    // behavior unless the user deliberately unchecks someone.
    setSelected(new Set(members.map((m) => m.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersData, revokeTarget, unrevokeTarget])

  const reasonValid = reason.trim().length > 0
  const selectionValid = selected.size > 0
  const showError = touched && !reasonValid
  const showSelectionError = touched && !selectionValid

  function closeModal() {
    setRevokeTarget(null)
    setUnrevokeTarget(null)
    setReason("")
    setTouched(false)
    setSelected(new Set())
  }

  function toggleMember(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function confirmRevoke() {
    setTouched(true)
    if (!reasonValid || !revokeTarget || !selectionValid) return
    const allSelected = selected.size === members.length
    revoke.mutate(
      { batchId: revokeTarget.batchId, reason, credentialIds: allSelected ? undefined : [...selected] },
      {
        onSuccess: (res) => {
          toast.success(t("revokeBatchToast", { revoked: res.data.revoked, already: res.data.alreadyRevoked ?? 0 }))
          closeModal()
        },
        onError: (e: unknown) => { console.error(e); toast.error(t("revokeToastFail")) },
      }
    )
  }

  function confirmUnrevoke() {
    setTouched(true)
    if (!unrevokeTarget || !selectionValid) return
    const allSelected = selected.size === members.length
    unrevoke.mutate(
      { batchId: unrevokeTarget.batchId, credentialIds: allSelected ? undefined : [...selected] },
      {
        onSuccess: (res) => {
          toast.success(t("unrevokeBatchToast", { restored: res.data.restored, already: res.data.alreadyActive ?? 0 }))
          // Surfaced separately: skipping these is the one outcome the user has to act on.
          if (res.data.superseded) toast.warning(t("unrevokeSupersededToast", { n: res.data.superseded }))
          closeModal()
        },
        onError: (e: unknown) => { console.error(e); toast.error(t("restoreToastFail")) },
      }
    )
  }

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-6">
        <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">{t("batchesTitle")}</h2>
        <p className="m-0 text-lg text-[#44474e]">
          {t("batchesSub")}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-[360px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#75777f]">search</span>
          <input
            type="search"
            name="batch-search"
            autoComplete="off"
            aria-label={t("batchSearchPh")}
            placeholder={t("batchSearchPh")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="w-full rounded-lg border border-[#c5c6cf] bg-white py-2.5 pl-10 pr-3.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: "ALL", label: tc("all") },
            { key: "ACTIVE", label: tc("active") },
            { key: "REVOKED", label: tc("revoked") },
          ] as const).map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => { setFilter(f.key); setPage(0) }}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
              style={filter === f.key ? { background: "#02275A", color: "#fff" } : { background: "#eef0f3", color: "#44474e" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
        <div
          className="grid gap-4 border-b border-[#c5c6cf] bg-[#02275A] px-4 py-3 text-xs uppercase tracking-wide text-white"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <span>{t("batchNameCol")}</span>
          <span>{tc("issued")}</span>
          <span>{tc("credential")}</span>
          <span>{tc("status")}</span>
          <span />
        </div>

        {isLoading ? (
          <TableSkeleton columns={GRID_COLS} />
        ) : isError ? (
          <p className="px-4 py-8 text-sm text-[#C0392B]">{t("loadBatchesFailed")}</p>
        ) : batches.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[#44474e]">{t("noBatches")}</p>
        ) : pageRows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[#44474e]">{t("batchNoMatch")}</p>
        ) : (
          pageRows.map((b) => {
            const fullyRevoked = b.revoked >= b.total
            return (
              <div
                key={b.batchId}
                className="grid items-center gap-4 border-b border-[#c5c6cf] px-4 py-3 text-sm last:border-b-0"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <span className="truncate font-semibold">{b.batchName || t("untitledBatch")}</span>
                <span className="text-[#44474e]">{fmtDate(b.issuedAt, locale)}</span>
                <span className="font-semibold">{b.total}</span>
                <span
                  className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={
                    fullyRevoked
                      ? { background: "#ffdad6", color: "#C0392B" }
                      : b.revoked > 0
                        ? { background: "#fff3d6", color: "#a5730f" }
                        : { background: "rgba(16,185,129,0.1)", color: "#0d9668" }
                  }
                >
                  {fullyRevoked
                    ? tc("revoked")
                    : b.revoked > 0
                      ? `${t("batchPartial")} · ${b.revoked}/${b.total}`
                      : tc("active")}
                </span>
                <span className="flex justify-end gap-2 text-right">
                  {!fullyRevoked && (
                    <button
                      type="button"
                      onClick={() => setRevokeTarget(b)}
                      className="rounded border border-[#c5c6cf] bg-white px-3 py-1.5 text-xs font-semibold text-[#C0392B]"
                    >
                      {t("revokeBatch")}
                    </button>
                  )}
                  {b.revoked > 0 && (
                    <button
                      type="button"
                      onClick={() => setUnrevokeTarget(b)}
                      className="rounded border border-[#c5c6cf] bg-white px-3 py-1.5 text-xs font-semibold text-[#0d9668]"
                    >
                      {t("unrevokeBatch")}
                    </button>
                  )}
                </span>
              </div>
            )
          })
        )}

        <Pager page={pageEnvelope} onPageChange={setPage} />
      </div>

      {revokeTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[480px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">
              {t("revokeBatchTitle", { n: revokeTarget.total - revokeTarget.revoked })}
            </h3>
            <p className="mb-4 text-sm text-[#44474e]">
              {t("revokeBatchWarn")}
            </p>

            <label className="mb-1.5 block text-[13px] font-bold">{t("selectRecipients")}</label>
            <div className="mb-1 max-h-[180px] overflow-y-auto rounded border" style={{ borderColor: showSelectionError ? "#C0392B" : "#c5c6cf" }}>
              {membersLoading ? (
                <p className="px-3.5 py-3 text-xs text-[#75777f]">{tc("loading")}</p>
              ) : members.length === 0 ? (
                <p className="px-3.5 py-3 text-xs text-[#75777f]">{t("noBatches")}</p>
              ) : (
                members.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-2.5 border-b px-3.5 py-2 text-sm last:border-b-0" style={{ borderColor: "#eef0f3" }}>
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleMember(m.id)}
                      className="size-4 accent-[#C0392B]"
                    />
                    <span className="truncate">{m.graduateEmail}</span>
                  </label>
                ))
              )}
            </div>
            <div className="mb-4 flex items-center justify-between">
              {showSelectionError ? (
                <p className="text-xs text-[#C0392B]">{t("selectAtLeastOne")}</p>
              ) : <span />}
              <button type="button" onClick={() => setSelected(new Set(members.map((m) => m.id)))} className="text-xs font-semibold" style={{ color: "#0462BA" }}>
                {t("selectAll")}
              </button>
            </div>

            <label className="mb-1.5 block text-[13px] font-bold">{t("revokeReason")}</label>
            <textarea
              rows={3}
              placeholder={t("revokeReasonPh")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-1 w-full resize-none rounded border px-3.5 py-2.5 text-sm"
              style={{ borderColor: showError ? "#C0392B" : "#c5c6cf" }}
            />
            {showError && <p className="mb-3.5 text-xs text-[#C0392B]">{t("reasonNeeded")}</p>}
            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={confirmRevoke}
                disabled={revoke.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#C0392B" }}
              >
                {revoke.isPending ? t("revokingBatch") : t("revokeBatch")}
              </button>
            </div>
          </div>
        </div>
      )}

      {unrevokeTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[480px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">
              {t("unrevokeBatchTitle", { n: unrevokeTarget.revoked })}
            </h3>
            <p className="mb-4 text-sm text-[#44474e]">
              {t("unrevokeBatchWarn")}
            </p>

            <label className="mb-1.5 block text-[13px] font-bold">{t("selectRestoreRecipients")}</label>
            <div className="mb-1 max-h-[180px] overflow-y-auto rounded border" style={{ borderColor: showSelectionError ? "#C0392B" : "#c5c6cf" }}>
              {membersLoading ? (
                <p className="px-3.5 py-3 text-xs text-[#75777f]">{tc("loading")}</p>
              ) : members.length === 0 ? (
                <p className="px-3.5 py-3 text-xs text-[#75777f]">{t("noBatches")}</p>
              ) : (
                members.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-2.5 border-b px-3.5 py-2 text-sm last:border-b-0" style={{ borderColor: "#eef0f3" }}>
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleMember(m.id)}
                      className="size-4 accent-[#0d9668]"
                    />
                    <span className="truncate">{m.graduateEmail}</span>
                  </label>
                ))
              )}
            </div>
            <div className="mb-4 flex items-center justify-between">
              {showSelectionError ? (
                <p className="text-xs text-[#C0392B]">{t("selectAtLeastOne")}</p>
              ) : <span />}
              <button type="button" onClick={() => setSelected(new Set(members.map((m) => m.id)))} className="text-xs font-semibold" style={{ color: "#0462BA" }}>
                {t("selectAll")}
              </button>
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={confirmUnrevoke}
                disabled={unrevoke.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#0d9668" }}
              >
                {unrevoke.isPending ? t("unrevokingBatch") : t("unrevokeBatch")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
