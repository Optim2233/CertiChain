"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { StatusBadge } from "@/shared/components/status-badge"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import {
  useInstitution,
  useApproveInstitution,
  useRequestInfo,
  useRejectInstitution,
  useSuspendInstitution,
  useRevokeInstitution,
} from "@/features/accreditation"

function SuspendModal({
  onCancel,
  onConfirm,
  pending,
}: {
  onCancel: () => void
  onConfirm: (reason: string) => void
  pending: boolean
}) {
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const valid = reason.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="border-border bg-card w-full max-w-sm rounded-lg border p-4 shadow-lg">
        <h2 className="mb-1 font-heading text-base font-bold">Suspend institution</h2>
        <p className="text-muted-foreground mb-3 text-sm">
          Suspension is reversible — existing certificates stay valid, the
          institution just can&apos;t issue new ones until reinstated.
        </p>
        <Label htmlFor="suspend-reason">Reason (required)</Label>
        <Input
          id="suspend-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          className={touched && !valid ? "border-destructive bg-[#fff6f5]" : undefined}
        />
        {touched && !valid && (
          <p className="text-destructive mt-1 text-xs">A reason is required to suspend.</p>
        )}
        {valid && (
          <p className={cn("mt-1 flex items-center gap-1 text-xs text-emerald-700")}>
            <span className="material-symbols-outlined text-sm leading-none">check_circle</span>
            Ready to suspend
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!valid || pending}
            onClick={() => {
              setTouched(true)
              if (valid) onConfirm(reason)
            }}
          >
            {pending ? "Suspending…" : "Suspend"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function InstitutionReviewPage({
  params,
}: {
  params: Promise<{ institutionId: string }>
}) {
  const { institutionId } = use(params)
  const router = useRouter()
  const [step, setStep] = useState<"documents" | "decision">("documents")
  const [reason, setReason] = useState("")
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [revokeReason, setRevokeReason] = useState("")

  const { data, isLoading } = useInstitution(institutionId)
  const approve = useApproveInstitution()
  const requestInfo = useRequestInfo()
  const reject = useRejectInstitution()
  const suspend = useSuspendInstitution()
  const revoke = useRevokeInstitution()

  const pending =
    approve.isPending || requestInfo.isPending || reject.isPending || suspend.isPending || revoke.isPending
  const error = approve.error ?? requestInfo.error ?? reject.error ?? suspend.error ?? revoke.error

  function onDecided() {
    router.push("/authority")
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    )
  }

  const institution = data.data
  const isPending = institution.status === "PENDING"
  const isApproved = institution.status === "APPROVED"

  return (
    <div className="mx-auto max-w-lg p-6">
      <button
        type="button"
        onClick={() => (step === "decision" ? setStep("documents") : router.push("/authority"))}
        className="text-muted-foreground mb-3 flex items-center gap-1 text-sm hover:text-foreground"
      >
        <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
        Back
      </button>

      <div className="border-border bg-card rounded-lg border p-4">
        <h1 className="font-heading text-xl font-bold">{institution.name}</h1>
        <p className="text-muted-foreground text-sm">{institution.ministry}</p>
        <div className="my-3">
          <StatusBadge status={institution.status} />
        </div>

        {error && (
          <p className="text-destructive mb-2 text-sm">
            {(error as { message?: string })?.message ?? "Something went wrong"}
          </p>
        )}

        {isPending && step === "documents" && (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Step 1 of 2 · Documents</p>
            {/* ponytail: no document-listing endpoint exists yet - shows a
                placeholder note rather than fabricating file names */}
            <p className="border-border bg-muted rounded-lg border p-3 text-sm text-muted-foreground">
              Submitted accreditation documents aren&apos;t individually listable yet — review
              them via the institution&apos;s application record before deciding.
            </p>
            <Button className="w-fit" onClick={() => setStep("decision")}>
              Next: Decision
            </Button>
          </div>
        )}

        {isPending && step === "decision" && (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Step 2 of 2 · Decision</p>
            <div className="flex gap-2">
              <Button
                onClick={() => approve.mutate(institutionId, { onSuccess: onDecided })}
                disabled={pending}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={pending || !reason}
                onClick={() =>
                  requestInfo.mutate({ id: institutionId, note: reason }, { onSuccess: onDecided })
                }
              >
                Request Info
              </Button>
              <Button
                variant="destructive"
                disabled={pending || !reason}
                onClick={() => reject.mutate({ id: institutionId, reason }, { onSuccess: onDecided })}
              >
                Reject
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Notes (required for Request Info / Reject)</Label>
              <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
        )}

        {isApproved && (
          <div className="flex flex-col gap-3">
            <Button variant="destructive" className="w-fit" onClick={() => setSuspendOpen(true)}>
              Suspend
            </Button>
            <div className="border-border border-t pt-3">
              <Label htmlFor="revoke-reason">Revoke reason (permanent, cannot be reversed)</Label>
              <div className="mt-1.5 flex gap-2">
                <Input id="revoke-reason" value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
                <Button
                  variant="destructive"
                  disabled={pending || !revokeReason}
                  onClick={() =>
                    revoke.mutate({ id: institutionId, reason: revokeReason }, { onSuccess: onDecided })
                  }
                >
                  Revoke
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {suspendOpen && (
        <SuspendModal
          pending={suspend.isPending}
          onCancel={() => setSuspendOpen(false)}
          onConfirm={(r) =>
            suspend.mutate(
              { id: institutionId, reason: r },
              { onSuccess: () => { setSuspendOpen(false); onDecided() } }
            )
          }
        />
      )}
    </div>
  )
}
