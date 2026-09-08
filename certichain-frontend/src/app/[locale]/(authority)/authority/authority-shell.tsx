"use client"

import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"
import { PortalTopbar } from "@/shared/components/layout/portal-topbar"
import { RequireAuth } from "@/shared/hooks/useRequireAuth"
import { useInstitutions } from "@/features/accreditation"
import type { AuthorityNavItem } from "./layout"

export function AuthorityShell({
  children,
  title,
  subtitle,
  topbarTitle,
  navItems,
}: {
  children: React.ReactNode
  title: string
  subtitle: string
  topbarTitle: string
  navItems: AuthorityNavItem[]
}) {
  const { data: pendingData } = useInstitutions("PENDING")
  const pendingCount = pendingData?.data.totalElements ?? 0
  const items = navItems.map((item) => ({
    href: item.href,
    icon: item.icon,
    label: item.label,
    badge: item.badged ? pendingCount || undefined : undefined,
  }))

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <PortalSidebar title={title} subtitle={subtitle} icon="verified_user" items={items} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f7f9fb]">
        <PortalTopbar title={topbarTitle} />
        <RequireAuth role="ACCREDITATION_AUTHORITY">
          <div className="flex-1">{children}</div>
        </RequireAuth>
      </div>
    </div>
  )
}
