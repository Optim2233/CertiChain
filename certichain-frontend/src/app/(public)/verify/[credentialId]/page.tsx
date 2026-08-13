"use client"

import { use } from "react"
import { useQuery } from "@tanstack/react-query"
import { verifierService } from "@/features/verifier"
import { StatusBadge } from "@/shared/components/status-badge"

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

  if (isLoading || !response) return <div className="mx-auto max-w-lg p-6 text-sm">Loading…</div>

  const data = response.data

  if (data.result === "INVALID_NOT_FOUND") {
    return (
      <div className="mx-auto max-w-lg p-6">
        <StatusBadge status="invalid" />
        <h1 className="mt-2 text-lg font-semibold">Invalid / Not Found</h1>
        <p className="text-muted-foreground text-sm">
          No matching certificate, or content doesn&apos;t match its
          signature.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <StatusBadge status={data.result} />
      <h1 className="mt-2 text-lg font-semibold">{data.credentialTitle}</h1>
      <p className="text-muted-foreground text-sm">Issued to: {data.issuedTo}</p>

      {data.result === "REVOKED" && (
        <p className="mt-4 text-sm">
          This credential was revoked by the issuing institution. Signature
          was valid; status overrides it.
        </p>
      )}

      <div className="mt-4 rounded-lg border p-4 text-sm">
        <p>Issuer: {data.institutionName}</p>
        <p>
          Accreditation status: <StatusBadge status={data.institutionStatus ?? "unknown"} />
        </p>
        {data.issuedAt && <p>Issued: {new Date(data.issuedAt).toLocaleDateString()}</p>}
      </div>

      {data.disclosedFields.length > 0 && (
        <div className="mt-4 text-sm">
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
