"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { ChartContainer, ChartTooltipContent } from "@/shared/components/ui/chart"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import type { InstitutionAnalytics } from "@/features/institution"

export function AnalyticsCharts({
  data,
  trendData,
  statusPie,
  funnel,
  fmtPct,
  disputeRateData,
}: {
  data: InstitutionAnalytics
  trendData: { date: string; issued: number; verified: number; revoked: number; label: string }[]
  statusPie: { name: string; value: number; color: string }[]
  funnel: { stage: string; value: number }[]
  fmtPct: (ratio: number, digits?: number) => string
  disputeRateData: { date: string; issued: number; disputes: number; ratePct: number; label: string }[]
}) {
  const t = useTranslations("institution")
  const tc = useTranslations("common")
  const a = data
  return (
    <>
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

      {/* Row 2b: dispute rate vs issuance volume + disputes by credential type/reason —
          disputes alone don't say much; reading them against issuance volume and which
          credential type draws them is what makes the signal actionable. */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t("disputeRateTitle")}</CardTitle><p className="text-xs text-muted-foreground">{t("disputeRateSub")}</p></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={disputeRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e8ec" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="issued" name={tc("issued")} fill="#0462BA" fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="disputes" name={t("disputes")} fill="#e67e22" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="ratePct" name={t("disputeRateLine")} stroke="#C0392B" strokeWidth={2} dot={false} />
                <Legend />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("disputesByTypeTitle")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={[{ name: t("portfolioName"), cert: a.disputesByType.certificate, activity: a.disputesByType.activityRecord }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cert" name={tc("certificate")} stackId="t" fill="#0462BA" />
                <Bar dataKey="activity" name={tc("activityRecord")} stackId="t" fill="#c9a85c" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
            {Object.keys(a.disputeReasonTop).length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {Object.entries(a.disputeReasonTop).slice(0, 3).map(([name, value]) => (
                  <li key={name} className="flex justify-between gap-2"><span className="truncate">{name}</span><span className="shrink-0 font-semibold">{value}</span></li>
                ))}
              </ul>
            )}
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
    </>
  )
}
