"use client"

import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"
import { PortalTopbar } from "@/shared/components/layout/portal-topbar"
import { RequireAuth } from "@/shared/hooks/useRequireAuth"
import { useInstitutionMe } from "@/features/institution"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/institution", icon: "dashboard" },
  { label: "Issue New", href: "/institution/issue", icon: "add_circle" },
  { label: "Activity Records", href: "/institution/activity-records", icon: "history" },
  { label: "Batch Issuance", href: "/institution/batch", icon: "upload_file" },
  { label: "Disputes", href: "/institution/disputes", icon: "gavel" },
  { label: "Analytics", href: "/institution/analytics", icon: "monitoring" },
  { label: "Settings", href: "/institution/settings", icon: "settings" },
]

function PendingReviewBanner() {
  const { data: institution } = useInstitutionMe()
  if (!institution || institution.status === "APPROVED") return null

  const copy: Record<string, string> = {
    PENDING: "Your application is still under review by the Accreditation Authority. You can't issue certificates or records until it's approved.",
    SUSPENDED: "Your accreditation is currently suspended. You can't issue new certificates or records until it's reinstated.",
    REJECTED: "Your application was rejected. You can't issue certificates or records.",
    REVOKED: "Your accreditation has been revoked. You can't issue certificates or records.",
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
  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <PortalSidebar title="CertiChain" subtitle="Institution Portal" icon="account_balance" items={NAV_ITEMS} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f7f9fb]">
        <PortalTopbar title="CertiChain — Institution Portal" />
        <RequireAuth role="INSTITUTION">
          <PendingReviewBanner />
          <div className="flex-1">{children}</div>
        </RequireAuth>
      </div>
    </div>
  )
}
