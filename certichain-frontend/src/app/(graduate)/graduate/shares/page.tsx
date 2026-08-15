"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { StatusBadge } from "@/shared/components/status-badge"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useShares, useRevokeShare } from "@/features/graduate"

export default function SharesPage() {
  const { data, isLoading } = useShares()
  const revokeShare = useRevokeShare()
  const [showRevoked, setShowRevoked] = useState(false)
  const shares = data?.data ?? []

  const header = (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="font-heading text-xl font-bold">My Shares</h1>
      <Button render={<Link href="/graduate/shares/new">+ Create Share</Link>} />
    </div>
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        {header}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-border bg-card rounded-lg border p-3">
              <Skeleton className="mb-2 h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const visible = shares.filter((s) => showRevoked || !s.revoked)

  return (
    <div className="mx-auto max-w-2xl p-6">
      {header}

      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">No shares yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((s) => (
            <li
              key={s.id}
              className={`border-border bg-card flex items-center justify-between rounded-lg border p-3 ${s.revoked ? "opacity-50" : ""}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{s.name}</p>
                  <StatusBadge status={s.revoked ? "revoked" : "valid"} />
                </div>
                <p className="text-muted-foreground text-xs">
                  {s.scope === "FULL_TIMELINE" ? "Full academic timeline" : "1 credential"}
                </p>
                <p className="text-primary mt-1 truncate text-xs">/verify/share/{s.shareToken}</p>
              </div>
              <div className="flex items-center gap-1">
                {/* ponytail: no `qrcode` dependency installed yet - QR render
                    deferred, flag before adding a new package. */}
                <Button variant="ghost" size="icon-sm" disabled title="QR code (needs qrcode dependency)">
                  <span className="material-symbols-outlined text-base leading-none">qr_code_2</span>
                </Button>
                {!s.revoked && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revokeShare.isPending}
                    onClick={() => revokeShare.mutate(s.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!showRevoked && shares.some((s) => s.revoked) && (
        <button
          type="button"
          onClick={() => setShowRevoked(true)}
          className="text-primary mt-3 text-sm underline underline-offset-4"
        >
          View revoked shares
        </button>
      )}
    </div>
  )
}
