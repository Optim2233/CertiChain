"use client"

import Link from "next/link"
import { StatusBadge } from "@/shared/components/status-badge"
import { useTimeline } from "@/features/graduate"

export default function TimelinePage() {
  const { data, isLoading } = useTimeline()
  const timeline = data?.data ?? []

  if (isLoading) return <div className="p-6 text-sm">Loading…</div>

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Timeline</h1>
      <ul className="flex flex-col gap-3">
        {timeline.map((c) => (
          <li
            key={c.id}
            className={`flex items-center justify-between rounded-lg border p-3 ${
              c.status === "REVOKED" ? "opacity-50" : ""
            }`}
          >
            <div>
              <p className="text-sm font-medium capitalize">{c.type.toLowerCase().replaceAll("_", " ")}</p>
              <p className="text-muted-foreground text-xs">
                {new Date(c.issuedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={c.status} />
              <Link
                href={`/graduate/shares/new?credentialId=${c.id}`}
                className="text-primary text-sm underline underline-offset-4"
              >
                + Create share
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
