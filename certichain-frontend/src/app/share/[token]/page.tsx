"use client"

import { useParams } from "next/navigation"
import { useEffect } from "react"
import { useVerifyShare } from "@/features/verifier"
import type { VerificationResponse } from "@/features/verifier"
import { Skeleton } from "@/shared/components/ui/skeleton"

export default function ShareTimelinePage() {
  const { token } = useParams<{ token: string }>()
  const verifyShare = useVerifyShare()

  useEffect(() => {
    if (token) verifyShare.mutate(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const data = verifyShare.data?.data

  // SHARE_REVOKED is a distinct {result, message} shape from the backend - a revoked
  // *link* is a different fact from a revoked *credential* and isn't a VerificationResponse.
  const shareRevoked =
    data != null && !Array.isArray(data) && (data as { result: string }).result === "SHARE_REVOKED"

  const list: VerificationResponse[] = shareRevoked
    ? []
    : Array.isArray(data)
      ? data
      : data
        ? [data as VerificationResponse]
        : []

  const verifiedCount = list.filter((e) => e.result === "VERIFIED").length
  const revokedCount = list.length - verifiedCount

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
        <h1 className="font-heading m-0 mb-2 text-2xl font-extrabold">This Share Link Was Revoked</h1>
        <p className="m-0 text-sm text-[#44474e]">
          The graduate who shared this has turned off access. This doesn't mean their credentials are invalid —
          ask them to send a new link.
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
          Link Not Found
        </h1>
        <p className="m-0 text-sm text-[#44474e]">
          This share link is invalid, expired, or was never created. Double-check it with whoever sent it.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto mb-6 max-w-[600px] text-center sm:mb-8">
        <h1 className="font-heading m-0 mb-3 text-2xl font-extrabold sm:mb-4 sm:text-[32px]">Certificate Timeline</h1>
        <p className="m-0 text-sm text-[#44474e] sm:text-base">View shared academic and professional achievements.</p>
      </div>

      <div className="rounded-lg border border-[#c5c6cf] bg-white p-5 shadow-[0_4px_40px_rgba(2,39,90,0.05)] sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#c5c6cf] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full font-heading font-bold text-white sm:size-11" style={{ background: "#02275A" }}>
              {(list[0]?.issuedTo ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-heading m-0 text-base font-semibold sm:text-lg">{list[0]?.issuedTo}</h2>
              <p className="m-0 mt-0.5 text-xs text-[#75777f] sm:text-[13px]">Shared timeline · {list.length} credentials</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "rgba(16,185,129,0.12)", color: "#0d9668" }}>
            <span className="material-symbols-outlined text-sm">verified</span>
            Share Verified
          </span>
        </div>

        <div className="mb-6 flex gap-2">
          <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "#eef0f3", color: "#44474e" }}>{verifiedCount} verified</span>
          {revokedCount > 0 && <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "#eef0f3", color: "#44474e" }}>{revokedCount} revoked</span>}
        </div>

        {list.map((e, i) => {
          const revoked = e.result !== "VERIFIED"
          return (
            <div key={i} className="flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: revoked ? "#f1f2f7" : "#d5e3ff" }}>
                  <span className="material-symbols-outlined text-lg" style={{ color: revoked ? "#9aa0aa" : "#02275A" }}>
                    {revoked ? "cancel" : "school"}
                  </span>
                </span>
                {i !== list.length - 1 && <span className="mt-0.5 w-px flex-1" style={{ background: "#e0e3e5" }} />}
              </div>
              <div className="flex flex-1 flex-wrap items-start justify-between gap-3 pb-6 sm:gap-4">
                <div>
                  <h3 className="font-heading m-0 text-sm font-semibold sm:text-base" style={{ color: revoked ? "#75777f" : "#191c1e" }}>{e.credentialTitle}</h3>
                  <p className="m-0 mt-1 text-xs sm:text-[13px]" style={{ color: revoked ? "#9aa0aa" : "#44474e" }}>{e.institutionName}</p>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold sm:px-3.5 sm:text-[13px]"
                  style={revoked ? { background: "#ffdad6", color: "#C0392B" } : { background: "#d5e3ff", color: "#02275A" }}
                >
                  <span className="material-symbols-outlined text-base">{revoked ? "cancel" : "check_circle"}</span>
                  {revoked ? "Revoked" : "Verified"}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="m-0 mt-4 text-center text-xs text-[#9aa0aa]">
        Only fields the graduate chose to share are shown. Verified against issuer's public key on-chain.
      </p>
    </main>
  )
}
