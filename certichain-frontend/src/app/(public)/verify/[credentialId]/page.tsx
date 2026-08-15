"use client"

import { use } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { verifierService } from "@/features/verifier"
import { StatusBadge } from "@/shared/components/status-badge"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"

export default function VerifyResultPage({
  params,
}: {
  params: Promise<{ credentialId: string }>
}) {
  const { credentialId } = use(params)

  const { data: response, isLoading } = useQuery({
    queryKey: ["verify-certificate", credentialId],
    // A malformed id (not a UUID) 400s at the path-variable level rather than
    // returning INVALID_NOT_FOUND - treat it the same way in the UI.
    queryFn: () =>
      verifierService.verifyCertificate(credentialId).catch(() => ({
        data: {
          result: "INVALID_NOT_FOUND" as const,
          credentialTitle: null,
          issuedTo: null,
          institutionName: null,
          institutionStatus: null,
          issuedAt: null,
          revokedAt: null,
          disclosedFields: [],
          signatureDetails: null,
        },
        status: 200,
      })),
  })

  if (isLoading || !response) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-4 p-6">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  const data = response.data

  if (data.result === "INVALID_NOT_FOUND") {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-destructive">cancel</span>
        <h1 className="font-heading text-xl font-bold">Invalid / Not Found</h1>
        <p className="text-muted-foreground text-sm">
          No matching certificate, or content doesn&apos;t match its
          signature.
        </p>
        <Button render={<Link href="/verify">Back to Verification</Link>} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-4 p-6">
      {data.result === "VERIFIED" && (
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="material-symbols-outlined text-6xl text-emerald-600">check_circle</span>
          <h1 className="font-heading text-xl font-bold">Certificate Verified</h1>
          <p className="text-muted-foreground text-sm">
            This credential&apos;s signature is valid and its issuer is currently accredited.
          </p>
        </div>
      )}

      {data.result === "REVOKED" && (
        <div className="flex flex-col items-center gap-2 text-center">
          <StatusBadge status={data.result} />
          <h1 className="font-heading text-xl font-bold">{data.credentialTitle}</h1>
          <p className="text-sm">
            This credential was revoked by the issuing institution. Signature
            was valid; status overrides it.
          </p>
        </div>
      )}

      <div className="border-border bg-card rounded-lg border p-4 text-sm shadow-[0_8px_30px_rgba(42,77,215,0.06)]">
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">Certificate Holder</dt>
            <dd>{data.issuedTo ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">Degree</dt>
            <dd>{data.credentialTitle ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">Issue Date</dt>
            <dd>{data.issuedAt ? new Date(data.issuedAt).toLocaleDateString() : "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">Issuing Authority</dt>
            <dd className="flex items-center gap-1.5">
              {data.institutionName ?? "—"}
              <StatusBadge status={data.institutionStatus ?? "unknown"} />
            </dd>
          </div>
        </dl>
      </div>

      {data.disclosedFields.length > 0 && (
        <div className="text-sm">
          <p className="text-muted-foreground mb-1">
            Only fields the graduate chose to share are shown.
          </p>
          <ul className="flex flex-col gap-1">
            {data.disclosedFields.map((f) => (
              <li key={f.name}>
                <span className="font-medium">{f.name}:</span> {f.value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
