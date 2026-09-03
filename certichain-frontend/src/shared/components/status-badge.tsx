"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"

const STATUS_MAP: Record<string, { key: string; className: string }> = {
  ISSUED: { key: "issued", className: "bg-emerald-50 text-emerald-700" },
  REVOKED: { key: "revoked", className: "bg-red-50 text-destructive" },
  PENDING_CLAIM: { key: "pendingClaim", className: "bg-amber-50 text-amber-700" },
  OPEN: { key: "underReview", className: "bg-amber-50 text-amber-700" },
  UPHELD: { key: "upheld", className: "bg-red-50 text-destructive" },
  DISMISSED: { key: "dismissed", className: "bg-[#eef0f3] text-muted-foreground" },
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("common")
  const entry = STATUS_MAP[status]
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", entry?.className ?? "bg-[#eef0f3] text-muted-foreground")}>
      {entry ? t(entry.key) : status}
    </span>
  )
}
