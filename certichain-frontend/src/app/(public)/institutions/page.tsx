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
import { TableSkeleton } from "@/shared/components/table-skeleton"
import { usePublicInstitutions } from "@/features/verifier"
import { cn } from "@/shared/lib/utils"

const COLUMNS = ["Name", "Ministry", "Status"]

export default function PublicInstitutionsPage() {
  const { data, isLoading } = usePublicInstitutions()
  const institutions = data?.data ?? []

  const header = (
    <>
      <h1 className="font-heading text-xl font-bold">Accredited institutions</h1>
      <p className="text-muted-foreground mb-4 text-sm">
        No login required — pending, rejected, and revoked institutions are
        not listed here. Suspended institutions are shown, dimmed.
      </p>
    </>
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        {header}
        <TableSkeleton columns={COLUMNS} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {header}
      <div className="border-border bg-card overflow-hidden rounded-lg border shadow-[0_8px_30px_rgba(42,77,215,0.06)]">
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
    </div>
  )
}
