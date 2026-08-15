import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"
import { RequireAuth } from "@/shared/hooks/useRequireAuth"

const NAV_ITEMS = [
  { label: "Registry", href: "/authority" },
  { label: "Audit Log", href: "/authority/audit-log" },
  { label: "Settings", href: "/authority/settings" },
]

export default function AuthorityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <PortalSidebar title="Accreditation Authority" items={NAV_ITEMS} />
      <div className="flex-1">
        <RequireAuth>{children}</RequireAuth>
      </div>
    </div>
  )
}
