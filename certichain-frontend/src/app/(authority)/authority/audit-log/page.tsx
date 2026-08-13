"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { useAuditLog } from "@/features/accreditation"

export default function AuditLogPage() {
  const { data, isLoading } = useAuditLog(null)

  if (isLoading) return <div className="p-6 text-sm">Loading…</div>

  const entries = data?.data.content ?? []

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Audit log</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Actor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{new Date(entry.occurredAt).toLocaleString()}</TableCell>
              <TableCell>{entry.event}</TableCell>
              {/* No verifier_id is ever captured - a null actor on a verify
                  event means "anonymous verifier", not missing data. */}
              <TableCell>{entry.actorUserId ?? "anonymous verifier"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
