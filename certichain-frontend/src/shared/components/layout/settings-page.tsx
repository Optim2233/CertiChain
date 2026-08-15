"use client"

import { useState } from "react"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useAuthStore, useMe } from "@/features/auth"

// Shared Profile Settings layout (avatar card + Account Info / Notification
// toggles / Security cards) reused across Institution, Accreditation
// Authority, and Graduate portals per the design unification audit.
//
// ponytail: notification prefs and password change have no backend endpoint
// yet - toggles/fields are local UI state only, not persisted. Wire once
// PATCH /api/auth/me and a password-change endpoint exist.
export function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const { isLoading: meLoading } = useMe()
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyProduct, setNotifyProduct] = useState(false)

  if (!user && meLoading) {
    return (
      <div className="grid gap-6 p-6 md:grid-cols-[16rem_1fr]">
        <div className="border-border bg-card flex flex-col items-center gap-2 self-start rounded-lg border p-6">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-border bg-card rounded-lg border p-4">
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 p-6 md:grid-cols-[16rem_1fr]">
      <div className="border-border bg-card flex flex-col items-center gap-2 self-start rounded-lg border p-6 text-center">
        <div className="bg-accent text-accent-foreground flex size-16 items-center justify-center rounded-full text-xl font-semibold">
          {user?.email?.[0]?.toUpperCase() ?? "?"}
        </div>
        <p className="truncate text-sm font-semibold">{user?.email ?? "—"}</p>
        <p className="text-muted-foreground text-xs capitalize">{user?.role?.toLowerCase().replaceAll("_", " ") ?? ""}</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="border-border bg-card rounded-lg border p-4">
          <h2 className="mb-3 font-heading text-sm font-bold">Account information</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" value={user?.email ?? ""} disabled />
          </div>
        </div>

        <div className="border-border bg-card rounded-lg border p-4">
          <h2 className="mb-3 font-heading text-sm font-bold">Notification preferences</h2>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center justify-between">
              Email notifications
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between">
              Product updates
              <input
                type="checkbox"
                checked={notifyProduct}
                onChange={(e) => setNotifyProduct(e.target.checked)}
              />
            </label>
          </div>
        </div>

        <div className="border-border bg-card rounded-lg border p-4">
          <h2 className="mb-3 font-heading text-sm font-bold">Security</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-new-password">New password</Label>
            <Input id="settings-new-password" type="password" placeholder="••••••••" disabled />
            <Button type="button" variant="outline" size="sm" className="w-fit" disabled>
              Change password
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
