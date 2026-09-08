import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"

// Auth pages sit outside every portal layout, so they bring their own
// namespace slice instead of inheriting the full dictionary.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { common, auth, error } = await getMessages()
  return (
    <NextIntlClientProvider messages={{ common, auth, error }}>
      {children}
    </NextIntlClientProvider>
  )
}
