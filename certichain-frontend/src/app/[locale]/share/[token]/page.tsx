"use client"

import { useParams } from "next/navigation"
import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { useVerifyShare } from "@/features/verifier"
import type { VerificationResponse } from "@/features/verifier"
import { Skeleton } from "@/shared/components/ui/skeleton"

export default function ShareTimelinePage() {
  const t = useTranslations("share")
  const tc = useTranslations("common")
  const { token } = useParams<{ token: string }>()
  const verifyShare = useVerifyShare()

  useEffect(() => {
    if (token) verifyShare.mutate(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const data = verifyShare.data?.data as unknown

  // Backend shapes: VerificationResponse | VerificationResponse[] | {result:"SHARE_REVOKED"} | {scope, results:[]}
  const shareRevoked =
    data != null && typeof data === 'object' && !Array.isArray(data) && (data as { result: string }).result === "SHARE_REVOKED"

  const timelineData = data != null && typeof data === 'object' && !Array.isArray(data) && 'results' in (data as Record<string, unknown>) && Array.isArray((data as { results: unknown }).results)
    ? ((data as { results: VerificationResponse[] }).results)
    : null

  const list: VerificationResponse[] = shareRevoked
    ? []
    : timelineData != null
      ? timelineData
      : Array.isArray(data)
        ? data as VerificationResponse[]
        : data
          ? [data as VerificationResponse]
          : []

  const verifiedCount = list.filter((e) => e.result === "VERIFIED").length
  const flaggedCount = list.length - verifiedCount

  if (verifyShare.isPending) {
    return (
      <main className="mx-auto max-w-[900px] px-4 py-14 sm:px-6">
        <div aria-busy="true">
          <Skeleton className="mx-auto mb-3 h-7 w-64" />
          <Skeleton className="mx-auto mb-8 h-4 w-40" />
          <Skeleton className="mb-4 h-[220px] rounded-xl" />
          <Skeleton className="h-[220px] rounded-xl" />
        </div>
      </main>
    )
  }

  if (shareRevoked) {
    return (
      <main className="mx-auto max-w-[500px] px-4 py-20 text-center sm:px-6">
        <span className="material-symbols-outlined mb-4 inline-block text-[56px]" style={{ color: "#75777f" }}>
          link_off
        </span>
        <h1 className="font-heading m-0 mb-2 text-2xl font-extrabold">{t("revokedTitle")}</h1>
        <p className="m-0 text-sm text-[#44474e]">
          {t("revokedSub")}
        </p>
      </main>
    )
  }

  if (list.length === 0) {
    return (
      <main className="mx-auto max-w-[500px] px-4 py-20 text-center sm:px-6">
        <span className="material-symbols-outlined mb-4 inline-block text-[56px]" style={{ color: "#C0392B" }}>
          block
        </span>
        <h1 className="font-heading m-0 mb-2 text-2xl font-extrabold" style={{ color: "#C0392B" }}>
          {t("notFound")}
        </h1>
        <p className="m-0 text-sm text-[#44474e]">
          {t("notFoundSub")}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto mb-6 max-w-[600px] text-center sm:mb-8">
        <h1 className="font-heading m-0 mb-3 text-2xl font-extrabold sm:mb-4 sm:text-[32px]">{t("timelineTitle")}</h1>
        <p className="m-0 text-sm text-[#44474e] sm:text-base">{t("shareSub")}</p>
      </div>

      <div className="rounded-lg border border-[#c5c6cf] bg-white p-5 shadow-[0_4px_40px_rgba(2,39,90,0.05)] sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#c5c6cf] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full font-heading font-bold text-white sm:size-11" style={{ background: "#02275A" }}>
              {(list[0]?.issuedTo ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-heading m-0 text-base font-semibold sm:text-lg">{list[0]?.issuedTo}</h2>
              <p className="m-0 mt-0.5 text-xs text-[#75777f] sm:text-[13px]">{t("sharedTimeline", { n: list.length })}</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "rgba(16,185,129,0.12)", color: "#0d9668" }}>
            <span className="material-symbols-outlined text-sm">verified</span>
            {t("shareVerified")}
          </span>
        </div>

        <div className="mb-6 flex gap-2">
          <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "#eef0f3", color: "#44474e" }}>{t("verifiedCount", { n: verifiedCount })}</span>
          {flaggedCount > 0 && <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "#eef0f3", color: "#44474e" }}>{t("flaggedCount", { n: flaggedCount })}</span>}
        </div>

        {list.map((e, i) => {
          const dimmed = e.result !== "VERIFIED"
          const expired = e.result === "EXPIRED"
          const badge = expired
            ? { bg: "#fff3d6", color: "#a5730f", icon: "schedule", label: tc("expired") }
            : dimmed
              ? { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: tc("revoked") }
              : { bg: "#d5e3ff", color: "#02275A", icon: "check_circle", label: tc("verified") }
          return (
            <div key={i} className="flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: dimmed ? "#f1f2f7" : "#d5e3ff" }}>
                  <span className="material-symbols-outlined text-lg" style={{ color: dimmed ? "#9aa0aa" : "#02275A" }}>
                    {expired ? "schedule" : dimmed ? "cancel" : "school"}
                  </span>
                </span>
                {i !== list.length - 1 && <span className="mt-0.5 w-px flex-1" style={{ background: "#e0e3e5" }} />}
              </div>
              <div className="flex flex-1 flex-wrap items-start justify-between gap-3 pb-6 sm:gap-4">
                <div>
                  <h3 className="font-heading m-0 text-sm font-semibold sm:text-base" style={{ color: dimmed ? "#75777f" : "#191c1e" }}>{e.credentialTitle}</h3>
                  <p className="m-0 mt-1 text-xs sm:text-[13px]" style={{ color: dimmed ? "#9aa0aa" : "#44474e" }}>{e.institutionName}</p>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold sm:px-3.5 sm:text-[13px]"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  <span className="material-symbols-outlined text-base">{badge.icon}</span>
                  {badge.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="m-0 mt-4 text-center text-xs text-[#9aa0aa]">
        {t("fieldsNote")}
      </p>
    </main>
  )
}
