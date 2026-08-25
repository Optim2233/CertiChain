"use client"

import { useState } from "react"
import Link from "next/link"
import { CredentialCard } from "@/shared/components/credential-card"
import { useTimeline } from "@/features/graduate"
import { Skeleton } from "@/shared/components/ui/skeleton"

const FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Certificates", value: "CERTIFICATE" },
  { label: "Activity Records", value: "ACTIVITY_RECORD" },
] as const

export default function GraduateCredentialsPage() {
  const [filter, setFilter] = useState<string>("ALL")
  const { data, isLoading } = useTimeline()
  const credentials = data?.data ?? []
  const visible = filter === "ALL" ? credentials : credentials.filter((c) => c.type === filter)

  return (
    <div className="p-6">
      <h1 className="font-heading text-xl font-bold">My Credentials</h1>
      <p className="text-muted-foreground mb-4 text-sm">Every certificate and activity record issued to you.</p>

      <div className="mb-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
              (filter === f.value
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-muted-foreground hover:border-primary/50")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px] rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">No credentials in this category.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <Link key={c.id} href={"/graduate/credentials/" + c.id}>
              <CredentialCard
                id={c.id}
                type={c.type}
                title={c.type === "CERTIFICATE" ? "Certificate" : "Activity Record"}
                subtitle={c.graduateEmail + " · " + new Date(c.issuedAt).toLocaleDateString()}
                status={c.status}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
