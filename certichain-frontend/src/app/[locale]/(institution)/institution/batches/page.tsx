"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { useBatches, useRevokeBatch } from "@/features/institution"
import type { BatchSummary } from "@/features/institution"
import { TableSkeleton } from "@/shared/components/ui/skeletons"

const GRID_COLS = "1.4fr 1fr 1fr 0.8fr"

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

  const [revokeTarget, setRevokeTarget] = useState<BatchSummary | null>(null)
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)

  const reasonValid = reason.trim().length > 0
  const showError = touched && !reasonValid

  function closeModal() {
    setRevokeTarget(null)
    setReason("")
    setTouched(false)
  }

  function confirmRevoke() {
    setTouched(true)
    if (!reasonValid || !revokeTarget) return
    revoke.mutate(
      { batchId: revokeTarget.batchId, reason },
      {
        onSuccess: (res) => {
          toast.success(t("revokeBatchToast", { revoked: res.data.revoked, already: res.data.alreadyRevoked ?? 0 }))
          closeModal()
        },
          onError: (e: unknown) => { console.error(e); toast.error(t("revokeToastFail")) },
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

      <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
        <div
          className="grid gap-4 border-b border-[#c5c6cf] bg-[#02275A] px-4 py-3 text-xs uppercase tracking-wide text-white"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <span>{tc("issued")}</span>
          <span>{tc("credential")}</span>
          <span>{tc("revoked")}</span>
          <span />
        </div>

        {isLoading ? (
          <TableSkeleton columns={GRID_COLS} />
        ) : isError ? (
          <p className="px-4 py-8 text-sm text-[#C0392B]">{t("loadBatchesFailed")}</p>
        ) : batches.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[#44474e]">{t("noBatches")}</p>
        ) : (
          batches.map((b) => {
            const fullyRevoked = b.revoked >= b.total
            return (
              <div
                key={b.batchId}
                className="grid items-center gap-4 border-b border-[#c5c6cf] px-4 py-3 text-sm last:border-b-0"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
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
                  {b.revoked} / {b.total}
                </span>
                <span className="text-right">
                  {!fullyRevoked && (
                    <button
                      type="button"
                      onClick={() => setRevokeTarget(b)}
                      className="rounded border border-[#c5c6cf] bg-white px-3 py-1.5 text-xs font-semibold text-[#C0392B]"
                    >
                      {t("revokeBatch")}
                    </button>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>

      {revokeTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">
              {t("revokeBatchTitle", { n: revokeTarget.total - revokeTarget.revoked })}
            </h3>
            <p className="mb-5 text-sm text-[#44474e]">
              {t("revokeBatchWarn")}
            </p>
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
    </main>
  )
}
