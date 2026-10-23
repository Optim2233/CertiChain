"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useAllDisputes, useFlagCredential, useTimeline, useWithdrawDispute } from "@/features/graduate"
import { TableSkeleton } from "@/shared/components/ui/skeletons"
import { credentialSubtitle, credentialTitle } from "@/shared/components/credential-card"
import { splitDisputeReason } from "@/shared/lib/dispute-reason"
import { toast } from "sonner"

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string; key: "underReview" | "upheld" | "dismissed" | "withdrawn" }> = {
  OPEN: { bg: "#fff3d6", color: "#a5730f", icon: "schedule", key: "underReview" },
  UPHELD: { bg: "rgba(192,57,43,0.1)", color: "#C0392B", icon: "check_circle", key: "upheld" },
  DISMISSED: { bg: "#eef0f3", color: "#75777f", icon: "cancel", key: "dismissed" },
  WITHDRAWN: { bg: "#eef0f3", color: "#75777f", icon: "undo", key: "withdrawn" },
}

const GRID_COLS = "2.2fr 1.7fr 1fr 1.1fr 1.2fr"

/** A dispute has something to show in the outcome panel once the institution has ruled. */
function hasOutcome(d: { status: string; resolutionNote: string | null; resolvedAt: string | null }) {
  return d.status !== "OPEN" && d.status !== "WITHDRAWN" && Boolean(d.resolutionNote || d.resolvedAt)
}

