import { getTranslations } from "next-intl/server"
import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"
import { PortalTopbar } from "@/shared/components/layout/portal-topbar"
import { RequireAuth } from "@/shared/hooks/useRequireAuth"

export default async function GraduateLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("graduate")
  const navItems = [
    { label: t("overview"), href: "/graduate", icon: "home" },
    { label: t("myCredentials"), href: "/graduate/credentials", icon: "badge" },
    { label: t("timeline"), href: "/graduate/timeline", icon: "schedule" },
    { label: t("myShares"), href: "/graduate/shares", icon: "ios_share" },
    { label: t("disputes"), href: "/graduate/disputes", icon: "shield" },
    { label: t("settings"), href: "/graduate/settings", icon: "settings" },
  ]
  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <PortalSidebar title="CertiChain" subtitle={t("walletSubtitle")} icon="workspace_premium" items={navItems} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f7f9fb]">
        <PortalTopbar title={t("portalTitle")} />
        <RequireAuth role="GRADUATE">
          <div className="flex-1">{children}</div>
        </RequireAuth>
      </div>
    </div>
  )
}
