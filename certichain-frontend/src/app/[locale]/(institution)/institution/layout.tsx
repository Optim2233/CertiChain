import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { InstitutionShell } from "./institution-shell"
import type { SidebarNavItem } from "@/shared/components/layout/portal-sidebar"

export default async function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("institution")
  const tc = await getTranslations("common")
  const { common, institution, error } = await getMessages()
  const navItems: SidebarNavItem[] = [
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
    <NextIntlClientProvider messages={{ common, institution, error }}>
      <InstitutionShell
        title={tc("appName")}
        subtitle={t("portalSubtitle")}
        topbarTitle={`${tc("appName")} — ${t("portalSubtitle")}`}
        navItems={navItems}
      >
        {children}
      </InstitutionShell>
    </NextIntlClientProvider>
  )
}
