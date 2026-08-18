"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/shared/lib/utils"
import { useLogout } from "@/features/auth"

export interface SidebarNavItem {
  label: string
  href: string
  icon: string
  badge?: number
}

function NavLinks({
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  items: SidebarNavItem[]
  pathname: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[15px] font-medium transition-colors",
              active ? "bg-white/15 font-bold text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <span
              className="material-symbols-outlined shrink-0 text-xl leading-none"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className={cn("flex-1", collapsed && "sr-only")}>{item.label}</span>
            {!!item.badge && (
              <span
                className={cn(
                  "bg-destructive flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white",
                  collapsed && "sr-only"
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

// Sidebar is min-h-screen so it always reaches the viewport bottom even when
// the routed page's own content is short.
export function PortalSidebar({
  title,
  subtitle,
  icon,
  items,
}: {
  title: string
  subtitle?: string
  icon?: string
  items: SidebarNavItem[]
}) {
  const pathname = usePathname()
  const logout = useLogout()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <div className="bg-sidebar flex items-center justify-between px-3 py-2 text-white md:hidden">
        <span className="font-heading text-sm font-bold">{title}</span>
        <button type="button" onClick={() => setMobileOpen((o) => !o)} className="text-white/70 hover:text-white">
          <span className="material-symbols-outlined">{mobileOpen ? "close" : "menu"}</span>
        </button>
      </div>
      {mobileOpen && (
        <div className="bg-sidebar flex flex-col gap-1 px-3 py-4 text-white md:hidden">
          <NavLinks items={items} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </div>
      )}

      <aside
        className={cn(
          "bg-sidebar relative hidden min-h-screen shrink-0 flex-col justify-between text-white transition-[width] duration-250 ease-in-out md:flex",
          collapsed ? "w-16" : "w-72"
        )}
      >
        <div>
          <div className={cn("flex items-center gap-3 border-b border-white/10 px-5 py-5", collapsed && "justify-center px-2")}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white">
              <span className="material-symbols-outlined text-[20px]" style={{ color: "#02275A" }}>
                {icon ?? "workspace_premium"}
              </span>
            </div>
            <div className={cn(collapsed && "sr-only")}>
              <p className="font-heading m-0 text-lg font-extrabold leading-tight">{title}</p>
              {subtitle && <p className="m-0 text-xs text-white/60">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn("ml-auto text-white/50 hover:text-white", collapsed && "hidden")}
            >
              <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
            </button>
          </div>
          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="mx-auto mt-2 block text-white/50 hover:text-white"
              title="Expand sidebar"
            >
              <span className="material-symbols-outlined rotate-180 text-lg leading-none">chevron_left</span>
            </button>
          )}
          <div className="px-4 py-5">
            <NavLinks items={items} pathname={pathname} collapsed={collapsed} />
          </div>
        </div>
        <div className="flex flex-col gap-1 px-4 pb-5">
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            title={collapsed ? "Log out" : undefined}
            className="flex items-center gap-3 rounded-lg px-3.5 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg leading-none">logout</span>
            <span className={cn(collapsed && "sr-only")}>Log out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
