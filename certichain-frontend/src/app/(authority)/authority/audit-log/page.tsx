"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { TableSkeleton } from "@/shared/components/table-skeleton"
import { useAuditLog } from "@/features/accreditation"

const COLUMNS = ["When", "Event", "Actor"]

export default function AuditLogPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useAuditLog(null, page)
  const [search, setSearch] = useState("")

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="mb-4 font-heading text-xl font-bold">Audit log</h1>
        <TableSkeleton columns={COLUMNS} />
      </div>
    )
  }

  const pageData = data?.data
  const entries = (pageData?.content ?? []).filter((entry) =>
    entry.event.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <h1 className="mb-4 font-heading text-xl font-bold">Audit log</h1>
      <Input
        placeholder="Search events…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-xs"
      />
      <div className="border-border bg-card overflow-hidden rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,.04)]">
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
                <TableCell>
                  <div>{entry.event}</div>
                  {(entry.institutionId || entry.credentialId) && (
                    <div className="text-muted-foreground text-xs italic">
                      {entry.institutionId ? `Institution #${entry.institutionId.slice(0, 8)}` : ""}
                      {entry.institutionId && entry.credentialId ? " · " : ""}
                      {entry.credentialId ? `Credential #${entry.credentialId.slice(0, 8)}` : ""}
                    </div>
                  )}
                </TableCell>
                {/* No verifier_id is ever captured - a null actor on a verify
                    event means "anonymous verifier", not missing data. */}
                <TableCell>{entry.actorEmail ?? "anonymous verifier"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pageData && pageData.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {pageData.number + 1} of {pageData.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageData.first}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pageData.last}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
