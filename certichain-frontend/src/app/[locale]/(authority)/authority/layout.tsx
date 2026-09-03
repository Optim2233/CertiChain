import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { AuthorityShell } from "./authority-shell"

export interface AuthorityNavItem {
  label: string
  href: string
  icon: string
  badged?: boolean
}

export default async function AuthorityLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("authority")
  const { common, authority, error } = await getMessages()
  const navItems: AuthorityNavItem[] = [
    { label: t("dashboard"), href: "/authority", icon: "space_dashboard" },
    { label: t("registry"), href: "/authority/registry", icon: "apartment", badged: true },
    { label: t("auditLog"), href: "/authority/audit-log", icon: "receipt_long" },
    { label: t("settings"), href: "/authority/settings", icon: "settings" },
  ]

  return (
    <NextIntlClientProvider messages={{ common, authority, error }}>
      <AuthorityShell
        title="CertiChain"
        subtitle={t("portalSubtitle")}
        topbarTitle={`CertiChain — ${t("portalSubtitle")}`}
        navItems={navItems}
      >
        {children}
      </AuthorityShell>
    </NextIntlClientProvider>
  )
}
