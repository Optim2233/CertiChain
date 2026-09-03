import { Link } from "@/i18n/navigation"
import { cn } from "@/shared/lib/utils"

export interface SummaryBlock {
  label: string
  value: number | string
  type?: "attention" | "passive"
  href?: string
}

export function SummaryBar({ blocks }: { blocks: SummaryBlock[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {blocks.map((b) => {
        const flagged = b.type === "attention" && Number(b.value) > 0
        const content = (
          <div className={cn("border-border bg-card rounded-lg border p-4", flagged && "border-destructive/40 bg-red-50")}>
            <p className={cn("font-heading text-2xl font-bold", flagged && "text-destructive")}>{b.value}</p>
            <p className="text-muted-foreground text-xs">{b.label}</p>
          </div>
        )
        return b.href ? (
          <Link key={b.label} href={b.href} className="block">
            {content}
          </Link>
        ) : (
          <div key={b.label}>{content}</div>
        )
      })}
    </div>
  )
}
