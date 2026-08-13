"use client"

import { useShares } from "@/features/graduate"

export default function SharesPage() {
  const { data, isLoading } = useShares()
  const shares = data?.data ?? []

  if (isLoading) return <div className="p-6 text-sm">Loading…</div>

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">My shares</h1>
      <ul className="flex flex-col gap-3">
        {shares.map((s) => (
          <li key={s.id} className={`rounded-lg border p-3 ${s.revoked ? "opacity-50" : ""}`}>
            <p className="text-sm font-medium">{s.name}</p>
            <p className="text-muted-foreground text-xs">
              {s.scope === "FULL_TIMELINE" ? "Full timeline" : "1 credential"}
              {s.revoked && " · revoked"}
            </p>
            <p className="mt-1 text-xs">/verify/share/{s.shareToken}</p>
            {/* TODO: QR code render + revoke action */}
          </li>
        ))}
      </ul>
    </div>
  )
}
