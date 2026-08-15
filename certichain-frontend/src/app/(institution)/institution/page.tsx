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
import { useInstitutionMe, useCredentials } from "@/features/institution"

const COLUMNS = ["Graduate", "Type", "Status", "Date"]

export default function InstitutionDashboardPage() {
  const { data: me, isLoading: meLoading } = useInstitutionMe()
  const approved = me?.status === "APPROVED"

  const { data: credentialsData, isLoading: credentialsLoading } = useCredentials(0, 20)

  if (meLoading) {
    return (
      <div className="p-6">
        <h1 className="mb-4 font-heading text-xl font-bold">Issued credentials</h1>
        <TableSkeleton columns={COLUMNS} />
      </div>
    )
  }

  if (me && !approved) {
    return (
      <div className="max-w-md p-6">
        <h1 className="mb-2 text-lg font-semibold">
          Accreditation {me.status.toLowerCase()}
        </h1>
        {me.status === "SUSPENDED" && (
          <p className="text-sm">
            You can&apos;t issue new certificates until reinstated by the
            Accreditation Authority.
          </p>
        )}
        {me.status === "PENDING" && (
          <p className="text-sm">Your application is still under review.</p>
        )}
        {me.statusReason && <p className="text-muted-foreground mt-2 text-sm">{me.statusReason}</p>}
      </div>
    )
  }

  if (credentialsLoading) {
    return (
      <div className="p-6">
        <h1 className="mb-4 font-heading text-xl font-bold">Issued credentials</h1>
        <TableSkeleton columns={COLUMNS} />
      </div>
    )
  }

  const credentials = credentialsData?.data.content ?? []

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold">Issued credentials</h1>
        <Button render={<Link href="/institution/issue">Issue New</Link>} />
      </div>
      <div className="border-border bg-card overflow-hidden rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Graduate</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credentials.map((c) => (
              <TableRow key={c.id} className={c.status === "REVOKED" ? "opacity-50" : undefined}>
                <TableCell>{c.graduateEmail}</TableCell>
                <TableCell className="capitalize">{c.type.toLowerCase()}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell>{new Date(c.issuedAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
