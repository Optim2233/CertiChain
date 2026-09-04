"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error")
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="material-symbols-outlined mb-4 text-5xl" style={{ color: "#C0392B" }}>error</span>
      <h2 className="font-heading m-0 mb-2 text-2xl font-bold" style={{ color: "#02275A" }}>{t("pageTitle")}</h2>
      <p className="m-0 mb-6 max-w-[420px] text-sm text-[#44474e]">
        {t("pageSub")}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded px-6 py-3 text-sm font-bold text-white"
        style={{ background: "#0462BA" }}
      >
        {t("retry")}
      </button>
    </main>
  )
}
