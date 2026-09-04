"use client"

import { useTranslations } from "next-intl"
import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"
import type { SidebarNavItem } from "@/shared/components/layout/portal-sidebar"
import { PortalTopbar } from "@/shared/components/layout/portal-topbar"
import { RequireAuth } from "@/shared/hooks/useRequireAuth"
import { useInstitutionMe } from "@/features/institution"

function PendingReviewBanner() {
  const t = useTranslations("institution")
  const { data: institution } = useInstitutionMe()
  if (!institution || institution.status === "APPROVED") return null

  const copy: Record<string, string> = {
    PENDING: t("pendingBanner"),
    SUSPENDED: t("suspendedBanner"),
    REJECTED: t("rejectedBanner"),
    REVOKED: t("revokedBanner"),
  }

  return (
    <div className="flex items-center gap-2.5 border-b border-[#c5c6cf] bg-[#fff4e5] px-6 py-3">
      <span className="material-symbols-outlined" style={{ color: "#8a5a00" }}>schedule</span>
      <p className="m-0 text-sm font-semibold" style={{ color: "#8a5a00" }}>
        {copy[institution.status] ?? copy.PENDING}
      </p>
    </div>
  )
}

export function InstitutionShell({
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
  navItems: SidebarNavItem[]
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <PortalSidebar title={title} subtitle={subtitle} icon="account_balance" items={navItems} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f7f9fb]">
        <PortalTopbar title={topbarTitle} />
        <RequireAuth role="INSTITUTION">
          <PendingReviewBanner />
          <div className="flex-1">{children}</div>
        </RequireAuth>
      </div>
    </div>
  )
}
