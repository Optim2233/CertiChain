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
import { usePublicInstitutions } from "@/features/verifier"
import { cn } from "@/shared/lib/utils"

export default function PublicInstitutionsPage() {
  const { data, isLoading } = usePublicInstitutions()
  const institutions = data?.data ?? []

  if (isLoading) return <div className="p-6 text-sm">Loading…</div>

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-lg font-semibold">Accredited institutions</h1>
      <p className="text-muted-foreground mb-4 text-sm">
        No login required — pending, rejected, and revoked institutions are
        not listed here. Suspended institutions are shown, dimmed.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Ministry</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {institutions.map((inst) => (
            <TableRow
              key={inst.id}
              className={cn(inst.status === "SUSPENDED" && "opacity-50")}
            >
              <TableCell>{inst.name}</TableCell>
              <TableCell>{inst.ministry}</TableCell>
              <TableCell>
                <StatusBadge status={inst.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
