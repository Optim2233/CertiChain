"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useDisputes, useDismissDispute } from "@/features/institution"
import { TableSkeleton } from "@/shared/components/ui/skeletons"
import { translateDisputeReason } from "@/shared/lib/dispute-reason"

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  OPEN: { bg: "#fff3d6", color: "#a5730f", icon: "schedule" },
  UPHELD: { bg: "rgba(192,57,43,0.1)", color: "#C0392B", icon: "check_circle" },
  DISMISSED: { bg: "#eef0f3", color: "#75777f", icon: "cancel" },
}

export default function InstitutionDisputesPage() {
  const t = useTranslations("institution")
  const tc = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useDisputes()
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

  function statusLabel(status: string) {
    if (status === "UPHELD") return tc("upheld")
    if (status === "DISMISSED") return tc("dismissed")
    return tc("open")
  }

  const stats = [
    { icon: "schedule", iconBg: "#fff3d6", iconColor: "#a5730f", value: open, label: tc("open") },
    { icon: "check_circle", iconBg: "rgba(192,57,43,0.1)", iconColor: "#C0392B", value: upheld, label: tc("upheld") },
    { icon: "cancel", iconBg: "#eef0f3", iconColor: "#75777f", value: dismissed, label: tc("dismissed") },
  ]

  return (
    <main className="w-full px-6 py-8">
      <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">{t("disputesTitle")}</h2>
      <p className="m-0 mb-6 max-w-[640px] text-base text-[#44474e]">
        {t("disputesSub")}
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
        <div className="grid gap-4 px-6 py-3.5" style={{ gridTemplateColumns: "2fr 1.8fr 2fr 1fr 1.2fr 1.4fr", background: "#02275A" }}>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("credential")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("email")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("reason")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("filed")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("status")}</span>
          <span className="text-right text-[12px] font-bold uppercase tracking-wide text-white">{tc("action")}</span>
        </div>
        {isLoading ? (
          <TableSkeleton columns="2fr 1.8fr 2fr 1fr 1.2fr 1.4fr" />
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
            const style = STATUS_STYLE[d.status] ?? STATUS_STYLE.OPEN
            return (
              <div key={d.id} className="border-t border-[#c5c6cf]">
                <div className="grid items-center gap-4 px-6 py-4" style={{ gridTemplateColumns: "2fr 1.8fr 2fr 1fr 1.2fr 1.4fr" }}>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{d.credentialTitle ?? t("untitledCred")}</span>
                    <span className="text-xs text-[#75777f]">
                      {d.credentialType === "ACTIVITY_RECORD" ? tc("activityRecord") : tc("certificate")}
                    </span>
                  </div>
                  <span className="text-[13px] text-[#44474e]">{d.graduateEmail ?? "—"}</span>
                  <span className="text-[13px] text-[#44474e]">{translateDisputeReason(d.reason, t)}</span>
                  <span className="text-[13px] text-[#44474e]">{new Date(d.createdAt).toLocaleDateString(locale)}</span>
                  <span className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: style.bg, color: style.color }}>
                    <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                    {statusLabel(d.status)}
                  </span>
                  <div className="text-right">
                    {d.status !== "OPEN" && (
                      <span className="text-xs text-[#75777f]">
                        {t("resolvedDate", { date: d.resolvedAt ? new Date(d.resolvedAt).toLocaleDateString(locale) : "" })}
                      </span>
                    )}
                    {d.status === "OPEN" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => router.push("/institution/credentials/" + d.credentialId + "?disputeId=" + d.id)}
                          className="rounded border px-3 py-1.5 text-xs font-semibold"
                          style={{ borderColor: "#02275A", color: "#02275A" }}
                        >
                          {t("uphold")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDismissTarget(d.id)}
                          className="rounded border border-[#c5c6cf] px-3 py-1.5 text-xs font-semibold text-[#44474e]"
                        >
                          {t("dismiss")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {d.resolutionNote && (
                  <div className="px-6 pb-4 text-[13px] text-[#44474e]">
                    <span className="font-semibold">{t("resolutionNoteLbl", { note: d.resolutionNote })}</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {dismissTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">{t("dismissTitle")}</h3>
            <p className="mb-5 text-sm text-[#44474e]">{t("dismissWarn")}</p>
            <label className="mb-1.5 block text-[13px] font-bold">{t("noteToGraduate")}</label>
            <textarea
              rows={3}
              placeholder={t("explainPh")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mb-1 w-full resize-none rounded border px-3.5 py-2.5 text-sm"
              style={{ borderColor: showError ? "#C0392B" : "#c5c6cf" }}
            />
            {showError && <p className="mb-3.5 text-xs text-[#C0392B]">{t("noteRequired")}</p>}
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setDismissTarget(null); setNote(""); setTouched(false) }} className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]">
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={confirmDismiss}
                disabled={dismiss.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#C0392B" }}
              >
                {dismiss.isPending ? t("dismissing") : t("confirmDismiss")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
