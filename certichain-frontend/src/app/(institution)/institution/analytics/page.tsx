"use client"

import { useInstitutionAnalytics } from "@/features/institution"
import type { DailyCount } from "@/features/institution"
import { CardGridSkeleton } from "@/shared/components/ui/skeletons"

/** Minimal inline sparkline - no charting dependency for a handful of daily buckets. */
function Sparkline({ data, color }: { data: DailyCount[]; color: string }) {
  if (data.length === 0) {
    return <p className="m-0 text-sm text-[#75777f]">No activity in the last 30 days.</p>
  }

  // A single active day can't draw a line - show it as a labeled bar instead of a lone dot.
  if (data.length === 1) {
    return (
      <div className="flex h-20 flex-col justify-end gap-1">
        <div className="h-10 w-10 rounded-sm" style={{ background: color }} />
        <p className="m-0 text-xs text-[#75777f]">
          {data[0].count} on {data[0].date}
        </p>
      </div>
    )
  }

  const width = 320
  const height = 80
  const max = Math.max(...data.map((d) => d.count), 1)
  const stepX = width / (data.length - 1)
  const points = data.map((d, i) => {
    const x = i * stepX
    const y = height - (d.count / max) * (height - 8) - 4
    return `${x},${y}`
  })

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" preserveAspectRatio="none">
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={2} />
      {data.map((d, i) => {
        const x = i * stepX
        const y = height - (d.count / max) * (height - 8) - 4
        return <circle key={d.date} cx={x} cy={y} r={2.5} fill={color} />
      })}
    </svg>
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
              <h3 className="font-heading m-0 mb-4 text-lg font-semibold">Issuances per day</h3>
              <Sparkline data={analytics.issuancesByDay} color="#0462BA" />
            </div>
            <div className="rounded-xl border border-[#c5c6cf] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
              <h3 className="font-heading m-0 mb-4 text-lg font-semibold">Verifications per day</h3>
              <Sparkline data={analytics.verificationsByDay} color="#0d9668" />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
