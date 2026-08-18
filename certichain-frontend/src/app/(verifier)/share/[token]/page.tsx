"use client"

import { useParams } from "next/navigation"
import { useEffect } from "react"
import { useVerifyShare } from "@/features/verifier"

export default function ShareTimelinePage() {
  const { token } = useParams<{ token: string }>()
  const verifyShare = useVerifyShare()

  useEffect(() => {
    if (token) verifyShare.mutate(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const entries = verifyShare.data?.data
  const list = Array.isArray(entries) ? entries : entries ? [entries] : []
  const verifiedCount = list.filter((e) => e.result === "VERIFIED").length
  const revokedCount = list.length - verifiedCount

  return (
    <main className="mx-auto max-w-[900px] px-6 py-14">
      <div className="mx-auto mb-8 max-w-[600px] text-center">
        <h1 className="font-heading m-0 mb-4 text-[32px] font-extrabold">Certificate Timeline</h1>
        <p className="m-0 text-base text-[#44474e]">View shared academic and professional achievements.</p>
      </div>

      {verifyShare.isPending ? (
        <p className="text-center text-sm text-[#75777f]">Loading shared timeline…</p>
      ) : list.length === 0 ? (
        <p className="text-center text-sm text-[#C0392B]">This share link is invalid or has been revoked.</p>
      ) : (
        <div className="rounded-lg border border-[#c5c6cf] bg-white p-8 shadow-[0_4px_40px_rgba(2,39,90,0.05)]">
          <div className="mb-5 flex items-center justify-between border-b border-[#c5c6cf] pb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-full font-heading font-bold text-white" style={{ background: "#02275A" }}>
                {(list[0]?.issuedTo ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="font-heading m-0 text-lg font-semibold">{list[0]?.issuedTo}</h2>
                <p className="m-0 mt-0.5 text-[13px] text-[#75777f]">Shared timeline · {list.length} credentials</p>
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
              <div key={i} className="flex gap-4" style={{ opacity: revoked ? 0.7 : 1 }}>
                <div className="flex flex-col items-center">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: revoked ? "#f1f2f7" : "#d5e3ff" }}>
                    <span className="material-symbols-outlined text-lg" style={{ color: revoked ? "#9aa0aa" : "#02275A" }}>
                      {revoked ? "cancel" : "school"}
                    </span>
                  </span>
                  {i !== list.length - 1 && <span className="mt-0.5 w-px flex-1" style={{ background: "#e0e3e5" }} />}
                </div>
                <div className="flex flex-1 flex-wrap items-start justify-between gap-4 pb-6">
                  <div>
                    <h3 className="font-heading m-0 text-base font-semibold" style={{ color: revoked ? "#75777f" : "#191c1e" }}>{e.credentialTitle}</h3>
                    <p className="m-0 mt-1 text-[13px]" style={{ color: revoked ? "#9aa0aa" : "#44474e" }}>{e.institutionName}</p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold"
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
      )}
      <p className="m-0 mt-4 text-center text-xs text-[#9aa0aa]">
        Only fields the graduate chose to share are shown. Verified against issuer's public key on-chain.
      </p>
    </main>
  )
}
