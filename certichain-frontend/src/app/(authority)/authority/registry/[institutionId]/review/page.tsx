"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { StatusBadge } from "@/shared/components/status-badge"
import {
  useInstitution,
  useApproveInstitution,
  useRequestInfo,
  useRejectInstitution,
  useSuspendInstitution,
} from "@/features/accreditation"

export default function InstitutionReviewPage({
  params,
}: {
  params: Promise<{ institutionId: string }>
}) {
  const { institutionId } = use(params)
  const router = useRouter()
  const [reason, setReason] = useState("")

  const { data, isLoading } = useInstitution(institutionId)
  const approve = useApproveInstitution()
  const requestInfo = useRequestInfo()
  const reject = useRejectInstitution()
  const suspend = useSuspendInstitution()

  const pending =
    approve.isPending || requestInfo.isPending || reject.isPending || suspend.isPending
  const error = approve.error ?? requestInfo.error ?? reject.error ?? suspend.error

  function onDecided() {
    router.push("/authority")
  }

  if (isLoading || !data) return <div className="p-6 text-sm">Loading…</div>

  const institution = data.data
  const isPending = institution.status === "PENDING"

  return (
    <div className="max-w-md p-6">
      <h1 className="text-lg font-semibold">{institution.name}</h1>
      <p className="text-muted-foreground text-sm">{institution.ministry}</p>
      <div className="my-3">
        <StatusBadge status={institution.status} />
      </div>
      {/* TODO: per-document review list (accreditation_cert.pdf, etc.) - no
          document listing endpoint exists yet */}

      {error && (
        <p className="text-destructive text-sm">
          {(error as { message?: string })?.message ?? "Something went wrong"}
        </p>
      )}

      {isPending && (
        <div className="mt-4 flex flex-col gap-3">
          <Button
            onClick={() => approve.mutate(institutionId, { onSuccess: onDecided })}
            disabled={pending}
            className="w-fit"
          >
            Approve
          </Button>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Reason (required for Request Info / Suspend / Reject)</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pending || !reason}
              onClick={() =>
                requestInfo.mutate(
                  { id: institutionId, note: reason },
                  { onSuccess: onDecided }
                )
              }
            >
              Request info
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !reason}
              onClick={() =>
                reject.mutate({ id: institutionId, reason }, { onSuccess: onDecided })
              }
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      {institution.status === "APPROVED" && (
        <div className="mt-4 flex flex-col gap-3">
          <Label htmlFor="reason">Reason</Label>
          <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            variant="destructive"
            disabled={pending || !reason}
            onClick={() =>
              suspend.mutate({ id: institutionId, reason }, { onSuccess: onDecided })
            }
            className="w-fit"
          >
            Suspend
          </Button>
          {/* TODO: revoke is a separate, permanent action with its own confirm copy */}
        </div>
      )}
    </div>
  )
}
