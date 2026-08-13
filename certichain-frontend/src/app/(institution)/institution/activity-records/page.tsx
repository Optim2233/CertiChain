"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { StatusBadge } from "@/shared/components/status-badge"
import { useCredentials } from "@/features/institution"

export default function ActivityRecordsPage() {
  // No dedicated list endpoint - /credentials returns both types, filter here.
  const { data, isLoading } = useCredentials(0, 100)
  const records = (data?.data.content ?? []).filter((c) => c.type === "ACTIVITY_RECORD")

  if (isLoading) return <div className="p-6 text-sm">Loading…</div>

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Activity records</h1>
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
            <TableRow key={r.id}>
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
  )
}
