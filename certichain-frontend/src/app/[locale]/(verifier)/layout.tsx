import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { VerifierShell } from "./verifier-shell"

export interface VerifierNavItem {
  label: string
  href: string
}

export default async function VerifierLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("verifier")
  const { common, verifier, error } = await getMessages()
  const nav: VerifierNavItem[] = [
    { href: "/verify", label: t("verifyTitle") },
    { href: "/verify/bulk", label: t("forEmployersNav") },
  ]

  return (
    <NextIntlClientProvider messages={{ common, verifier, error }}>
      <VerifierShell footer={t("verifierFooter")} nav={nav}>
        {children}
      </VerifierShell>
    </NextIntlClientProvider>
  )
}
