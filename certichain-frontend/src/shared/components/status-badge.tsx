import { cn } from "@/shared/lib/utils"

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  ISSUED: { label: "Issued", className: "bg-emerald-50 text-emerald-700" },
  REVOKED: { label: "Revoked", className: "bg-red-50 text-destructive" },
  PENDING_CLAIM: { label: "Pending Claim", className: "bg-amber-50 text-amber-700" },
  OPEN: { label: "Under Review", className: "bg-amber-50 text-amber-700" },
  UPHELD: { label: "Upheld", className: "bg-red-50 text-destructive" },
  DISMISSED: { label: "Dismissed", className: "bg-[#eef0f3] text-muted-foreground" },
}

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status] ?? { label: status, className: "bg-[#eef0f3] text-muted-foreground" }
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", entry.className)}>
      {entry.label}
    </span>
  )
}
