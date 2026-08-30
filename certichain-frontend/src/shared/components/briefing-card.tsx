"use client"

import { useEffect, useState } from "react"
import { useBriefing, useAckBriefing } from "@/features/briefing"

const KIND_ICON: Record<string, string> = {
  notification: "notifications",
  verifications: "verified",
  shareViews: "visibility",
  disputes: "gavel",
}

/**
 * "While you were away" card. Placed at the top of a portal dashboard.
 * `quietTitle` / `quietDetail` are role-specific all-clear copy passed in by
 * each dashboard. `since` names the date so the guarantee reads as concrete.
 */
export function BriefingCard({
  quietTitle,
  quietDetail,
}: {
  quietTitle: string
  quietDetail: (sinceDate: string) => string
}) {
  const { data, isLoading } = useBriefing()
  const ack = useAckBriefing()
  const [dismissed, setDismissed] = useState(false)
  const briefing = data?.data

  // ALL_QUIET has nothing to miss - ack once on display so it doesn't return on reload.
  const isQuiet = briefing?.state === "ALL_QUIET"
  useEffect(() => {
    if (isQuiet && !ack.isPending && !ack.isSuccess) ack.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuiet])

  if (isLoading || !briefing || dismissed) return null
  if (briefing.state === "NONE") return null

  const sinceDate = new Date(briefing.since).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  })

  if (briefing.state === "ALL_QUIET") {
    return (
      <div
        className="mb-6 flex items-center gap-3 rounded-xl border px-5 py-3.5 text-sm"
        style={{ borderColor: "rgba(13,150,104,0.3)", background: "rgba(16,185,129,0.06)", color: "#0d7a56" }}
      >
        <span className="material-symbols-outlined text-[20px]">check_circle</span>
        <span>
          <span className="font-semibold">{quietTitle}</span> · {quietDetail(sinceDate)}
        </span>
      </div>
    )
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-[#c5c6cf] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      <div className="flex items-center justify-between px-5 py-3.5" style={{ background: "#02275A" }}>
        <h3 className="m-0 text-[15px] font-semibold text-white">While you were away</h3>
        <button
          type="button"
          onClick={() => {
            setDismissed(true)
            ack.mutate()
          }}
          className="flex items-center gap-1 text-[13px] font-semibold"
          style={{ color: "#a8c8ff" }}
        >
          <span className="material-symbols-outlined text-[16px]">check</span>
          Dismiss
        </button>
      </div>
      <div className="flex flex-col">
        {briefing.items.map((item, i) => (
          <div key={i} className="flex gap-3.5 border-b border-[#eef0f3] px-5 py-3.5 last:border-0">
            <span
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: "#d8e2ff" }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: "#005eb3" }}>
                {KIND_ICON[item.kind] ?? "info"}
              </span>
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[14px] font-semibold">{item.title}</p>
              <p className="m-0 mt-0.5 text-[13px] text-[#75777f]">{item.detail}</p>
            </div>
          </div>
        ))}
        {briefing.moreCount > 0 && (
          <p className="m-0 px-5 py-2.5 text-[13px] text-[#75777f]">and {briefing.moreCount} more</p>
        )}
      </div>
    </div>
  )
}
