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
import { TableSkeleton } from "@/shared/components/table-skeleton"
import { useInstitutions } from "@/features/accreditation"

const COLUMNS = ["Name", "Ministry", "Status", "Submitted", "Action"]

export default function RegistryPage() {
  const { data, isLoading } = useInstitutions(null)

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="mb-4 font-heading text-xl font-bold">Registry</h1>
        <TableSkeleton columns={COLUMNS} />
      </div>
    )
  }

  const institutions = data?.data.content ?? []

  return (
    <div className="p-6">
      <h1 className="mb-4 font-heading text-xl font-bold">Registry</h1>
      <div className="border-border bg-card overflow-hidden rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Ministry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {institutions.map((inst) => (
              <TableRow
                key={inst.id}
                className={inst.status === "REVOKED" || inst.status === "SUSPENDED" ? "opacity-50" : undefined}
              >
                <TableCell>{inst.name}</TableCell>
                <TableCell>{inst.ministry}</TableCell>
                <TableCell>
                  <StatusBadge status={inst.status} />
                </TableCell>
                <TableCell>{new Date(inst.appliedAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {inst.status === "PENDING" ? (
                    <Link
                      href={`/authority/registry/${inst.id}/review`}
                      className="text-primary underline underline-offset-4"
                    >
                      Review →
                    </Link>
                  ) : (
                    <Link
                      href={`/authority/registry/${inst.id}/review`}
                      className="text-muted-foreground underline underline-offset-4"
                    >
                      View →
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
