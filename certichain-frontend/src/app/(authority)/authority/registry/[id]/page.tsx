"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useInstitution, useReinstateInstitution, useRevokeInstitution, useSuspendInstitution } from "@/features/accreditation"

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  PENDING: { bg: "#e0e3e5", color: "#44474e", icon: "schedule", label: "Pending" },
  APPROVED: { bg: "#d8e2ff", color: "#02275A", icon: "check_circle", label: "Approved" },
  SUSPENDED: { bg: "#eef0f3", color: "#75777f", icon: "pause_circle", label: "Suspended" },
  REJECTED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: "Rejected" },
  REVOKED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: "Revoked" },
}

export default function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading } = useInstitution(id)
  const institution = data?.data
  const reinstate = useReinstateInstitution()
  const revoke = useRevokeInstitution()
  const suspend = useSuspendInstitution()

  const [modalType, setModalType] = useState<"revoke" | "suspend" | null>(null)
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const reasonValid = reason.trim().length > 0
  const showError = touched && !reasonValid

  function confirmModalAction() {
    setTouched(true)
    if (!reasonValid) return
    const mutation = modalType === "suspend" ? suspend : revoke
    mutation.mutate({ id, reason }, { onSuccess: () => { setModalType(null); setReason(""); setTouched(false) } })
  }

  if (isLoading || !institution) return <main className="p-10 text-sm text-[#75777f]">Loading…</main>

  const style = STATUS_STYLE[institution.status]

  return (
    <main className="mx-auto max-w-[700px] p-10">
      <button type="button" onClick={() => router.push("/authority/registry")} className="mb-4 flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#005eb3" }}>
        <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
        Back to Registry
      </button>

      <div className="rounded-lg border border-[#c5c6cf] bg-white p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading m-0 mb-1 text-[28px] font-bold">{institution.name}</h2>
            <p className="m-0 text-sm text-[#44474e]">{institution.ministry}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide" style={{ background: style.bg, color: style.color }}>
            <span className="material-symbols-outlined text-sm">{style.icon}</span>
            {style.label}
          </span>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-5 rounded border border-[#c5c6cf] bg-[#f7f9fb] p-5 text-sm">
          <div>
            <p className="m-0 text-xs text-[#75777f]">Applied</p>
            <p className="m-0 mt-0.5 font-semibold">{new Date(institution.appliedAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="m-0 text-xs text-[#75777f]">Decided</p>
            <p className="m-0 mt-0.5 font-semibold">{institution.decidedAt ? new Date(institution.decidedAt).toLocaleDateString() : "—"}</p>
          </div>
          {institution.statusReason && (
            <div className="col-span-2">
              <p className="m-0 text-xs text-[#75777f]">Status reason on file</p>
              <p className="m-0 mt-0.5 font-semibold">{institution.statusReason}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#c5c6cf] pt-5">
          {institution.status === "SUSPENDED" && (
            <button
              type="button"
              onClick={() => reinstate.mutate(id)}
              disabled={reinstate.isPending}
              className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#0d9668" }}
            >
              {reinstate.isPending ? "Reinstating…" : "Reinstate"}
            </button>
          )}
          {institution.status === "APPROVED" && (
            <>
              <button
                type="button"
                onClick={() => setModalType("suspend")}
                className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]"
              >
                Suspend
              </button>
              <button
                type="button"
                onClick={() => setModalType("revoke")}
                className="rounded px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: "#C0392B" }}
              >
                Revoke Accreditation
              </button>
            </>
          )}
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">
              {modalType === "suspend" ? "Suspend" : "Revoke"} {institution.name}'s accreditation?
            </h3>
            <p className="mb-5 text-sm text-[#44474e]">
              {modalType === "suspend"
                ? "They won't be able to issue new certificates until reinstated. Existing certificates stay valid."
                : "They immediately lose the ability to issue certificates, and every certificate they've already issued is flagged as untrusted wherever it's verified. This cannot be undone."}
            </p>
            <label className="mb-1.5 block text-[13px] font-bold">Reason (required, shown to institution + logged)</label>
            <textarea
              rows={3}
              placeholder={`Enter reason for ${modalType === "suspend" ? "suspension" : "revocation"}...`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-1 w-full resize-none rounded px-4 py-3 text-sm"
              style={{ background: "#f7f9fb", border: "1px solid " + (showError ? "#C0392B" : "#c5c6cf") }}
            />
            {showError && <p className="mb-3.5 text-xs text-[#C0392B]">A reason is required before continuing.</p>}
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setModalType(null); setReason(""); setTouched(false) }} className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModalAction}
                disabled={revoke.isPending || suspend.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#C0392B" }}
              >
                {modalType === "suspend"
                  ? (suspend.isPending ? "Suspending…" : "Suspend")
                  : (revoke.isPending ? "Revoking…" : "Revoke")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
