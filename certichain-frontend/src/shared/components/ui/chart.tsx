"use client"
import * as React from "react"
import { cn } from "@/shared/lib/utils"
export function ChartContainer({ className, children, config: _c, ...props }: React.HTMLAttributes<HTMLDivElement> & { config?: Record<string, { label: string; color: string }> }) {
  return <div className={cn("w-full", className)} {...props}>{children}</div>
}
export function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name ?? p.dataKey}: <span className="font-semibold">{p.value}</span></p>
      ))}
    </div>
  )
}
