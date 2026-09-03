"use client"

import { useTranslations } from "next-intl"
import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"
import { PortalTopbar } from "@/shared/components/layout/portal-topbar"
import { RequireAuth } from "@/shared/hooks/useRequireAuth"
import { useInstitutions } from "@/features/accreditation"

export default function AuthorityLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("authority")
  const { data: pendingData } = useInstitutions("PENDING")
  const pendingCount = pendingData?.data.totalElements ?? 0

  const NAV_ITEMS = [
    { label: t("dashboard"), href: "/authority", icon: "space_dashboard" },
    { label: t("registry"), href: "/authority/registry", icon: "apartment", badge: pendingCount || undefined },
    { label: t("auditLog"), href: "/authority/audit-log", icon: "receipt_long" },
    { label: t("settings"), href: "/authority/settings", icon: "settings" },
  ]

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <PortalSidebar title="CertiChain" subtitle={t("portalSubtitle")} icon="verified_user" items={NAV_ITEMS} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f7f9fb]">
        <PortalTopbar title={`CertiChain — ${t("portalSubtitle")}`} />
        <RequireAuth role="ACCREDITATION_AUTHORITY">
          <div className="flex-1">{children}</div>
        </RequireAuth>
      </div>
    </div>
  )
}
