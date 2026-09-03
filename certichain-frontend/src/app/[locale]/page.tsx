import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { AuthBrandPanel } from "@/features/auth/components/AuthBrandPanel"
import { LocaleToggle } from "@/shared/components/locale-toggle"

export default async function LandingPage() {
  const t = await getTranslations("common")
  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel
        icon="verified_user"
        heading={t("heroTitle")}
        body={t("heroSubtitle")}
        footer={t("trustedBy")}
      />
      <main className="flex flex-1 flex-col items-center justify-center px-6" style={{ background: "#f7f9fb" }}>
        <div className="mb-6 self-end">
          <LocaleToggle />
        </div>
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <span className="material-symbols-outlined text-4xl" style={{ color: "#02275A" }}>verified_user</span>
          <h1 className="font-heading m-0 text-4xl font-extrabold" style={{ color: "#02275A" }}>{t("appName")}</h1>
        </div>
        <p className="mb-10 max-w-[480px] text-center text-base text-[#44474e]">
          {t("heroSubtitle")}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/verify" className="rounded px-7 py-3.5 text-sm font-bold text-white" style={{ background: "#0462BA" }}>
            {t("verifyCertificate")}
          </Link>
          <Link href="/login" className="rounded border px-7 py-3.5 text-sm font-bold" style={{ borderColor: "#02275A", color: "#02275A" }}>
            {t("logIn")}
          </Link>
          <Link href="/register" className="rounded border border-[#c5c6cf] bg-white px-7 py-3.5 text-sm font-semibold text-[#44474e]">
            {t("registerInstitution")}
          </Link>
        </div>
        <p className="mt-6 text-sm text-[#44474e]">
          {t("graduateNoAccount")}{" "}
          <Link href="/register/graduate" className="font-semibold" style={{ color: "#005eb3" }}>
            {t("createAccount")}
          </Link>
        </p>
      </main>
    </div>
  )
}
