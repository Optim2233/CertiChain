import { Skeleton } from "@/shared/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

// Layout-preserving loading state for table pages, shown instead of bare
// "Loading…" text - matches the card/border treatment tables get once
// populated so nothing jumps when real data lands.
export function TableSkeleton({ columns, rows = 5 }: { columns: string[]; rows?: number }) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col}>{col}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col}>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
