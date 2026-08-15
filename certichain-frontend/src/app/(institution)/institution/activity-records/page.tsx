"use client"

import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { StatusBadge } from "@/shared/components/status-badge"
import { Button } from "@/shared/components/ui/button"
import { TableSkeleton } from "@/shared/components/table-skeleton"
import { useCredentials } from "@/features/institution"

const COLUMNS = ["Graduate", "Date", "Status"]

export default function ActivityRecordsPage() {
  // No dedicated list endpoint - /credentials returns both types, filter here.
  const { data, isLoading } = useCredentials(0, 100)
  const records = (data?.data.content ?? []).filter((c) => c.type === "ACTIVITY_RECORD")

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold">Activity records</h1>
          <Button render={<Link href="/institution/activity-records/new">Issue Record</Link>} />
        </div>
        <TableSkeleton columns={COLUMNS} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold">Activity records</h1>
        <Button render={<Link href="/institution/activity-records/new">Issue Record</Link>} />
      </div>
      <div className="border-border bg-card overflow-hidden rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Graduate</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id} className={r.status === "REVOKED" ? "opacity-50" : undefined}>
                <TableCell>{r.graduateEmail}</TableCell>
                <TableCell>{new Date(r.issuedAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
