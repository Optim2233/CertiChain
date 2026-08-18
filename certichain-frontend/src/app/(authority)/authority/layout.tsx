"use client"

import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"
import { PortalTopbar } from "@/shared/components/layout/portal-topbar"
import { RequireAuth } from "@/shared/hooks/useRequireAuth"
import { useInstitutions } from "@/features/accreditation"

export default function AuthorityLayout({ children }: { children: React.ReactNode }) {
  const { data: pendingData } = useInstitutions("PENDING")
  const pendingCount = pendingData?.data.totalElements ?? 0

  const NAV_ITEMS = [
    { label: "Dashboard", href: "/authority", icon: "space_dashboard" },
    { label: "Registry", href: "/authority/registry", icon: "apartment", badge: pendingCount || undefined },
    { label: "Audit Log", href: "/authority/audit-log", icon: "receipt_long" },
    { label: "Profile Settings", href: "/authority/settings", icon: "settings" },
  ]

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <PortalSidebar title="CertiChain" subtitle="Accreditation Authority" icon="verified_user" items={NAV_ITEMS} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f7f9fb]">
        <PortalTopbar title="CertiChain — Accreditation Authority" />
        <RequireAuth role="ACCREDITATION_AUTHORITY">
          <div className="flex-1">{children}</div>
        </RequireAuth>
      </div>
    </div>
  )
}
