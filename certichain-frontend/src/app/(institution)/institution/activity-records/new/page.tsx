"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { useIssueActivityRecord } from "@/features/institution"

export default function NewActivityRecordPage() {
  const router = useRouter()
  const [graduateEmail, setGraduateEmail] = useState("")
  const [activity, setActivity] = useState("")
  const [date, setDate] = useState("")
  const issue = useIssueActivityRecord()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    issue.mutate(
      { graduateEmail, activity, date },
      { onSuccess: () => router.push("/institution/activity-records") }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md p-6">
      <h1 className="mb-1 text-lg font-semibold">Issue activity record</h1>
      <p className="text-muted-foreground mb-4 text-sm">
        Factual, event-based only — no ratings or remarks. Signed the same
        way as a certificate.
      </p>
      {issue.isError && (
        <p className="text-destructive mb-2 text-sm">
          {(issue.error as { message?: string })?.message ?? "Something went wrong"}
        </p>
      )}
      <div className="flex flex-col gap-3">
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
        <Button type="submit" disabled={issue.isPending} className="w-fit">
          {issue.isPending ? "Signing…" : "Sign & issue"}
        </Button>
      </div>
    </form>
  )
}
