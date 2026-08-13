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
import { useInstitutionMe, useCredentials } from "@/features/institution"

export default function InstitutionDashboardPage() {
  const { data: me, isLoading: meLoading } = useInstitutionMe()
  const approved = me?.status === "APPROVED"

  const { data: credentialsData, isLoading: credentialsLoading } = useCredentials(0, 20)

  if (meLoading) return <div className="p-6 text-sm">Loading…</div>

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

  if (credentialsLoading) return <div className="p-6 text-sm">Loading…</div>

  const credentials = credentialsData?.data.content ?? []

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Issued credentials</h1>
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
  )
}
