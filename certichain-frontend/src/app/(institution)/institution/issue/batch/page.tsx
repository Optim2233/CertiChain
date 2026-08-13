import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"

export default function BatchIssuePage() {
  return (
    <div className="max-w-2xl p-6">
      <h1 className="mb-2 text-lg font-semibold">Batch issuance</h1>
      <p className="text-muted-foreground mb-4 text-sm">
        {/* TODO: per-row error text (e.g. "(missing email)"), summary line,
            valid rows proceed even if some rows error */}
        Upload a spreadsheet. Valid rows can be issued even if some rows have
        errors.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Row</TableHead>
            <TableHead>Graduate</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody />
      </Table>
      <Button className="mt-4">Issue valid rows</Button>
    </div>
  )
}
