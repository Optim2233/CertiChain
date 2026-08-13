import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/institution" },
  { label: "Issue New", href: "/institution/issue" },
  { label: "Activity Records", href: "/institution/activity-records" },
  { label: "Settings", href: "/institution/settings" },
]

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <PortalSidebar title="Institution" items={NAV_ITEMS} />
      <div className="flex-1">{children}</div>
    </div>
  )
}
