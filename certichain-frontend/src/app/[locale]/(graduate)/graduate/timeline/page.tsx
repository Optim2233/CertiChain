"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useTimeline, useAllDisputes, useShares } from "@/features/graduate"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { credentialTitle } from "@/shared/components/credential-card"
import { translateDisputeReason } from "@/shared/lib/dispute-reason"

const FILTERS = [
  { key: "all", labelKey: "all" },
  { key: "credentials", labelKey: "myCredentials" },
  { key: "shares", labelKey: "myShares" },
  { key: "disputes", labelKey: "disputes" },
] as const

interface TimelineEntry {
  key: string
  date: string
  title: string
  sub: string
  icon: string
  dotBg: string
  dotColor: string
  sortAt: number
}

export default function GraduateTimelinePage() {
  const t = useTranslations("graduate")
  const tc = useTranslations("common")
  const locale = useLocale()
  const [filter, setFilter] = useState("all")
  const { data: timelineData, isLoading } = useTimeline()
  const credentials = timelineData?.data ?? []
  const { data: disputesData } = useAllDisputes()
  const disputes = disputesData?.data ?? []
  const { data: sharesData } = useShares()
  const shares = sharesData?.data ?? []

  const entries: TimelineEntry[] = [
    ...credentials.map((c) => ({
      key: "credentials",
      date: new Date(c.issuedAt).toLocaleDateString(locale),
      title: t("timelineIssued", { title: credentialTitle(c, c.type === "CERTIFICATE" ? tc("certificate") : tc("activityRecord")) }),
      sub: c.institutionName ?? "",
      icon: c.type === "CERTIFICATE" ? "school" : "diversity_3",
      dotBg: c.status === "REVOKED" ? "rgba(192,57,43,0.15)" : "rgba(16,185,129,0.15)",
      dotColor: c.status === "REVOKED" ? "#C0392B" : "#0d9668",
      sortAt: new Date(c.issuedAt).getTime(),
    })),
    ...shares.map((s) => ({
      key: "shares",
      date: new Date(s.createdAt).toLocaleDateString(locale),
      title: t("shareCreated", { name: s.name }),
      sub: s.scope === "FULL_TIMELINE" ? t("fullTimeline") : t("singleCred"),
      icon: "ios_share",
      dotBg: "#d8e2ff",
      dotColor: "#005eb3",
      sortAt: new Date(s.createdAt).getTime(),
    })),
    ...disputes.map((d) => ({
      key: "disputes",
      date: new Date(d.createdAt).toLocaleDateString(locale),
      title: t("disputeFiled", { reason: translateDisputeReason(d.reason, t) }),
      sub: d.status === "OPEN" ? tc("underReview") : d.status === "UPHELD" ? tc("upheld") : tc("dismissed"),
      icon: "flag",
      dotBg: "#d5e3ff",
      dotColor: "#02275A",
      sortAt: new Date(d.createdAt).getTime(),
    })),
  ].sort((a, b) => b.sortAt - a.sortAt)

  const visible = filter === "all" ? entries : entries.filter((e) => e.key === filter)

  return (
    <main className="w-full px-6 py-8">
      <h1 className="font-heading m-0 mb-2 text-[32px] font-bold">{t("timelineTitle")}</h1>
      <p className="m-0 mb-6 text-sm text-[#44474e]">
        {t("timelineSub")}
      </p>

      <div className="mb-5 flex gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="rounded-full px-4 py-2 text-[13px] font-semibold"
              style={{
                border: "1px solid " + (active ? "#02275A" : "#c5c6cf"),
                background: active ? "#02275A" : "#fff",
                color: active ? "#fff" : "#191c1e",
              }}
            >
              {f.key === "all" ? tc("all") : t(f.labelKey)}
            </button>
          )
        })}
      </div>

      <div className="rounded-lg border border-[#c5c6cf] bg-white px-8 py-7">
        {isLoading ? (
          <div className="flex flex-col gap-6" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="mb-2 h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-[#75777f]">{t("nothingHere")}</p>
        ) : (
          visible.map((e, i) => (
            <div key={i} className="flex gap-4">
              <p className="w-[84px] shrink-0 pt-1 text-right text-[11px] tabular-nums text-[#75777f]" style={{ fontFamily: "var(--font-sans)" }}>
                {e.date}
              </p>
              <div className="flex flex-col items-center">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-white"
                  style={{ borderColor: e.dotColor }}
                >
                  <span className="material-symbols-outlined text-base" style={{ color: e.dotColor }}>
                    {e.icon}
                  </span>
                </span>
                {i !== visible.length - 1 && (
                  <span className="mt-0.5 w-px flex-1" style={{ background: "#c5c6cf" }} />
                )}
              </div>
              <div className="pb-6">
                <p className="m-0 text-[15px] font-semibold">{e.title}</p>
                <p className="m-0 mt-0.5 text-[13px] text-[#44474e]">{e.sub}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
