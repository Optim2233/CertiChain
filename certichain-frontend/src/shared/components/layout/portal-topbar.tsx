"use client"

import { useState } from "react"
import { useAuthStore } from "@/features/auth"
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "@/features/notification"
import { TextSkeleton } from "@/shared/components/ui/skeletons"

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: unread } = useUnreadCount()
  const { data: page, isLoading } = useNotifications(0, 10)
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const unreadCount = unread?.data.unreadCount ?? 0
  const notifications = page?.data.content ?? []

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex size-8 items-center justify-center rounded-full text-[#44474e] hover:bg-[#f2f4f6]"
      >
        <span className="material-symbols-outlined text-xl">notifications</span>
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ background: "#C0392B" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-outside-to-close overlay, same trick used nowhere else yet but the
              simplest way to close a dropdown without a portal/menu library. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-80 rounded-lg border border-[#c5c6cf] bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-[#c5c6cf] px-4 py-3">
              <p className="m-0 text-sm font-bold">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="text-xs font-semibold"
                  style={{ color: "#005eb3" }}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  <TextSkeleton className="h-4 w-full" />
                  <TextSkeleton className="h-4 w-full" />
                  <TextSkeleton className="h-4 w-2/3" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="m-0 p-4 text-center text-sm text-[#75777f]">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.read && markRead.mutate(n.id)}
                    className="block w-full border-b border-[#f2f4f6] px-4 py-3 text-left last:border-b-0 hover:bg-[#f7f9fb]"
                    style={{ background: n.read ? "transparent" : "#eef5fc" }}
                  >
                    <p className="m-0 text-sm font-semibold text-[#191c1e]">{n.type}</p>
                    <p className="m-0 mt-0.5 text-xs text-[#44474e]">{n.message}</p>
                    <p className="m-0 mt-1 text-[11px] text-[#9aa0aa]">{timeAgo(n.createdAt)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function PortalTopbar({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user)
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase()

  return (
    <header className="flex items-center gap-4 border-b border-[#c5c6cf] bg-white px-6 py-3">
      <h1 className="font-heading m-0 shrink-0 text-base font-bold" style={{ color: "#02275A" }}>
        {title}
      </h1>
      {/* ponytail: removed the decorative topbar search - it had no onChange
          and duplicated the working local search already on each list page.
          Add back only if a real cross-page/global search is built. */}
      <div className="ml-auto flex items-center gap-4">
        <NotificationBell />
        <div
          className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: "#02275A" }}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
