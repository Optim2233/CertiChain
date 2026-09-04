"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error")
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: "#f7f9fb" }}>
      <span className="material-symbols-outlined mb-4 text-5xl" style={{ color: "#C0392B" }}>error</span>
      <h1 className="font-heading m-0 mb-2 text-3xl font-extrabold" style={{ color: "#02275A" }}>{t("globalTitle")}</h1>
      <p className="m-0 mb-7 max-w-[420px] text-sm text-[#44474e]">
        {t("globalSub")}
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="rounded border px-6 py-3 text-sm font-bold" style={{ borderColor: "#02275A", color: "#02275A" }}>
          {t("retry")}
        </button>
        <a href="/" className="rounded px-6 py-3 text-sm font-bold text-white" style={{ background: "#0462BA" }}>
          {t("backHome")}
        </a>
      </div>
    </main>
  )
}
