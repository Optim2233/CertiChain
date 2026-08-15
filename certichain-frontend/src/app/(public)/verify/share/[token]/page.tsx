"use client"

import { use } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { verifierService } from "@/features/verifier"
import type { VerificationResponse } from "@/features/verifier"
import { StatusBadge } from "@/shared/components/status-badge"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"

export default function VerifyShareResultPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ["verify-share", token],
    queryFn: () => verifierService.verifyShare(token),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-4 p-6">
        <div className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (isError || !response) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-destructive">cancel</span>
        <h1 className="font-heading text-xl font-bold">Share link invalid or expired</h1>
        <p className="text-muted-foreground text-sm">
          This link may have been revoked by the graduate, or never existed.
        </p>
        <Button render={<Link href="/verify">Back to Verification</Link>} />
      </div>
    )
  }

  const entries = Array.isArray(response.data) ? response.data : [response.data]

  // Single-credential shares render exactly like a direct certificate lookup;
  // full-timeline shares render as a vertical timeline of every entry.
  if (entries.length === 1) {
    return <SingleResult entry={entries[0]} />
  }

  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="font-heading text-xl font-bold">Credential Timeline</h1>
      <ol className="border-border bg-card flex flex-col gap-4 rounded-lg border p-4 shadow-[0_8px_30px_rgba(42,77,215,0.06)]">
        {entries.map((entry, i) => (
          <li
            key={i}
            className={`flex items-start gap-3 ${entry.result === "REVOKED" ? "opacity-50" : ""}`}
          >
            <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{entry.credentialTitle ?? "Untitled credential"}</p>
                <StatusBadge status={entry.result} />
              </div>
              <p className="text-muted-foreground text-xs">
                {entry.institutionName ?? "Unknown issuer"}
                {entry.issuedAt ? ` · ${new Date(entry.issuedAt).toLocaleDateString()}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function SingleResult({ entry }: { entry: VerificationResponse }) {
  if (entry.result === "INVALID_NOT_FOUND") {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-destructive">cancel</span>
        <h1 className="font-heading text-xl font-bold">Invalid / Not Found</h1>
        <Button render={<Link href="/verify">Back to Verification</Link>} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-4 p-6">
      {entry.result === "VERIFIED" && (
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="material-symbols-outlined text-6xl text-emerald-600">check_circle</span>
          <h1 className="font-heading text-xl font-bold">Certificate Verified</h1>
        </div>
      )}
      {entry.result === "REVOKED" && (
        <div className="flex flex-col items-center gap-2 text-center">
          <StatusBadge status={entry.result} />
          <h1 className="font-heading text-xl font-bold">{entry.credentialTitle}</h1>
        </div>
      )}
      <div className="border-border bg-card rounded-lg border p-4 text-sm shadow-[0_8px_30px_rgba(42,77,215,0.06)]">
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">Certificate Holder</dt>
            <dd>{entry.issuedTo ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">Degree</dt>
            <dd>{entry.credentialTitle ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">Issuing Authority</dt>
            <dd>{entry.institutionName ?? "—"}</dd>
          </div>
        </dl>
      </div>
      {entry.disclosedFields.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {entry.disclosedFields.map((f) => (
            <li key={f.name}>
              <span className="font-medium">{f.name}:</span> {f.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
