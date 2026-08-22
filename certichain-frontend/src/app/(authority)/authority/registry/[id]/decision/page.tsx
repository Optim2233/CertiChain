"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  useInstitution,
  useApproveInstitution,
  useRejectInstitution,
  useRequestInfo,
} from "@/features/accreditation"

type ModalType = "reject" | "info" | null

export default function ReviewDecisionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: instData } = useInstitution(id)
  const institution = instData?.data

  const approve = useApproveInstitution()
  const reject = useRejectInstitution()
  const requestInfo = useRequestInfo()

  const [infoSent, setInfoSent] = useState(false)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const [showApproved, setShowApproved] = useState(false)

  const reasonValid = reason.trim().length > 0
  const showError = touched && !reasonValid

  function doApprove() {
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
        { onSuccess: () => { setModalType(null); setReason(""); setTouched(false); setInfoSent(true) } }
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
      title: "Reject " + (institution?.name ?? "this institution") + "?",
      body: "Their application will be closed. They may resubmit with corrected documentation.",
      fieldLabel: "Reason (required, shown to institution + logged)",
      verb: "Reject",
      color: "#C0392B",
    },
    info: {
      title: "Request more information",
      body: "The institution stays pending and gets notified with your note — they can resubmit once addressed.",
      fieldLabel: "Note to institution (required, logged)",
      verb: "Send Request",
      color: "#02275A",
    },
  }

  return (
    <main className="mx-auto max-w-[800px] p-10">
      <button type="button" onClick={() => router.push("/authority/registry")} className="mb-4 flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#005eb3" }}>
        <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
        Back to Registry
      </button>

      <div className="rounded-lg border border-[#c5c6cf] bg-white p-8">
        <h2 className="font-heading m-0 mb-4 text-2xl font-bold">Reviewing: {institution?.name ?? "…"}</h2>
        <div className="mb-2 flex h-1.5 overflow-hidden rounded-full" style={{ background: "#e0e3e5" }}>
          <div className="h-full" style={{ width: "100%", background: "#02275A" }} />
        </div>
        <p className="mb-5 text-xs font-bold uppercase tracking-wide text-[#44474e]">Step 2 of 2 — Decision</p>

        {infoSent && (
          <div className="mb-5 flex items-center gap-2.5 rounded border border-[rgba(4,98,186,0.3)] bg-[rgba(4,98,186,0.08)] px-4 py-3.5">
            <span className="material-symbols-outlined" style={{ color: "#02275A" }}>mail</span>
            <p className="m-0 text-sm font-semibold" style={{ color: "#02275A" }}>Information request sent — application remains pending.</p>
          </div>
        )}

        <p className="mb-3 text-sm font-semibold">Decision for {institution?.name ?? "this institution"}:</p>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <button type="button" onClick={doApprove} disabled={approve.isPending} className="rounded px-4 py-3.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: "#02275A" }}>
            Approve
          </button>
          <button type="button" onClick={() => setModalType("reject")} className="rounded border border-[#c5c6cf] bg-white px-4 py-3.5 text-sm font-semibold text-[#44474e]">
            Reject
          </button>
        </div>
        <button
          type="button"
          onClick={() => setModalType("info")}
          className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[#c5c6cf] bg-white px-4 py-3 text-[13px] font-semibold text-[#44474e]"
        >
          <span className="material-symbols-outlined text-lg">help</span>
          Request More Information
        </button>
      </div>

      {showApproved && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8 text-center">
            <span className="material-symbols-outlined mb-3 text-5xl" style={{ color: "#0d9668" }}>check_circle</span>
            <h3 className="font-heading mb-2 text-xl font-bold" style={{ color: "#0d9668" }}>Approved</h3>
            <p className="mb-6 text-sm text-[#44474e]">
              {institution?.name ?? "This institution"} has been notified and may now issue certificates.
            </p>
            <button
              type="button"
              onClick={() => router.push("/authority/registry")}
              className="w-full rounded px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "#0d9668" }}
            >
              Back to Registry
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
              placeholder="Enter details..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-1 w-full resize-none rounded px-4 py-3 text-sm"
              style={{ background: "#f7f9fb", border: "1px solid " + (showError ? "#C0392B" : "#c5c6cf") }}
            />
            {showError && <p className="mb-3.5 text-xs text-[#C0392B]">This field is required before continuing.</p>}
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setModalType(null); setReason(""); setTouched(false) }} className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]">
                Cancel
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
