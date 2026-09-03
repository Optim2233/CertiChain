import { getMessages, getTranslations } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"
import { Link } from "@/i18n/navigation"
import { CertiChainShield } from "@/shared/components/brand/CertiChainShield"

// Standalone chrome for QR/link landing - deliberately not VerifierLayout's full nav.
// Someone who scanned a QR wants the result, not a menu; kept to logo + a single
// "Verify another" link back into the full verifier flow.
export default async function ShareLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("share")
  const { common, share, error } = await getMessages()
  return (
    <NextIntlClientProvider messages={{ common, share, error }}>
    <div className="flex min-h-screen flex-col" style={{ background: "#f7f9fb", color: "#191c1e" }}>
      <header className="flex h-14 items-center justify-between border-b border-[#c5c6cf] bg-white px-4 sm:px-8">
        <Link href="/verify" className="flex items-center gap-2">
          <CertiChainShield size={22} />
          <span className="font-heading text-base font-extrabold" style={{ color: "#02275A" }}>CertiChain</span>
        </Link>
        <Link href="/verify" className="text-xs font-bold text-[#0462BA]">
          {t("verifyAnother")}
        </Link>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-[#c5c6cf] p-5">
        <p className="m-0 text-center text-xs text-[#9aa0aa]">
          {t("shareFooter")}
        </p>
      </footer>
    </div>
    </NextIntlClientProvider>
  )
}
