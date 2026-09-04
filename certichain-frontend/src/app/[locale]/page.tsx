import { getMessages } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"
import { LandingPageClient } from "@/features/landing/LandingPageClient"

export default async function LandingPage() {
  // The marketing landing sits outside every portal layout - ship only what it
  // needs: common (LocaleToggle), landing (all copy), error.
  const { common, error, landing } = await getMessages()
  return (
    <NextIntlClientProvider messages={{ common, error, landing }}>
      <LandingPageClient />
    </NextIntlClientProvider>
  )
}