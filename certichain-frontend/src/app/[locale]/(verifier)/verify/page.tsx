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
    <main className="relative flex flex-col items-center overflow-hidden px-6 pb-16 pt-20">
      {/* Rosette watermark: the same seal motif from the shield mark, oversized and
          faint, behind the verification form — this page's one job is authenticity,
          so the mark that promises it sits literally behind the mechanism that checks it. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-[18%] opacity-[0.05]"
      >
        <circle cx="100" cy="100" r="92" fill="none" stroke="#02275A" strokeWidth="2" />
        <circle cx="100" cy="100" r="76" fill="none" stroke="#02275A" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="100" cy="100" r="34" fill="#02275A" />
        <circle cx="100" cy="100" r="13" fill="#fff" />
      </svg>

      <div className="relative mb-4 max-w-[640px] text-center">
        <span
          className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
          style={{ background: "#02275A", color: "#c9a85c" }}
        >
          <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
          {t("verifyEyebrow")}
        </span>
        <h1 className="font-heading m-0 mb-4 text-[40px] font-extrabold" style={{ color: "#02275A" }}>{t("verifyTitle")}</h1>
        <p className="m-0 text-base text-[#44474e]">
          {t("verifySub")}
        </p>
      </div>

      {stats && (
        <div className="relative mb-10 flex items-center gap-2 rounded-full px-4 py-2" style={{ background: "#d5e3ff" }}>
          <span className="material-symbols-outlined text-base" style={{ color: "#02275A" }}>domain_verification</span>
          <span className="text-[13px] font-semibold" style={{ color: "#02275A" }}>
            {t("statsLine", { n: stats.institutionCount, m: stats.verificationCount.toLocaleString(locale) })}
          </span>
        </div>
      )}

      <div
        className="relative mb-5 w-full max-w-[600px] rounded-lg border bg-white p-2"
        style={{ borderColor: "#c5c6cf", boxShadow: "0 8px 30px rgba(2,39,90,0.06), 0 0 0 1px rgba(201,168,92,0.08)" }}
      >
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

        <div className="flex justify-center gap-5 border-t px-6 py-4" style={{ borderColor: "#eef0fb" }}>
          <span className="flex items-center gap-1.5 text-xs text-[#75777f]">
            <span className="material-symbols-outlined text-[15px]" style={{ color: "#8b2635" }}>lock</span>
            {t("tamperRecord")}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#75777f]">
            <span className="material-symbols-outlined text-[15px]" style={{ color: "#8b2635" }}>no_accounts</span>
            {t("noAccount")}
          </span>
        </div>
      </div>

      <div className="relative mb-14 mt-6 flex flex-wrap justify-center gap-10">
        <Step n={1} icon="edit_note" label={t("step1")} />
        <Step n={2} icon="link" label={t("step2")} />
        <Step n={3} icon="bolt" label={t("step3")} />
      </div>
    </main>
  )
}

function Step({ n, icon, label }: { n: number; icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="relative flex size-7 shrink-0 items-center justify-center rounded-full"
        style={{ background: "#d5e3ff" }}
      >
        <span className="material-symbols-outlined text-base" style={{ color: "#02275A" }}>{icon}</span>
        <span
          className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold"
          style={{ background: "#c9a85c", color: "#02275A" }}
        >
          {n}
        </span>
      </span>
      <span className="text-[13px] font-semibold text-[#44474e]">{label}</span>
    </div>
  )
}
