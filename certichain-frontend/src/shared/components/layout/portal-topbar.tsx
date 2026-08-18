"use client"

import { useAuthStore } from "@/features/auth"

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
        {/* ponytail: notification bell removed - no notifications endpoint
            exists, it had no click handler, dropdown, or unread badge. */}
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
