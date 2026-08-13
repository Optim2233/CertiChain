import { Badge, type badgeVariants } from "@/shared/components/ui/badge"
import type { VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/utils"

// One shared status -> color mapping for every portal, per
// wireframes-reference.md: resist inventing a badge per screen.
// The shadcn Badge only ships default/secondary/destructive/outline/ghost/link
// variants (no warning/success) - "outline" + a semantic text color stands in.
const STATUS_STYLE: Record<
  string,
  { variant: VariantProps<typeof badgeVariants>["variant"]; className?: string }
> = {
  pending: { variant: "outline", className: "border-amber-500/50 text-amber-600 dark:text-amber-400" },
  approved: { variant: "outline", className: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" },
  issued: { variant: "outline", className: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" },
  verified: { variant: "outline", className: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" },
  valid: { variant: "outline", className: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" },
  suspended: { variant: "outline", className: "border-amber-500/50 text-amber-600 dark:text-amber-400" },
  rejected: { variant: "destructive" },
  revoked: { variant: "destructive" },
  invalid: { variant: "destructive" },
  error: { variant: "destructive" },
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase()
  const style = STATUS_STYLE[key] ?? { variant: "secondary" as const }
  return (
    <Badge variant={style.variant} className={cn("capitalize", style.className)}>
      {key.replaceAll("_", " ")}
    </Badge>
  )
}
