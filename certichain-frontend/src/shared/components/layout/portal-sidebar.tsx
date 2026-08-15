"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/shared/lib/utils"
import { useLogout } from "@/features/auth"
import { Button } from "@/shared/components/ui/button"

// Plain nav, not shadcn's sidebar block — that block needs the same
// registry fetch that's network-blocked in this environment, and a
// collapsible/mobile-sheet sidebar isn't needed for placeholder screens.
// Swap in the shadcn sidebar component later if that behavior is wanted.
export function PortalSidebar({
  title,
  items,
}: {
  title: string
  items: { label: string; href: string }[]
}) {
  const pathname = usePathname()
  const logout = useLogout()

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex w-64 shrink-0 flex-col justify-between px-3 py-4">
      <div>
        <div className="px-2 pb-4 font-heading text-sm font-bold">{title}</div>
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded px-2 py-1.5 text-sm transition-colors border-l-2",
                  active
                    ? "bg-sidebar-accent border-sidebar-primary text-white"
                    : "border-transparent text-white/70 hover:bg-sidebar-accent hover:text-white"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2 justify-start gap-1.5 text-white/70 hover:bg-sidebar-accent hover:text-white"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
      >
        <span className="material-symbols-outlined text-base leading-none">logout</span>
        Log out
      </Button>
    </aside>
  )
}
