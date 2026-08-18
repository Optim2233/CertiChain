"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDisputes, useDismissDispute } from "@/features/institution"

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  OPEN: { bg: "#fff3d6", color: "#a5730f", icon: "schedule", label: "Open" },
  UPHELD: { bg: "rgba(192,57,43,0.1)", color: "#C0392B", icon: "check_circle", label: "Upheld" },
  DISMISSED: { bg: "#eef0f3", color: "#75777f", icon: "cancel", label: "Dismissed" },
}

export default function InstitutionDisputesPage() {
  const router = useRouter()
  const { data, isLoading } = useDisputes()
  const disputes = data?.data ?? []
  const dismiss = useDismissDispute()

  const [dismissTarget, setDismissTarget] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [touched, setTouched] = useState(false)

  const noteValid = note.trim().length > 0
  const showError = touched && !noteValid

  function confirmDismiss() {
    setTouched(true)
    if (!noteValid || !dismissTarget) return
    dismiss.mutate(
      { id: dismissTarget, resolutionNote: note },
      { onSuccess: () => { setDismissTarget(null); setNote(""); setTouched(false) } }
    )
  }

  const open = disputes.filter((d) => d.status === "OPEN").length
  const upheld = disputes.filter((d) => d.status === "UPHELD").length
  const dismissed = disputes.filter((d) => d.status === "DISMISSED").length

  const stats = [
    { icon: "schedule", iconBg: "#fff3d6", iconColor: "#a5730f", value: open, label: "Open" },
    { icon: "check_circle", iconBg: "rgba(192,57,43,0.1)", iconColor: "#C0392B", value: upheld, label: "Upheld" },
    { icon: "cancel", iconBg: "#eef0f3", iconColor: "#75777f", value: dismissed, label: "Dismissed" },
  ]

  return (
    <main className="w-full px-6 py-8">
      <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">Disputes</h2>
      <p className="m-0 mb-6 max-w-[640px] text-base text-[#44474e]">
        Entries graduates have flagged as inaccurate. Review each and either correct the record or dismiss the
        flag — the graduate sees your decision on their end.
      </p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {stats.map((st) => (
          <div key={st.label} className="rounded-lg border border-[#c5c6cf] bg-white p-4">
            <div className="mb-2.5 flex size-8 items-center justify-center rounded-lg" style={{ background: st.iconBg }}>
              <span className="material-symbols-outlined text-[18px]" style={{ color: st.iconColor }}>{st.icon}</span>
            </div>
            <p className="font-heading m-0 text-2xl font-extrabold">{st.value}</p>
            <p className="m-0 mt-0.5 text-xs text-[#75777f]">{st.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
        <div className="grid gap-4 px-6 py-3.5" style={{ gridTemplateColumns: "2.2fr 2fr 1.2fr 1.4fr 1.6fr", background: "#02275A" }}>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Credential</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Reason</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Filed</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Status</span>
          <span className="text-right text-[12px] font-bold uppercase tracking-wide text-white">Action</span>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-[#75777f]">Loading…</p>
        ) : disputes.length === 0 ? (
          <p className="p-6 text-sm text-[#75777f]">No disputes filed.</p>
        ) : (
          disputes.map((d) => {
            const style = STATUS_STYLE[d.status] ?? STATUS_STYLE.OPEN
            return (
              <div key={d.id} className="border-t border-[#c5c6cf]">
                <div className="grid items-center gap-4 px-6 py-4" style={{ gridTemplateColumns: "2.2fr 2fr 1.2fr 1.4fr 1.6fr" }}>
                  <span className="text-sm font-semibold">{d.credentialId}</span>
                  <span className="text-[13px] text-[#44474e]">{d.reason}</span>
                  <span className="text-[13px] text-[#44474e]">{new Date(d.createdAt).toLocaleDateString()}</span>
                  <span className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: style.bg, color: style.color }}>
                    <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                    {style.label}
                  </span>
                  <div className="text-right">
                    {d.status === "OPEN" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => router.push("/institution/credentials/" + d.credentialId + "?disputeId=" + d.id)}
                          className="rounded border px-3 py-1.5 text-xs font-semibold"
                          style={{ borderColor: "#02275A", color: "#02275A" }}
                        >
                          Uphold
                        </button>
                        <button
                          type="button"
                          onClick={() => setDismissTarget(d.id)}
                          className="rounded border border-[#c5c6cf] px-3 py-1.5 text-xs font-semibold text-[#44474e]"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {d.resolutionNote && <div className="px-6 pb-4 text-[13px] text-[#44474e]">{d.resolutionNote}</div>}
              </div>
            )
          })
        )}
      </div>

      {dismissTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">Dismiss dispute</h3>
            <p className="mb-5 text-sm text-[#44474e]">The entry stays unchanged. The graduate sees your note explaining why.</p>
            <label className="mb-1.5 block text-[13px] font-bold">Note to graduate (required, logged)</label>
            <textarea
              rows={3}
              placeholder="Explain your decision..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mb-1 w-full resize-none rounded border px-3.5 py-2.5 text-sm"
              style={{ borderColor: showError ? "#C0392B" : "#c5c6cf" }}
            />
            {showError && <p className="mb-3.5 text-xs text-[#C0392B]">A note is required before resolving.</p>}
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setDismissTarget(null); setNote(""); setTouched(false) }} className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDismiss}
                disabled={dismiss.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#C0392B" }}
              >
                {dismiss.isPending ? "Dismissing…" : "Confirm Dismiss"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
