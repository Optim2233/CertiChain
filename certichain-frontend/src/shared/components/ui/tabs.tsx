"use client"
import * as React from "react"
import { cn } from "@/shared/lib/utils"
const Ctx = React.createContext<{ value: string; onChange: (v: string) => void } | null>(null)
export function Tabs({ value, onValueChange, children, className }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return <Ctx.Provider value={{ value, onChange: onValueChange }}><div className={className}>{children}</div></Ctx.Provider>
}
export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("inline-flex items-center rounded-lg bg-accent/40 p-1 gap-1", className)}>{children}</div>
}
export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(Ctx)!
  const active = ctx.value === value
  return <button type="button" onClick={() => ctx.onChange(value)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", active ? "bg-card shadow-sm border border-border" : "text-muted-foreground hover:text-foreground", className)}>{children}</button>
}
