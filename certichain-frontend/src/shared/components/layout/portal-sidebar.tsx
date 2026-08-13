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
    <aside className="flex w-56 shrink-0 flex-col justify-between border-r px-3 py-4">
      <div>
        <div className="px-2 pb-4 text-sm font-semibold">{title}</div>
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
        className="justify-start"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
      >
        Log out
      </Button>
    </aside>
  )
}
