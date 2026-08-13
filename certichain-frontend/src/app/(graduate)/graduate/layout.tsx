import { PortalSidebar } from "@/shared/components/layout/portal-sidebar"

const NAV_ITEMS = [
  { label: "Timeline", href: "/graduate" },
  { label: "Shares", href: "/graduate/shares" },
  { label: "Settings", href: "/graduate/settings" },
]

export default function GraduateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <PortalSidebar title="Graduate" items={NAV_ITEMS} />
      <div className="flex-1">{children}</div>
    </div>
  )
}
