"use client"

import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"

export function LocaleToggle() {
  const locale = useLocale()
  const t = useTranslations("common")
  const pathname = usePathname()
  const router = useRouter()

  function switchTo(next: "en" | "my") {
    if (next === locale) return
    router.replace(pathname, { locale: next })
  }

  return (
    <div
      className="inline-flex overflow-hidden rounded-full border border-[#c5c6cf]"
      role="group"
      aria-label={t("languageLabel")}
    >
      {(["en", "my"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={locale === l}
          className="px-2.5 py-1 text-[11px] font-bold"
          style={{
            background: locale === l ? "#02275A" : "#fff",
            color: locale === l ? "#fff" : "#44474e",
          }}
        >
          {l === "en" ? "EN" : "မြန်မာ"}
        </button>
      ))}
    </div>
  )
}
