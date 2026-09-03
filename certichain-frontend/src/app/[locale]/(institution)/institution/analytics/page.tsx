"use client"
import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useInstitutionAnalytics } from "@/features/institution"
import { CardGridSkeleton } from "@/shared/components/ui/skeletons"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { ChartContainer, ChartTooltipContent } from "@/shared/components/ui/chart"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"

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

      {/* Row 1: trend + lifecycle */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t("trendTitle")}</CardTitle><p className="text-xs text-muted-foreground">{t("trendSub")}</p></CardHeader>
          <CardContent>
            <ChartContainer config={{ issued: { label: tc("issued"), color: "#0462BA" }, verified: { label: tc("verified"), color: "#0d9668" } }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e8ec" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="issued" name={tc("issued")} stroke="#0462BA" fill="#0462BA" fillOpacity={0.12} strokeWidth={2} />
                  <Area type="monotone" dataKey="verified" name={tc("verified")} stroke="#0d9668" fill="#0d9668" fillOpacity={0.12} strokeWidth={2} />
                  <Area type="monotone" dataKey="revoked" name={t("seriesRevokedViews")} stroke="#C0392B" fill="#C0392B" fillOpacity={0.08} strokeWidth={1.5} />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("lifecycleTitle")}</CardTitle><p className="text-xs text-muted-foreground">{t("lifecycleSub")}</p></CardHeader>
          <CardContent>
            {statusPie.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${fmtPct(percent ?? 0, 0)}%`}>
                    {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">{t("noCredsYet")}</p>}
            <p className="text-xs text-muted-foreground mt-2">{t("expiring30", { n: a.expiringSoon })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: funnel + type + dispute */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{t("funnelTitle")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={funnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="stage" width={110} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0462BA" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground">{t("funnelNote")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("byTypeTitle")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[{ name: t("portfolioName"), cert: a.byType.certificate, activity: a.byType.activityRecord }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cert" name={tc("certificate")} stackId="t" fill="#0462BA" />
                <Bar dataKey="activity" name={tc("activityRecord")} stackId="t" fill="#c9a85c" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 flex gap-2"><Badge>{t("certShort", { n: a.byType.certificate })}</Badge><Badge variant="secondary">{t("actShort", { n: a.byType.activityRecord })}</Badge></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("disputes")}</CardTitle><p className="text-xs text-muted-foreground">{tc("open")} {a.disputes.open} · {tc("upheld")} {a.disputes.upheld} · {tc("dismissed")} {a.disputes.dismissed} {a.disputes.medianResolutionHours != null && `· ${t("disputesMedian", { h: a.disputes.medianResolutionHours })}`}</p></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={[{ name: t("disputesBarName"), open: a.disputes.open, upheld: a.disputes.upheld, dismissed: a.disputes.dismissed }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="open" stackId="d" fill="#e67e22" />
                <Bar dataKey="upheld" stackId="d" fill="#0d9668" />
                <Bar dataKey="dismissed" stackId="d" fill="#75777f" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground">{t("disputesTrendNote")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: expiry waterfall + claim latency + top verified + revoke reasons */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("expiryTitle")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={a.expiryBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b2635" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("latencyTitle")}</CardTitle><p className="text-xs text-muted-foreground">{t("latencyNote")}</p></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={a.claimLatency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#02275a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("topVerifiedTitle")}</CardTitle></CardHeader>
          <CardContent>
            {a.topVerified.length ? (
              <ul className="space-y-2 text-sm">
                {a.topVerified.map((t) => <li key={t.credentialId} className="flex justify-between border-b border-border py-1"><span className="truncate pr-2">{t.title}</span><Badge variant="outline">{t.verifications}</Badge></li>)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">{t("noVerifs")}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("topRevokeTitle")}</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(a.revokeReasonTop).length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Object.entries(a.revokeReasonTop).map(([name, value]) => ({ name: name.slice(0, 28), value }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#C0392B" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">{t("noRevocations")}</p>}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
