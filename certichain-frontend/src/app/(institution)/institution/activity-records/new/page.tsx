"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { StatusBadge } from "@/shared/components/status-badge"
import { useIssueActivityRecord, useCredentials } from "@/features/institution"

export default function NewActivityRecordPage() {
  const router = useRouter()
  const [graduateEmail, setGraduateEmail] = useState("")
  const [activity, setActivity] = useState("")
  const [date, setDate] = useState("")
  const issue = useIssueActivityRecord()

  const { data } = useCredentials(0, 5)
  const recent = (data?.data.content ?? []).filter((c) => c.type === "ACTIVITY_RECORD").slice(0, 5)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    issue.mutate(
      { graduateEmail, activity, date },
      { onSuccess: () => router.push("/institution/activity-records") }
    )
  }

  return (
    <div className="grid gap-6 p-6 md:grid-cols-[1fr_20rem]">
      <form onSubmit={handleSubmit} className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
        <h1 className="font-heading text-xl font-bold">Issue activity record</h1>
        <p className="text-muted-foreground -mt-1 text-sm">
          Factual, event-based only — no ratings or remarks. Signed the same
          way as a certificate.
        </p>
        {issue.isError && (
          <p className="text-destructive text-sm">
            {(issue.error as { message?: string })?.message ?? "Something went wrong"}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="graduate-email">Graduate email</Label>
          <Input
            id="graduate-email"
            type="email"
            value={graduateEmail}
            onChange={(e) => setGraduateEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="activity">Activity / role</Label>
          <Input
            id="activity"
            placeholder="Club President"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <p className="text-muted-foreground text-xs">
          Once signed, this record is permanent and can only be revoked, not edited.
        </p>
        <Button type="submit" disabled={issue.isPending} className="w-fit">
          {issue.isPending ? "Signing…" : "Issue Record"}
        </Button>
      </form>

      <aside className="flex flex-col gap-4">
        <div className="border-border bg-accent text-accent-foreground rounded-lg border p-4 text-sm">
          <h2 className="mb-1 font-semibold">Guidance</h2>
          <p>
            Use activity records for club membership, leadership roles, or
            volunteering — factual events only, never evaluative content.
          </p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <h2 className="mb-2 text-sm font-semibold">Recent issuances</h2>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity records issued yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{r.graduateEmail}</span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