function OutcomeToggle({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded text-xs font-semibold text-[#44474e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0462BA]"
    >
      <span className="underline underline-offset-4">{label}</span>
      <span
        aria-hidden="true"
        className={`material-symbols-outlined w-4 shrink-0 text-[16px] leading-none transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
      >
        expand_more
      </span>
    </button>
  )
}

export default function GraduateDisputesPage() {
  const t = useTranslations("graduate")
  const tc = useTranslations("common")
  const locale = useLocale()
  const { data, isLoading, isError, refetch } = useAllDisputes()
  const disputes = data?.data ?? []
  const { data: timelineData } = useTimeline()
  const credentials = timelineData?.data ?? []
  const flagCredential = useFlagCredential()
  const withdrawDispute = useWithdrawDispute()

  const [open, setOpen] = useState(false)
  // Single-open accordion for the resolution panel, same shape as share/[token].
  const [expanded, setExpanded] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [credentialId, setCredentialId] = useState("")
  const [reason, setReason] = useState("")
  const [explain, setExplain] = useState("")
  const [touched, setTouched] = useState(false)

  const valid = credentialId.length > 0 && reason.trim().length > 0
  const showError = touched && !valid

  function submit() {
    setTouched(true)
    if (!valid) return
    flagCredential.mutate(
      { id: credentialId, reason: explain ? reason + ": " + explain : reason },
      {
        onSuccess: () => setSubmitted(true),
        onError: () => toast.error(t("disputeAlreadyOpen")),
      }
    )
  }

  const openCredentialIds = new Set(disputes.filter((d) => d.status === "OPEN").map((d) => d.credentialId))
  const eligibleCredentials = credentials.filter((c) => !openCredentialIds.has(c.id))

  function closeModal() {
    setOpen(false)
    setSubmitted(false)
    setCredentialId("")
    setReason("")
    setExplain("")
    setTouched(false)
  }

  function WithdrawButton({ dispute }: { dispute: (typeof disputes)[number] }) {
    const isThisPending = withdrawDispute.isPending && withdrawDispute.variables === dispute.id
    return (
      <button
        type="button"
        onClick={() =>
          withdrawDispute.mutate(dispute.id, {
            onSuccess: () => toast.success(t("withdrawSuccess")),
            onError: () => toast.error(t("withdrawFailed")),
          })
        }
        disabled={withdrawDispute.isPending}
        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded text-xs font-semibold text-[#44474e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0462BA] disabled:opacity-50"
      >
        <span className="underline underline-offset-4">
          {isThisPending ? t("withdrawing") : t("withdrawDispute")}
        </span>
        {/* Empty lane matching OutcomeToggle's chevron, so both labels right-align. */}
        <span aria-hidden="true" className="w-4 shrink-0" />
      </button>
    )
  }

  /**
   * The institution's verdict. Previously this was an unlabelled bare line under the row,
   * which read as part of the graduate's own filing and broke the grid's rhythm.
   *
   * Height animates via grid-template-rows 0fr -> 1fr: the CSS-only way to transition to
   * an auto height, so no JS measurement and no library.
   */
  function OutcomePanel({
    dispute,
    open: isOpen,
    pad,
  }: {
    dispute: (typeof disputes)[number]
    open: boolean
    pad: string
  }) {
    if (!hasOutcome(dispute)) return null
    const style = STATUS_STYLE[dispute.status] ?? STATUS_STYLE.OPEN
    return (
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className={`${pad} pb-4`}>
            <div
              className="rounded-md border-l-2 bg-[#f7f9fb] px-4 py-3"
              style={{ borderLeftColor: style.color }}
            >
              <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: style.color }}>
                  {t("disputeOutcome")}
                </span>
                {dispute.resolvedAt && (
                  <span className="text-[11px] text-[#75777f]">
                    {t("disputeResolvedOn", { date: new Date(dispute.resolvedAt).toLocaleDateString(locale) })}
                  </span>
                )}
              </div>
              {dispute.resolutionNote ? (
                <>
                  <p className="m-0 text-[13px] leading-relaxed text-[#191c1e]">{dispute.resolutionNote}</p>
                  <p className="m-0 mt-1.5 text-[11px] text-[#75777f]">{t("disputeFromInstitution")}</p>
                </>
              ) : (
                <p className="m-0 text-[13px] italic text-[#75777f]">{t("disputeNoNote")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const underReview = disputes.filter((d) => d.status === "OPEN").length
  const upheld = disputes.filter((d) => d.status === "UPHELD").length
  const dismissed = disputes.filter((d) => d.status === "DISMISSED").length

  const stats = [
    { icon: "schedule", iconBg: "#fff3d6", iconColor: "#a5730f", value: underReview, label: tc("underReview") },
    { icon: "check_circle", iconBg: "rgba(192,57,43,0.1)", iconColor: "#C0392B", value: upheld, label: tc("upheld") },
    { icon: "cancel", iconBg: "#eef0f3", iconColor: "#75777f", value: dismissed, label: tc("dismissed") },
  ]

  return (
    <main className="w-full px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">{t("disputesTitle")}</h2>
          <p className="m-0 mb-6 max-w-[600px] text-sm text-[#44474e]">
            {t("disputesSub")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "#C0392B" }}
        >
          <span className="material-symbols-outlined text-[18px]">flag</span>
          {t("raiseDispute")}
        </button>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        {stats.map((st) => (
          <div key={st.label} className="rounded-lg border border-[#c5c6cf] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
            <div className="mb-2.5 flex size-8 items-center justify-center rounded-lg" style={{ background: st.iconBg }}>
              <span className="material-symbols-outlined text-[18px]" style={{ color: st.iconColor }}>
                {st.icon}
              </span>
            </div>
            <p className="font-heading m-0 text-2xl font-extrabold">{st.value}</p>
            <p className="m-0 mt-0.5 text-xs text-[#75777f]">{st.label}</p>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-[#c5c6cf] bg-white sm:block">
        <div className="grid gap-4 px-6 py-3.5" style={{ gridTemplateColumns: GRID_COLS, background: "#02275A" }}>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("credential")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("reason")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("filed")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("status")}</span>
          <span />
        </div>
        {isLoading ? (
          <TableSkeleton columns={GRID_COLS} />
        ) : isError ? (
          <div className="flex items-center gap-3 p-6 text-sm text-[#44474e]">
            <span>{tc("errorLabel")}</span>
            <button type="button" onClick={() => refetch()} className="font-semibold underline" style={{ color: "#02275A" }}>
              {tc("retry")}
            </button>
          </div>
        ) : disputes.length === 0 ? (
          <p className="p-6 text-sm text-[#75777f]">{t("noDisputes")}</p>
        ) : (
          disputes.map((d) => {
            const cred = credentials.find((c) => c.id === d.credentialId)
            const style = STATUS_STYLE[d.status] ?? STATUS_STYLE.OPEN
            const reason = splitDisputeReason(d.reason, t)
            const isOpen = expanded === d.id
            return (
              <div key={d.id} className="border-t border-[#c5c6cf]">
                <div className="grid items-start gap-4 px-6 py-4" style={{ gridTemplateColumns: GRID_COLS }}>
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-semibold">
                      {cred
                        ? credentialTitle(cred, cred.type === "CERTIFICATE" ? tc("certificate") : tc("activityRecord"))
                        : tc("credential")}
                    </p>
                    {cred && (
                      <p className="m-0 mt-0.5 truncate text-xs text-[#75777f]">{credentialSubtitle(cred)}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-[13px] text-[#44474e]">{reason.category}</p>
                    {reason.detail && (
                      <p className="m-0 mt-0.5 line-clamp-2 text-xs text-[#75777f]">{reason.detail}</p>
                    )}
                  </div>
                  <span className="text-[13px] text-[#44474e]">{new Date(d.createdAt).toLocaleDateString(locale)}</span>
                  <span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: style.bg, color: style.color }}
                    >
                      <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                      {tc(style.key)}
                    </span>
                  </span>
                  <div className="flex justify-end">
                    {d.status === "OPEN" ? (
                      <WithdrawButton dispute={d} />
                    ) : hasOutcome(d) ? (
                      <OutcomeToggle open={isOpen} label={t("disputeViewOutcome")} onClick={() => setExpanded(isOpen ? null : d.id)} />
                    ) : null}
                  </div>
                </div>
                <OutcomePanel dispute={d} open={isOpen} pad="px-6" />
              </div>
            )
          })
        )}
      </div>

      {/* Under sm the five columns share ~343px, so the same rows render as cards. */}
      <div className="flex flex-col gap-3 sm:hidden">
        {isLoading ? (
          <p className="rounded-lg border border-[#c5c6cf] bg-white p-6 text-sm text-[#75777f]">{tc("loading")}</p>
        ) : isError ? (
          <div className="flex items-center gap-3 rounded-lg border border-[#c5c6cf] bg-white p-6 text-sm text-[#44474e]">
            <span>{tc("errorLabel")}</span>
            <button type="button" onClick={() => refetch()} className="font-semibold underline" style={{ color: "#02275A" }}>
              {tc("retry")}
            </button>
          </div>
        ) : disputes.length === 0 ? (
          <p className="rounded-lg border border-[#c5c6cf] bg-white p-6 text-sm text-[#75777f]">{t("noDisputes")}</p>
        ) : (
          disputes.map((d) => {
            const cred = credentials.find((c) => c.id === d.credentialId)
            const style = STATUS_STYLE[d.status] ?? STATUS_STYLE.OPEN
            const reason = splitDisputeReason(d.reason, t)
            const isOpen = expanded === d.id
            return (
              <div key={d.id} className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-semibold">
                        {cred
                          ? credentialTitle(cred, cred.type === "CERTIFICATE" ? tc("certificate") : tc("activityRecord"))
                          : tc("credential")}
                      </p>
                      {cred && <p className="m-0 mt-0.5 text-xs text-[#75777f]">{credentialSubtitle(cred)}</p>}
                    </div>
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: style.bg, color: style.color }}
                    >
                      <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                      {tc(style.key)}
                    </span>
                  </div>
                  <p className="m-0 text-[13px] text-[#44474e]">{reason.category}</p>
                  {reason.detail && <p className="m-0 mt-0.5 text-xs text-[#75777f]">{reason.detail}</p>}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-[#75777f]">
                      {new Date(d.createdAt).toLocaleDateString(locale)}
                    </span>
                    {d.status === "OPEN" ? (
                      <WithdrawButton dispute={d} />
                    ) : hasOutcome(d) ? (
                      <OutcomeToggle open={isOpen} label={t("disputeViewOutcome")} onClick={() => setExpanded(isOpen ? null : d.id)} />
                    ) : null}
                  </div>
                </div>
                <OutcomePanel dispute={d} open={isOpen} pad="px-4" />
              </div>
            )
          })
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(11,20,38,0.5)] p-4">
          <div className="w-[420px] rounded-xl bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,.3)]">
            {submitted ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full" style={{ background: "rgba(16,185,129,0.15)" }}>
                  <span className="material-symbols-outlined text-[28px]" style={{ color: "#0d9668" }}>
                    check_circle
                  </span>
                </div>
                <h3 className="font-heading mb-2 text-lg font-bold">{t("flagSubmitted")}</h3>
                <p className="mb-6 text-[13px] text-[#44474e]">
                  {t("flagSubmittedSub")}
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full rounded-md py-2.5 text-sm font-bold text-white"
                  style={{ background: "#02275A" }}
                >
                  {t("done")}
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-heading text-lg font-bold">{t("raiseDispute")}</h3>
                <p className="mb-4 text-sm text-[#44474e]">
                  {t("raiseModalNote")}
                </p>
                <label className="mb-1 block text-sm font-semibold">{tc("credential")}</label>
                <select
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  className="mb-3 block w-full max-w-full truncate rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: showError && !credentialId ? "#C0392B" : "#c5c6cf", background: showError && !credentialId ? "#fff6f5" : "#fff" }}
                >
                  <option value="">{t("selectCred")}</option>
                  {eligibleCredentials.map((c) => (
                    <option key={c.id} value={c.id}>
                      {credentialTitle(c, c.type === "CERTIFICATE" ? tc("certificate") : tc("activityRecord"))}
                      {" · "}
                      {new Date(c.issuedAt).getFullYear()}
                    </option>
                  ))}
                </select>
                <label className="mb-1 block text-sm font-semibold">{t("reason")}</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mb-1 w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: showError && !reason ? "#C0392B" : "#c5c6cf", background: showError && !reason ? "#fff6f5" : "#fff" }}
                >
                  <option value="">{t("selectReason")}</option>
                  <option value="Incorrect details">{t("incorrectDetails")}</option>
                  <option value="Not my credential">{t("notMine")}</option>
                  <option value="Other">{t("other")}</option>
                </select>
                {showError && <p className="mb-3 text-xs text-[#C0392B]">{t("selectCredReason")}</p>}
                <label className="mb-1 mt-3 block text-sm font-semibold">{t("addDetailOpt")}</label>
                <textarea
                  value={explain}
                  onChange={(e) => setExplain(e.target.value)}
                  rows={3}
                  className="mb-4 w-full rounded-md border border-[#c5c6cf] px-3 py-2 text-sm"
                />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="rounded-md border border-[#c5c6cf] bg-white px-5 py-2 text-sm font-semibold text-[#44474e]">
                    {tc("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={flagCredential.isPending}
                    className="rounded-md px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "#C0392B" }}
                  >
                    {flagCredential.isPending ? t("submitting") : t("submitFlag")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
