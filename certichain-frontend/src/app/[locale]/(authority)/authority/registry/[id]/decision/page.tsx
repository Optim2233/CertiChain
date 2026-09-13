"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import {
  useInstitution,
  useApproveInstitution,
  useRejectInstitution,
  useRequestInfo,
  InstitutionFacts,
} from "@/features/accreditation"

type ModalType = "reject" | "info" | null

export default function ReviewDecisionPage() {
  const t = useTranslations("authority")
  const tc = useTranslations("common")
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: instData } = useInstitution(id)
  const institution = instData?.data

  const approve = useApproveInstitution()
  const reject = useRejectInstitution()
  const requestInfo = useRequestInfo()

  const [modalType, setModalType] = useState<ModalType>(null)
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const [showApproved, setShowApproved] = useState(false)
  const [confirmingApprove, setConfirmingApprove] = useState(false)

  const reasonValid = reason.trim().length > 0
  const showError = touched && !reasonValid

  function doApprove() {
    setConfirmingApprove(false)
    approve.mutate(id, { onSuccess: () => setShowApproved(true) })
  }

  // Auto-navigates after showing the confirmation - reviewer sees the modal, then lands
  // back on the list without an extra click.
  useEffect(() => {
    if (!showApproved) return
    const timeout = setTimeout(() => router.push("/authority/registry"), 1500)
    return () => clearTimeout(timeout)
  }, [showApproved, router])

  function submitModalAction() {
    setTouched(true)
    if (!reasonValid) return
    if (modalType === "info") {
      requestInfo.mutate(
        { id, note: reason },
        { onSuccess: () => { setModalType(null); setReason(""); setTouched(false); toast.success(t("requestSent")) } }
      )
      return
    }
    reject.mutate(
      { id, reason },
      { onSuccess: () => { setModalType(null); setReason(""); setTouched(false); router.push("/authority/registry") } }
    )
  }

  const modalCopy: Record<Exclude<ModalType, null>, { title: string; body: string; fieldLabel: string; verb: string; color: string }> = {
    reject: {
      title: t("rejectTitle", { name: institution?.name ?? t("thisInstitution") }),
      body: t("rejectWarn"),
      fieldLabel: t("reasonRequired"),
      verb: t("reject"),
      color: "#C0392B",
    },
    info: {
      title: t("requestInfo"),
      body: t("requestInfoSub"),
      fieldLabel: t("noteRequired"),
      verb: t("sendRequest"),
      color: "#02275A",
    },
  }

  return (
    <main className="mx-auto max-w-[800px] p-10">
      <button type="button" onClick={() => router.push("/authority/registry")} className="mb-4 flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#005eb3" }}>
        <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
        {t("backToRegistry")}
      </button>

      <div className="rounded-lg border border-[#c5c6cf] bg-white p-8">
        <h2 className="font-heading m-0 mb-4 text-2xl font-bold">{t("reviewing", { name: institution?.name ?? "…" })}</h2>
        <div className="mb-2 flex h-1.5 overflow-hidden rounded-full" style={{ background: "#e0e3e5" }}>
          <div className="h-full" style={{ width: "100%", background: "#02275A" }} />
        </div>
        <p className="mb-5 text-xs font-bold uppercase tracking-wide text-[#44474e]">{t("stepDecision")}</p>

        {institution && <InstitutionFacts institution={institution} />}

        <p className="mb-3 text-sm font-semibold">{t("decisionFor", { name: institution?.name ?? t("thisInstitution") })}</p>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setConfirmingApprove(true)} disabled={approve.isPending} className="rounded px-4 py-3.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: "#02275A" }}>
            {t("approve")}
          </button>
          <button type="button" onClick={() => setModalType("reject")} className="rounded border border-[#c5c6cf] bg-white px-4 py-3.5 text-sm font-semibold text-[#44474e]">
            {t("reject")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setModalType("info")}
          className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[#c5c6cf] bg-white px-4 py-3 text-[13px] font-semibold text-[#44474e]"
        >
          <span className="material-symbols-outlined text-lg">help</span>
          {t("requestInfo")}
        </button>
      </div>

      {confirmingApprove && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">
              {t("approveConfirmTitle", { name: institution?.name ?? t("thisInstitution") })}
            </h3>
            <p className="mb-6 text-sm text-[#44474e]">{t("approveConfirmWarn")}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingApprove(false)}
                className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={doApprove}
                disabled={approve.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#02275A" }}
              >
                {t("approve")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showApproved && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8 text-center">
            <span className="material-symbols-outlined mb-3 text-5xl" style={{ color: "#0d9668" }}>check_circle</span>
            <h3 className="font-heading mb-2 text-xl font-bold" style={{ color: "#0d9668" }}>{t("approvedModal")}</h3>
            <p className="mb-6 text-sm text-[#44474e]">
              {t("approvedMsg", { name: institution?.name ?? t("thisInstitution") })}
            </p>
            <button
              type="button"
              onClick={() => router.push("/authority/registry")}
              className="w-full rounded px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "#0d9668" }}
            >
              {t("backToRegistry")}
            </button>
          </div>
        </div>
      )}

      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">{modalCopy[modalType].title}</h3>
            <p className="mb-5 text-sm text-[#44474e]">{modalCopy[modalType].body}</p>
            <label className="mb-1.5 block text-[13px] font-bold">{modalCopy[modalType].fieldLabel}</label>
            <textarea
              rows={3}
              placeholder={t("detailsPh")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-1 w-full resize-none rounded px-4 py-3 text-sm"
              style={{ background: "#f7f9fb", border: "1px solid " + (showError ? "#C0392B" : "#c5c6cf") }}
            />
            {showError && <p className="mb-3.5 text-xs text-[#C0392B]">{t("fieldRequired")}</p>}
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setModalType(null); setReason(""); setTouched(false) }} className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]">
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={submitModalAction}
                disabled={reject.isPending || requestInfo.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: modalCopy[modalType].color }}
              >
                {modalCopy[modalType].verb}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
