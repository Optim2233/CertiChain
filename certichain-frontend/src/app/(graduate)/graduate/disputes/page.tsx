"use client"

import { useState } from "react"
import { useAllDisputes, useFlagCredential, useTimeline } from "@/features/graduate"

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  OPEN: { bg: "#fff3d6", color: "#a5730f", icon: "schedule", label: "Under Review" },
  UPHELD: { bg: "rgba(192,57,43,0.1)", color: "#C0392B", icon: "check_circle", label: "Upheld" },
  DISMISSED: { bg: "#eef0f3", color: "#75777f", icon: "cancel", label: "Dismissed" },
}

export default function GraduateDisputesPage() {
  const { data, isLoading } = useAllDisputes()
  const disputes = data?.data ?? []
  const { data: timelineData } = useTimeline()
  const credentials = timelineData?.data ?? []
  const flagCredential = useFlagCredential()

  const [open, setOpen] = useState(false)
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
      { onSuccess: () => setSubmitted(true) }
    )
  }

  function closeModal() {
    setOpen(false)
    setSubmitted(false)
    setCredentialId("")
    setReason("")
    setExplain("")
    setTouched(false)
  }

  const underReview = disputes.filter((d) => d.status === "OPEN").length
  const upheld = disputes.filter((d) => d.status === "UPHELD").length
  const dismissed = disputes.filter((d) => d.status === "DISMISSED").length

  const stats = [
    { icon: "schedule", iconBg: "#fff3d6", iconColor: "#a5730f", value: underReview, label: "Under Review" },
    { icon: "check_circle", iconBg: "rgba(192,57,43,0.1)", iconColor: "#C0392B", value: upheld, label: "Upheld" },
    { icon: "cancel", iconBg: "#eef0f3", iconColor: "#75777f", value: dismissed, label: "Dismissed" },
  ]

  return (
    <main className="w-full px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">Disputes</h2>
          <p className="m-0 mb-6 max-w-[600px] text-sm text-[#44474e]">
            Flag an inaccurate entry on your record. The issuing institution reviews every flag and either
            corrects the entry or dismisses it — either way, you'll see the outcome here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "#C0392B" }}
        >
          <span className="material-symbols-outlined text-[18px]">flag</span>
          Raise a Dispute
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

      <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
        <div className="grid gap-4 px-6 py-3.5" style={{ gridTemplateColumns: "2.5fr 2fr 1.3fr 1.3fr", background: "#02275A" }}>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Credential</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Reason</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Filed</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Status</span>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-[#75777f]">Loading…</p>
        ) : disputes.length === 0 ? (
          <p className="p-6 text-sm text-[#75777f]">You haven't raised any disputes.</p>
        ) : (
          disputes.map((d) => {
            const cred = credentials.find((c) => c.id === d.credentialId)
            const style = STATUS_STYLE[d.status] ?? STATUS_STYLE.OPEN
            return (
              <div key={d.id} className="border-t border-[#c5c6cf]">
                <div className="grid items-center gap-4 px-6 py-4" style={{ gridTemplateColumns: "2.5fr 2fr 1.3fr 1.3fr" }}>
                  <span className="text-sm font-semibold">
                    {cred ? (cred.type === "CERTIFICATE" ? "Certificate" : "Activity Record") : "Credential"}
                  </span>
                  <span className="text-[13px] text-[#44474e]">{d.reason}</span>
                  <span className="text-[13px] text-[#44474e]">{new Date(d.createdAt).toLocaleDateString()}</span>
                  <span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: style.bg, color: style.color }}
                    >
                      <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                      {style.label}
                    </span>
                  </span>
                </div>
                {d.resolutionNote && (
                  <div className="px-6 pb-4 text-[13px] text-[#44474e]">{d.resolutionNote}</div>
                )}
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
                <h3 className="font-heading mb-2 text-lg font-bold">Flag submitted</h3>
                <p className="mb-6 text-[13px] text-[#44474e]">
                  The issuing institution has been notified. You'll see the outcome here once it's reviewed.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full rounded-md py-2.5 text-sm font-bold text-white"
                  style={{ background: "#02275A" }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-heading text-lg font-bold">Raise a dispute</h3>
                <p className="mb-4 text-sm text-[#44474e]">
                  The issuing institution will review this and can correct or dismiss it.
                </p>
                <label className="mb-1 block text-sm font-semibold">Credential</label>
                <select
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  className="mb-3 w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: showError && !credentialId ? "#C0392B" : "#c5c6cf", background: showError && !credentialId ? "#fff6f5" : "#fff" }}
                >
                  <option value="">Select a credential</option>
                  {credentials.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.type === "CERTIFICATE" ? "Certificate" : "Activity Record"} — {c.graduateEmail}
                    </option>
                  ))}
                </select>
                <label className="mb-1 block text-sm font-semibold">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mb-1 w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: showError && !reason ? "#C0392B" : "#c5c6cf", background: showError && !reason ? "#fff6f5" : "#fff" }}
                >
                  <option value="">Select a reason</option>
                  <option value="Incorrect details">Incorrect details</option>
                  <option value="Not my credential">Not my credential</option>
                  <option value="Other">Other</option>
                </select>
                {showError && <p className="mb-3 text-xs text-[#C0392B]">Select a credential and a reason.</p>}
                <label className="mb-1 mt-3 block text-sm font-semibold">Additional detail (optional)</label>
                <textarea
                  value={explain}
                  onChange={(e) => setExplain(e.target.value)}
                  rows={3}
                  className="mb-4 w-full rounded-md border border-[#c5c6cf] px-3 py-2 text-sm"
                />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="rounded-md border border-[#c5c6cf] bg-white px-5 py-2 text-sm font-semibold text-[#44474e]">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={flagCredential.isPending}
                    className="rounded-md px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "#C0392B" }}
                  >
                    {flagCredential.isPending ? "Submitting…" : "Submit Dispute"}
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
