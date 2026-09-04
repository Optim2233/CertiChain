"use client"

import { useRouter } from "@/i18n/navigation"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useTrustStats } from "@/features/verifier"

export default function VerifyPage() {
  const t = useTranslations("verifier")
  const locale = useLocale()
  const router = useRouter()
  const [shareInput, setShareInput] = useState("")
  const [touched, setTouched] = useState(false)
  const { data: statsData } = useTrustStats()
  const stats = statsData?.data

  const valid = shareInput.trim().length > 0

  function submit() {
    setTouched(true)
    if (!valid) return
    const raw = shareInput.trim()
    // Only shared credentials are exposed — verifiers must use a share token/link
    const token = raw.includes("/share/")
      ? raw.substring(raw.lastIndexOf("/share/") + 7).split("?")[0].split("#")[0].trim()
      : raw
    if (token) router.push(`/share/${token}`)
  }

  return (
    <main className="flex flex-col items-center px-6 pt-16">
      <div className="mb-4 max-w-[640px] text-center">
        <h1 className="font-heading m-0 mb-4 text-[40px] font-extrabold">{t("verifyTitle")}</h1>
        <p className="m-0 text-base text-[#44474e]">
          {t("verifySub")}
        </p>
      </div>

      {stats && (
        <div className="mb-10 flex items-center gap-2 rounded-full px-4 py-2" style={{ background: "#d5e3ff" }}>
          <span className="material-symbols-outlined text-base" style={{ color: "#02275A" }}>domain_verification</span>
          <span className="text-[13px] font-semibold" style={{ color: "#02275A" }}>
            {t("statsLine", { n: stats.institutionCount, m: stats.verificationCount.toLocaleString(locale) })}
          </span>
        </div>
      )}

      <div className="mb-5 w-full max-w-[600px] rounded-lg border border-[#c5c6cf] bg-white p-2 shadow-[0_8px_30px_rgba(2,39,90,0.06)]">
        <div className="px-6 pb-6 pt-6">
          <label className="mb-1.5 block text-sm font-bold">{t("shareCodeLabel")}</label>
          <input
            type="text"
            placeholder={t("shareCodePh")}
            value={shareInput}
            onChange={(e) => setShareInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="mb-2 w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
          />
          <p className="m-0 mb-4 text-xs text-[#75777f]">{t("shareOnly")}</p>
          {touched && !valid && <p className="mb-4 text-xs text-[#C0392B]">{t("enterCode")}</p>}
          <button
            type="button"
            onClick={submit}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded py-3.5 text-sm font-bold text-white"
            style={{ background: "#0462BA" }}
          >
            <span className="material-symbols-outlined">verified_user</span>
            {t("verifyShare")}
          </button>
        </div>

        <div className="flex justify-center gap-5 border-t border-[#eef0fb] px-6 py-4">
          <span className="flex items-center gap-1.5 text-xs text-[#75777f]">
            <span className="material-symbols-outlined text-[15px]" style={{ color: "#0462BA" }}>lock</span>
            {t("tamperRecord")}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#75777f]">
            <span className="material-symbols-outlined text-[15px]" style={{ color: "#0462BA" }}>no_accounts</span>
            {t("noAccount")}
          </span>
        </div>
      </div>

      <div className="mb-14 mt-6 flex gap-10">
        <Step icon="edit_note" label={t("step1")} />
        <Step icon="link" label={t("step2")} />
        <Step icon="bolt" label={t("step3")} />
      </div>
    </main>
  )
}

function Step({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ background: "#d5e3ff" }}>
        <span className="material-symbols-outlined text-base" style={{ color: "#02275A" }}>{icon}</span>
      </span>
      <span className="text-[13px] font-semibold text-[#44474e]">{label}</span>
    </div>
  )
}
