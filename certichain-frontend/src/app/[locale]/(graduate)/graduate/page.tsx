"use client"

import { Suspense } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { CredentialCard, credentialSubtitle, credentialTitle } from "@/shared/components/credential-card"
import { BriefingCard } from "@/shared/components/briefing-card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useAuthStore } from "@/features/auth"
import { useTimeline, useOpenDisputes, useVerificationCount, useShares } from "@/features/graduate"

export default function GraduateOverviewPage() {
  return (
    <Suspense>
      <GraduateOverviewContent />
    </Suspense>
  )
}

function greetingKey(hour: number) {
  if (hour >= 5 && hour < 12) return "greetingMorning" as const
  if (hour >= 12 && hour < 17) return "greetingAfternoon" as const
  if (hour >= 17 && hour < 21) return "greetingEvening" as const
  return "greetingNight" as const
}

function GraduateOverviewContent() {
  const t = useTranslations("graduate")
  const tc = useTranslations("common")
  const locale = useLocale()
  const disputedOnly = useSearchParams().get("disputed") === "1"
  const user = useAuthStore((state) => state.user)
  const displayName = user?.firstName ?? user?.email?.split("@")[0] ?? t("fallbackName")
  const { data, isLoading } = useTimeline()
  const timeline = data?.data ?? []
  const { data: disputesData } = useOpenDisputes()
  const openDisputes = disputesData?.data ?? []
  const { data: verificationData } = useVerificationCount()
  const totalVerifications = verificationData?.data.totalVerifications ?? 0
  const { data: sharesData } = useShares()
  const shares = sharesData?.data ?? []
  const activeShares = shares.filter((s) => !s.revoked)

  if (isLoading) {
    return (
      <main className="w-full px-6 py-8">
        <Skeleton className="mb-1 h-6 w-48" />
        <Skeleton className="mb-6 h-4 w-64" />
        <div className="mb-9 grid grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#c5c6cf] bg-white p-6">
              <Skeleton className="mb-2 h-6 w-10" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-2xl" />
          ))}
        </div>
      </main>
    )
  }

  const claimed = timeline.filter((c) => c.status !== "PENDING_CLAIM").length
  const claimedPct = timeline.length ? Math.round((claimed / timeline.length) * 100) : 0
  const totalShareViews = shares.reduce((sum, s) => sum + (s.viewCount ?? 0), 0)

  const statCards = [
    { icon: "badge", iconBg: "#d8e2ff", iconColor: "#005eb3", value: timeline.length, label: t("totalCreds"), sub: t("viewAllShort"), subColor: "#005eb3", subHref: "/graduate/credentials" },
    { icon: "check_circle", iconBg: "rgba(16,185,129,0.15)", iconColor: "#0d9668", value: claimed, label: t("fullyClaimed"), sub: t("claimedPct", { p: claimedPct }), subColor: "#0d9668" },
    { icon: "ios_share", iconBg: "#d8e2ff", iconColor: "#005eb3", value: activeShares.length, label: t("activeShares"), sub: t("shareViews", { n: totalShareViews }), subColor: "#005eb3" },
    { icon: "visibility", iconBg: "#fff3d6", iconColor: "#a5730f", value: totalVerifications, label: t("totalVerifs"), sub: t("allTime"), subColor: "#75777f" },
  ]

  const topThree = [...timeline]
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    .slice(0, 3)

  const activity = [...timeline]
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    .slice(0, 4)
    .map((c) => ({
      icon: c.status === "REVOKED" ? "cancel" : c.type === "CERTIFICATE" ? "verified" : "diversity_3",
      dotBg: c.status === "REVOKED" ? "rgba(192,57,43,0.15)" : "rgba(16,185,129,0.15)",
      dotColor: c.status === "REVOKED" ? "#C0392B" : "#0d9668",
      title:
        c.type === "CERTIFICATE"
          ? c.status === "REVOKED" ? t("certRevoked") : t("certIssued")
          : c.status === "REVOKED" ? t("activityRevoked") : t("activityIssued"),
      sub: new Date(c.issuedAt).toLocaleDateString(locale),
    }))

  const visibleTop = disputedOnly
    ? topThree.filter((c) => openDisputes.some((d) => d.credentialId === c.id))
    : topThree

  return (
    <main className="mx-auto max-w-[1720px] p-10">
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading m-0 text-[34px] font-bold">
            {t(greetingKey(new Date().getHours()), { name: displayName })}
          </h2>
          <p className="m-0 mt-1.5 text-[15px] text-[#44474e]">{t("greetingSub")}</p>
        </div>
        <Link
          href="/graduate/shares"
          className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,.1)]"
          style={{ background: "#005eb3" }}
        >
          <span className="material-symbols-outlined text-[18px]">ios_share</span>
          {t("shareProfile")}
        </Link>
      </div>

      <BriefingCard
        quietTitle={t("allInOrder")}
        quietDetail={(since) => t("allInOrderSub", { date: since })}
      />

      <div className="mb-9 grid grid-cols-4 gap-7">
        {statCards.map((st) => (
          <div
            key={st.label}
            className="border-l-[3px] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
            style={{ borderColor: st.iconColor }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg" style={{ color: st.iconColor }}>
                {st.icon}
              </span>
              <p className="m-0 text-sm text-[#75777f]">{st.label}</p>
            </div>
            <p className="font-heading m-0 text-[36px] font-extrabold tracking-tight">{st.value}</p>
            {st.subHref ? (
              <Link href={st.subHref} className="mt-1.5 block text-sm font-semibold" style={{ color: st.subColor }}>
                {st.sub}
              </Link>
            ) : (
              <p className="m-0 mt-1.5 text-sm font-semibold" style={{ color: st.subColor }}>{st.sub}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-heading m-0 text-2xl font-bold">{t("yourCreds")}</h3>
        <Link href="/graduate/credentials" className="text-sm font-semibold" style={{ color: "#005eb3" }}>
          {t("viewAll")}
        </Link>
      </div>

      {disputedOnly && (
        <Link href="/graduate" className="mb-3 inline-block text-xs underline underline-offset-4" style={{ color: "#005eb3" }}>
          {t("clearDisputedFilter")}
        </Link>
      )}

      {visibleTop.length === 0 ? (
        <p className="mb-9 text-sm text-[#75777f]">{t("noCreds")}</p>
      ) : (
        <div className="mb-9 grid grid-cols-3 gap-6">
          {visibleTop.map((c) => (
            <Link key={c.id} href={"/graduate/credentials/" + c.id}>
              <CredentialCard
                id={c.id}
                type={c.type}
                title={credentialTitle(c, c.type === "CERTIFICATE" ? tc("certificate") : tc("activityRecord"))}
                subtitle={credentialSubtitle(c)}
                status={c.status}
                expiresAt={c.expiresAt}
                institutionName={c.institutionName}
                brandColor={c.institutionBrandColor}
                logoUrl={c.institutionLogoUrl}
                accentPattern={c.institutionAccentPattern as "hatch" | "dots" | "none"}
              />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="rounded-xl border border-[#c5c6cf] bg-white p-7">
          <h3 className="font-heading mb-5 text-xl font-bold">{t("recentActivity")}</h3>
          <div className="flex flex-col">
            {activity.length === 0 ? (
              <p className="text-sm text-[#75777f]">{t("noActivity")}</p>
            ) : (
              activity.map((a, i) => (
                <div key={i} className="relative flex gap-4 pb-6">
                  <div className="flex flex-col items-center">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: a.dotBg }}>
                      <span className="material-symbols-outlined text-lg" style={{ color: a.dotColor }}>{a.icon}</span>
                    </span>
                    {i !== activity.length - 1 && <span className="mt-0.5 w-px flex-1" style={{ background: "#c5c6cf" }} />}
                  </div>
                  <div className="pb-0.5">
                    <p className="m-0 text-[15px] font-semibold">{a.title}</p>
                    <p className="m-0 mt-0.5 text-[13px] text-[#75777f]">{a.sub}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-xl border border-[#c5c6cf] bg-white">
            <div className="flex items-center justify-between px-5 py-4" style={{ background: "#02275A" }}>
              <h3 className="m-0 text-[15px] font-semibold text-white">{t("activeShares")}</h3>
              <Link href="/graduate/shares" className="material-symbols-outlined text-[18px]" style={{ color: "#a8c8ff" }}>
                add
              </Link>
            </div>
            {activeShares.length === 0 ? (
              <p className="p-5 text-[13px] text-[#75777f]">{t("noShares")}</p>
            ) : (
              activeShares.slice(0, 2).map((sh) => (
                <div key={sh.id} className="flex items-center justify-between border-b border-[#c5c6cf] px-5 py-4 last:border-0">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="m-0 truncate text-sm font-semibold">{sh.name}</p>
                    <p className="m-0 mt-0.5 truncate text-[13px] text-[#75777f]">
                      {sh.scope === "FULL_TIMELINE" ? t("fullTimeline") : t("singleCred")}
                    </p>
                  </div>
                  <span className="ml-2 flex shrink-0 items-center gap-1 text-[13px] text-[#44474e]">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    {sh.viewCount ?? 0}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl p-6" style={{ background: "#d8e2ff" }}>
            <h3 className="m-0 mb-2.5 flex items-center gap-2 font-heading text-[15px] font-bold" style={{ color: "#02275A" }}>
              <span className="material-symbols-outlined text-xl">tips_and_updates</span>
              {t("completeProfile")}
            </h3>
            <p className="m-0 mb-3.5 text-[13px]" style={{ color: "#34466c" }}>
              {t("completeProfileSub")}
            </p>
            <Link href="/graduate/settings" className="text-[13px] font-bold" style={{ color: "#005eb3" }}>
              {t("goToSettings")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
