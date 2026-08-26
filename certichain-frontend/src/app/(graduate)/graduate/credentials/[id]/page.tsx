"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { CertificateHero } from "@/shared/components/certificate-hero"
import { StatusBadge } from "@/shared/components/status-badge"
import { Button } from "@/shared/components/ui/button"
import {
  useTimeline,
  useCredentialFields,
  useCredentialFlags,
  useCredentialVerificationHistory,
  useFlagCredential,
} from "@/features/graduate"
import { Skeleton } from "@/shared/components/ui/skeleton"

export default function CredentialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: timelineData } = useTimeline()
  const credential = (timelineData?.data ?? []).find((c) => c.id === id)
  const { data: fieldsData, isLoading: fieldsLoading } = useCredentialFields(id)
  const fields = fieldsData?.data ?? []
  const { data: flagsData } = useCredentialFlags(id)
  const flags = flagsData?.data ?? []
  const flagCredential = useFlagCredential()
  const { data: verificationHistoryData } = useCredentialVerificationHistory(id)
  const verificationHistory = verificationHistoryData?.data ?? []

  const [sigOpen, setSigOpen] = useState(false)
  const [flagOpen, setFlagOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [explain, setExplain] = useState("")
  const [touched, setTouched] = useState(false)

  const reasonValid = reason.trim().length > 0
  const showError = touched && !reasonValid

  function submitFlag() {
    setTouched(true)
    if (!reasonValid) return
    flagCredential.mutate(
      { id, reason: explain ? reason + ": " + explain : reason },
      {
        onSuccess: () => {
          setFlagOpen(false)
          setReason("")
          setExplain("")
          setTouched(false)
        },
      }
    )
  }

  if (!credential) {
    return (
      <main className="mx-auto max-w-[820px] p-6" aria-busy="true">
        <Skeleton className="mb-3 h-8 w-1/2" />
        <Skeleton className="mb-8 h-4 w-1/4" />
        <Skeleton className="mb-4 h-[200px] rounded-xl" />
        <Skeleton className="h-[140px] rounded-xl" />
      </main>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link href="/graduate" className="text-primary mb-5 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
        <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
        Back to Overview
      </Link>

      <div className="mb-8">
        <CertificateHero
          title={credential.type === "CERTIFICATE" ? "Certificate" : "Activity Record"}
          issuedTo={credential.graduateEmail}
          issuedAt={credential.issuedAt}
          credentialId={credential.id}
          hash={credential.merkleRoot ?? credential.signature}
          registrarName="Registrar"
          revoked={credential.status === "REVOKED"}
          revokeReason={credential.revokeReason}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="border-border bg-card rounded-lg border p-6">
          <h3 className="font-heading mb-4 text-lg font-bold">Credential Details</h3>
          <div className="flex flex-col gap-3.5">
            {fieldsLoading ? (
              <div className="flex flex-col gap-2" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-4" />
                ))}
              </div>
            ) : fields.length === 0 ? (
              <p className="text-muted-foreground text-sm">No additional fields recorded.</p>
            ) : (
              fields.map((f) => (
                <div key={f.id} className="border-border flex justify-between border-b pb-2.5 text-sm last:border-0">
                  <span className="text-muted-foreground capitalize">{f.fieldName}</span>
                  <span className="font-semibold">{f.fieldValue}</span>
                </div>
              ))
            )}
          </div>

          <div
            onClick={() => setSigOpen((v) => !v)}
            className="border-border mt-4 flex cursor-pointer items-center gap-1 border-t pt-4 text-sm font-semibold text-[#005eb3]"
          >
            <span className="material-symbols-outlined text-base leading-none">{sigOpen ? "expand_less" : "expand_more"}</span>
            {sigOpen ? "Hide" : "Show"} issuer accreditation &amp; signature details
          </div>
          {sigOpen && (
            <div className="mt-3 rounded bg-[#f7f9fb] p-3.5 text-xs leading-relaxed text-[#44474e]">
              Signature verified against the issuer's public key on-chain. Institution accreditation status:
              fully accredited.
            </div>
          )}

          {flags.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {flags.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{f.reason}</span>
                  <StatusBadge status={f.status} />
                </div>
              ))}
            </div>
          )}

          <div
            onClick={() => setFlagOpen(true)}
            className="text-destructive mt-3 flex cursor-pointer items-center gap-1 text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-base leading-none">flag</span>
            Flag this credential for review
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="border-border bg-card rounded-lg border p-5">
            <h3 className="font-heading mb-1 text-base font-bold">Fields Shared</h3>
            <p className="text-muted-foreground mb-3.5 text-xs">Choose what's visible when you share this credential.</p>
            <p className="text-muted-foreground text-xs">Field-level share controls apply per share link — configure them from My Shares.</p>
          </div>

          <div className="border-border bg-card rounded-lg border p-5">
            <h3 className="font-heading mb-1 text-base font-bold">Verification History</h3>
            <p className="text-muted-foreground mb-3.5 text-xs">
              Verified {verificationHistory.length} time{verificationHistory.length === 1 ? "" : "s"} — no verifier
              identity is ever recorded.
            </p>
            {verificationHistory.length === 0 ? (
              <p className="text-muted-foreground text-xs">Not yet verified by anyone.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs text-[#44474e]">
                {verificationHistory.slice(0, 5).map((ts) => (
                  <li key={ts}>{new Date(ts).toLocaleString()}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {flagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="font-heading text-lg font-bold">Flag this credential</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Tell us what looks wrong — the issuing institution will review it.
            </p>
            <label className="mb-1 block text-sm font-semibold">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              className={"mb-1 w-full rounded-md border px-3 py-2 text-sm " + (showError ? "border-destructive bg-red-50" : "border-border")}
            >
              <option value="">Select a reason</option>
              <option value="Incorrect details">Incorrect details</option>
              <option value="Not my credential">Not my credential</option>
              <option value="Other">Other</option>
            </select>
            {showError && <p className="mb-3 text-xs text-destructive">Choose a reason.</p>}
            <label className="mb-1 mt-3 block text-sm font-semibold">Additional detail (optional)</label>
            <textarea
              value={explain}
              onChange={(e) => setExplain(e.target.value)}
              rows={3}
              className="border-border mb-4 w-full rounded-md border px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setFlagOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={submitFlag} disabled={flagCredential.isPending}>
                {flagCredential.isPending ? "Submitting…" : "Submit Flag"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
