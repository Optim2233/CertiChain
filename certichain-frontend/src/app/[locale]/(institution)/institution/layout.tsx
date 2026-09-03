"use client"

import { useTranslations } from "next-intl"
import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"
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

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("institution")
  const tc = useTranslations("common")

  const NAV_ITEMS = [
    { label: t("dashboard"), href: "/institution", icon: "dashboard" },
    { label: t("issueNew"), href: "/institution/issue", icon: "add_circle" },
    { label: t("activityRecords"), href: "/institution/activity-records", icon: "history" },
    { label: t("batchIssuance"), href: "/institution/batch", icon: "upload_file" },
    { label: t("batches"), href: "/institution/batches", icon: "inventory_2" },
    { label: t("disputes"), href: "/institution/disputes", icon: "gavel" },
    { label: t("analytics"), href: "/institution/analytics", icon: "monitoring" },
    { label: t("settings"), href: "/institution/settings", icon: "settings" },
  ]

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <PortalSidebar title={tc("appName")} subtitle={t("portalSubtitle")} icon="account_balance" items={NAV_ITEMS} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f7f9fb]">
        <PortalTopbar title={`${tc("appName")} — ${t("portalSubtitle")}`} />
        <RequireAuth role="INSTITUTION">
          <PendingReviewBanner />
          <div className="flex-1">{children}</div>
        </RequireAuth>
      </div>
    </div>
  )
}
