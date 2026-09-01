"use client"

import { useId, useMemo, useState } from "react"
import { useInstitutionAnalytics } from "@/features/institution"
import type { DailyCount } from "@/features/institution"
import { CardGridSkeleton } from "@/shared/components/ui/skeletons"

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/**
 * Inline area chart for a run of daily buckets - gradient fill, smooth path, a
 * hover crosshair + tooltip. Deliberately no charting dependency for ~30 points.
 */
function AreaTrend({ data, color, unit }: { data: DailyCount[]; color: string; unit: string }) {
  const gradId = useId()
  const [hover, setHover] = useState<number | null>(null)

  const W = 480
  const H = 140
  const PAD = { top: 12, right: 8, bottom: 20, left: 8 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const geom = useMemo(() => {
    if (data.length === 0) return null
    const max = Math.max(...data.map((d) => d.count), 1)
    const n = data.length
    const x = (i: number) => PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
    const y = (v: number) => PAD.top + plotH - (v / max) * plotH
    const pts = data.map((d, i) => ({ x: x(i), y: y(d.count), ...d }))
    // Smooth path via Catmull-Rom -> cubic bezier.
    let line = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2] ?? p2
      const c1x = p1.x + (p2.x - p0.x) / 6
      const c1y = p1.y + (p2.y - p0.y) / 6
      const c2x = p2.x - (p3.x - p1.x) / 6
      const c2y = p2.y - (p3.y - p1.y) / 6
      line += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
    }
    const baseY = PAD.top + plotH
    const area = `${line} L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`
    const peak = pts.reduce((a, b) => (b.count > a.count ? b : a))
    return { pts, line, area, max, baseY, peak }
  }, [data, plotH, plotW, PAD.left, PAD.top])

  if (!geom) {
    return <p className="m-0 flex h-[140px] items-center text-sm text-[#75777f]">No activity in the last 30 days.</p>
  }

  const { pts, line, area, max, baseY, peak } = geom
  const active = hover != null ? pts[hover] : null
  const latest = pts[pts.length - 1]
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="relative">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-heading text-[28px] font-extrabold leading-none">{total}</span>
        <span className="text-[13px] text-[#75777f]">
          {unit} · {latest.count} on {fmtDate(latest.date)}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[140px] w-full touch-none"
        role="img"
        aria-label={`${unit} per day, ${data.length} days, ${total} total`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const svgX = ((e.clientX - rect.left) / rect.width) * W
          let nearest = 0
          let best = Infinity
          pts.forEach((p, i) => {
            const dist = Math.abs(p.x - svgX)
            if (dist < best) {
              best = dist
              nearest = i
            }
          })
          setHover(nearest)
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* horizontal reference lines at 0 / 50% / max */}
        {[0, 0.5, 1].map((t) => {
          const gy = PAD.top + plotH - t * plotH
          return (
            <g key={t}>
              <line x1={PAD.left} y1={gy} x2={W - PAD.right} y2={gy} stroke="#e6e8ec" strokeWidth={1} />
              <text x={PAD.left} y={gy - 3} className="fill-[#9aa0aa]" fontSize={10}>
                {Math.round(t * max)}
              </text>
            </g>
          )
        })}

        {/* clip keeps the smoothed spline from bleeding past the plot on sharp valleys */}
        <clipPath id={`${gradId}-clip`}>
          <rect x={0} y={0} width={W} height={baseY} />
        </clipPath>
        <g clipPath={`url(#${gradId}-clip)`}>
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* peak marker (only if it stands apart from the latest point) */}
        {peak.count > 0 && peak !== latest && (
          <circle cx={peak.x} cy={peak.y} r={3} fill="white" stroke={color} strokeWidth={2} />
        )}
        {/* latest point always marked */}
        <circle cx={latest.x} cy={latest.y} r={3.5} fill={color} stroke="white" strokeWidth={1.5} />

        {/* x-axis end labels */}
        <text x={PAD.left} y={H - 4} className="fill-[#9aa0aa]" fontSize={10}>
          {fmtDate(data[0].date)}
        </text>
        <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-[#9aa0aa]" fontSize={10}>
          {fmtDate(latest.date)}
        </text>

        {/* hover crosshair */}
        {active && (
          <g>
            <line x1={active.x} y1={PAD.top} x2={active.x} y2={baseY} stroke={color} strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={active.x} cy={active.y} r={4} fill={color} stroke="white" strokeWidth={2} />
          </g>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-md border border-[#c5c6cf] bg-white px-2 py-1 text-xs shadow-md"
          style={{ left: `${(active.x / W) * 100}%`, top: 0 }}
        >
          <span className="font-semibold">{active.count}</span> {unit}
          <span className="ml-1 text-[#75777f]">· {fmtDate(active.date)}</span>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-xl border border-[#c5c6cf] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      <div className="mb-2 flex items-start justify-between">
        <p className="m-0 text-[13px] font-semibold text-[#44474e]">{label}</p>
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "radial-gradient(circle at 32% 28%, #c9a85c, #8b6914 75%)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.35)",
          }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: "#0B1E3D" }}>{icon}</span>
        </span>
      </div>
      <p className="font-heading m-0 text-[36px] font-extrabold">{value}</p>
    </div>
  )
}

export default function InstitutionAnalyticsPage() {
  const { data, isLoading, isError } = useInstitutionAnalytics()
  const analytics = data?.data

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-6">
        <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">Analytics</h2>
        <p className="m-0 text-base text-[#44474e]">Issuance and verification activity over the last 30 days.</p>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : isError || !analytics ? (
        <p className="text-sm text-[#C0392B]">Couldn&apos;t load analytics. Try again later.</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-6">
            <StatCard label="Total credentials issued" value={analytics.totalIssued} icon="workspace_premium" />
            <StatCard label="Total verifications" value={analytics.totalVerifications} icon="verified" />
            <StatCard label="Expiring in 30 days" value={analytics.expiringSoon} icon="schedule" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl border border-[#c5c6cf] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
              <h3 className="font-heading m-0 mb-3 text-lg font-semibold">Issuances per day</h3>
              <AreaTrend data={analytics.issuancesByDay} color="#0462BA" unit="issued" />
            </div>
            <div className="rounded-xl border border-[#c5c6cf] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
              <h3 className="font-heading m-0 mb-3 text-lg font-semibold">Verifications per day</h3>
              <AreaTrend data={analytics.verificationsByDay} color="#0d9668" unit="verified" />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
