"use client"

import Link from "next/link"
import { StatusBadge } from "@/shared/components/status-badge"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useAuthStore } from "@/features/auth"
import { useTimeline } from "@/features/graduate"

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <p className="font-heading text-2xl font-bold">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
      {sub && <p className="text-primary mt-1 text-xs">{sub}</p>}
    </div>
  )
}

export default function GraduateOverviewPage() {
  const user = useAuthStore((state) => state.user)
  const { data, isLoading } = useTimeline()
  const timeline = data?.data ?? []

  if (isLoading) {
    return (
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_18rem]">
        <div>
          <Skeleton className="mb-1 h-6 w-48" />
          <Skeleton className="mb-4 h-4 w-64" />
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-border bg-card rounded-lg border p-4">
                <Skeleton className="mb-2 h-6 w-10" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="border-border bg-card h-fit rounded-lg border p-4">
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    )
  }

  const total = timeline.length
  const verified = timeline.filter((c) => c.status === "ISSUED").length
  const revoked = timeline.filter((c) => c.status === "REVOKED").length
  const recent = [...timeline]
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    .slice(0, 5)

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_18rem]">
      <div>
        <h1 className="font-heading text-xl font-bold">
          Good morning, {user?.email?.split("@")[0] ?? "there"} 👋
        </h1>
        <p className="text-muted-foreground mb-4 text-sm">
          Your credentials are safe, secure and under your control.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Total Credentials" value={total} />
          <StatTile label="Verified" value={verified} sub={total ? `${Math.round((verified / total) * 100)}% of total` : undefined} />
          <StatTile label="Revoked" value={revoked} />
          {/* ponytail: no aggregate dispute-count endpoint exists (only
              per-credential /flags) - omit rather than N+1 fetch every
              credential just for a stat tile. */}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-bold">My Credentials</h2>
          <Button size="sm" render={<Link href="/graduate/shares/new">+ Create Share</Link>} />
        </div>

        {timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm">No credentials yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {timeline.map((c) => (
              <li
                key={c.id}
                className={`border-border bg-card flex items-center justify-between rounded-lg border p-3 ${
                  c.status === "REVOKED" ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-lg">
                    <span className="material-symbols-outlined text-lg leading-none">
                      {c.type === "CERTIFICATE" ? "school" : "diversity_3"}
                    </span>
                  </span>
                  <div>
                    <p className="text-sm font-medium capitalize">{c.type.toLowerCase().replaceAll("_", " ")}</p>
                    <p className="text-muted-foreground text-xs">
                      Issued: {new Date(c.issuedAt).toLocaleDateString()} · {c.graduateEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.status} />
                  <Link
                    href={`/graduate/shares/new?credentialId=${c.id}`}
                    className="text-primary text-sm underline underline-offset-4"
                  >
                    Share
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="border-border bg-card h-fit rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Timeline</h2>
          <Link href="/graduate" className="text-primary text-xs underline underline-offset-4">
            View full timeline
          </Link>
        </div>
        <ul className="flex flex-col gap-3">
          {recent.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <span className="material-symbols-outlined mt-0.5 text-base leading-none text-muted-foreground">
                {c.type === "CERTIFICATE" ? "school" : "diversity_3"}
              </span>
              <div>
                <p className="font-medium capitalize">{c.type.toLowerCase().replaceAll("_", " ")}</p>
                <p className="text-muted-foreground text-xs">
                  {c.status === "REVOKED" ? "Revoked" : "Issued"} · {new Date(c.issuedAt).getFullYear()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
