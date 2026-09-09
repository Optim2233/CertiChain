"use client"
import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useLocale, useTranslations } from "next-intl"
import { useInstitutionAnalytics } from "@/features/institution"
import { CardGridSkeleton } from "@/shared/components/ui/skeletons"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

// recharts (~400KB) loads lazily behind this boundary - the KPI strip above
// paints without waiting for it, and it never enters the SSR bundle.
const AnalyticsCharts = dynamic(() => import("./analytics-charts").then((m) => m.AnalyticsCharts), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full rounded-xl" />,
})

function fmt(d: string, locale: string) { return new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric" }) }

function mergeDaily(a: { date: string; count: number }[], b: { date: string; count: number }[], c: { date: string; count: number }[], locale: string) {
  const m = new Map<string, { date: string; issued: number; verified: number; revoked: number }>()
  const put = (arr: typeof a, k: "issued" | "verified" | "revoked") => arr.forEach((x) => {
    const e = m.get(x.date) ?? { date: x.date, issued: 0, verified: 0, revoked: 0 }
    e[k] = x.count; m.set(x.date, e)
  })
  put(a, "issued"); put(b, "verified"); put(c, "revoked")
  return [...m.values()].sort((x, y) => x.date.localeCompare(y.date)).map((e) => ({ ...e, label: fmt(e.date, locale) }))
}

// Correlates dispute volume against issuance volume so a rising dispute count can be read
// against whether the institution is simply issuing more credentials that week.
function mergeDisputeRate(issued: { date: string; count: number }[], disputed: { date: string; count: number }[], locale: string) {
  const m = new Map<string, { date: string; issued: number; disputes: number }>()
  issued.forEach((x) => { const e = m.get(x.date) ?? { date: x.date, issued: 0, disputes: 0 }; e.issued = x.count; m.set(x.date, e) })
  disputed.forEach((x) => { const e = m.get(x.date) ?? { date: x.date, issued: 0, disputes: 0 }; e.disputes = x.count; m.set(x.date, e) })
  return [...m.values()].sort((x, y) => x.date.localeCompare(y.date))
    .map((e) => ({ ...e, label: fmt(e.date, locale), ratePct: e.issued ? Math.round((e.disputes / e.issued) * 1000) / 10 : 0 }))
}

export default function InstitutionAnalyticsPage() {
  const t = useTranslations("institution")
  const tc = useTranslations("common")
  const locale = useLocale()
  // ponytail: one formatter for every % on this page so digits/decimals follow the app locale.
  const fmtPct = (ratio: number, digits = 1) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(ratio * 100)
  const [days, setDays] = useState(30)
  const { data, isLoading, isError } = useInstitutionAnalytics(days)
  const a = data?.data

  const trendData = useMemo(() => a ? mergeDaily(a.issuancesByDay, a.verificationsByDay, a.revokedVerificationsByDay, locale) : [], [a, locale])
  const disputeRateData = useMemo(() => a ? mergeDisputeRate(a.issuancesByDay, a.disputesByDay, locale) : [], [a, locale])
  const statusPie = useMemo(() => a ? [
    { name: tc("issued"), value: a.status.issued, color: "#0462BA" },
    { name: tc("revoked"), value: a.status.revoked, color: "#C0392B" },
    { name: tc("pendingClaim"), value: a.status.pendingClaim, color: "#e67e22" },
    { name: tc("expired"), value: a.status.expired, color: "#75777f" },
  ].filter((x) => x.value > 0) : [], [a, tc])

  const funnel = useMemo(() => {
    if (!a) return []
    const claimed = a.totalIssued - a.status.pendingClaim
    // proxy; real distinct count ideal — ponytail: add distinct query if needed
    // estimate verified distinct as topVerified sum capped; fallback to totalVerifications>0
    const distinct = a.totalVerifications > 0 ? Math.min(a.totalVerifications, claimed) : 0
    return [
      { stage: tc("issued"), value: a.totalIssued },
      { stage: t("funnelClaimed"), value: Math.max(0, claimed) },
      { stage: t("funnelVerified"), value: distinct },
    ]
  }, [a, t, tc])

  if (isLoading) return <main className="w-full px-6 py-8"><CardGridSkeleton count={4} /></main>
  if (isError || !a) return <main className="w-full px-6 py-8"><p className="text-sm text-destructive">{t("analyticsLoadFailed")}</p></main>

  const yieldPct = fmtPct(a.verificationYield)

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading m-0 text-[32px] font-bold">{t("analyticsTitle")}</h2>
          <p className="m-0 text-sm text-muted-foreground">{t("analyticsSub", { n: days })}</p>
        </div>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <TabsList>
          <TabsTrigger value="7">7d</TabsTrigger>
          <TabsTrigger value="30">30d</TabsTrigger>
          <TabsTrigger value="90">90d</TabsTrigger>
          <TabsTrigger value="180">180d</TabsTrigger>
          <TabsTrigger value="365">{t("rangeYear")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: t("kpiIssued"), value: a.totalIssued, sub: t("kpiIssuedSub", { c: a.byType.certificate, a: a.byType.activityRecord }) },
          { label: t("kpiYield"), value: `${yieldPct}%`, sub: t("kpiYieldSub", { n: a.totalVerifications }) },
          { label: t("kpiUnclaimed"), value: a.status.pendingClaim, sub: t("kpiPctIssued", { p: a.totalIssued ? fmtPct(a.status.pendingClaim / a.totalIssued) : "0" }) },
          { label: t("kpiRevRate"), value: `${a.totalIssued ? fmtPct(a.status.revoked / a.totalIssued) : "0"}%`, sub: t("kpiRevRateSub", { r: a.status.revoked, v: a.totalRevokedVerifications }) },
        ].map((k) => (
          <Card key={k.label}><CardHeader><p className="text-xs font-semibold text-muted-foreground">{k.label}</p><p className="font-heading text-2xl font-extrabold">{k.value}</p></CardHeader><CardContent><p className="text-xs text-muted-foreground">{k.sub}</p></CardContent></Card>
        ))}
      </div>

      {/* Rows 1-3 lazy-load behind the boundary above (recharts chunk). */}
      <AnalyticsCharts data={a} trendData={trendData} statusPie={statusPie} funnel={funnel} fmtPct={fmtPct} disputeRateData={disputeRateData} />
    </main>
  )
}
