import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"
import { PortalTopbar } from "@/shared/components/layout/portal-topbar"
import { RequireAuth } from "@/shared/hooks/useRequireAuth"

const NAV_ITEMS = [
  { label: "Overview", href: "/graduate", icon: "home" },
  { label: "My Credentials", href: "/graduate/credentials", icon: "badge" },
  { label: "Timeline", href: "/graduate/timeline", icon: "schedule" },
  { label: "My Shares", href: "/graduate/shares", icon: "ios_share" },
  { label: "Disputes", href: "/graduate/disputes", icon: "shield" },
  { label: "Settings", href: "/graduate/settings", icon: "settings" },
]

export default function GraduateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <PortalSidebar title="CertiChain" subtitle="Graduate Wallet" icon="workspace_premium" items={NAV_ITEMS} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f7f9fb]">
        <PortalTopbar title="CertiChain — Graduate Portal" />
        <RequireAuth role="GRADUATE">
          <div className="flex-1">{children}</div>
        </RequireAuth>
      </div>
    </div>
  )
}
