"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useTrustStats } from "@/features/verifier"

export default function VerifyPage() {
  const router = useRouter()
  const [shareInput, setShareInput] = useState("")
  const [touched, setTouched] = useState(false)
  const { data: statsData } = useTrustStats()
  const stats = statsData?.data

  const valid = shareInput.trim().length > 0

  function submit() {
    setTouched(true)
    if (!valid) return
    const raw = shareInput.trim()
    // Only shared credentials are exposed — verifiers must use a share token/link
    const token = raw.includes("/share/")
      ? raw.substring(raw.lastIndexOf("/share/") + 7).split("?")[0].split("#")[0].trim()
      : raw
    if (token) router.push(`/share/${token}`)
  }

  return (
    <main className="flex flex-col items-center px-6 pt-16">
      <div className="mb-4 max-w-[640px] text-center">
        <h1 className="font-heading m-0 mb-4 text-[40px] font-extrabold">Verify a Certificate</h1>
        <p className="m-0 text-base text-[#44474e]">
          CertiChain allows organizations to verify digitally signed academic certificates and confirm the
          legitimacy of their issuing institution — no account required.
        </p>
      </div>

      {stats && (
        <div className="mb-10 flex items-center gap-2 rounded-full px-4 py-2" style={{ background: "#d5e3ff" }}>
          <span className="material-symbols-outlined text-base" style={{ color: "#02275A" }}>domain_verification</span>
          <span className="text-[13px] font-semibold" style={{ color: "#02275A" }}>
            {stats.institutionCount} institutions accredited on CertiChain · {stats.verificationCount.toLocaleString()}+ certificates verified
          </span>
        </div>
      )}

      <div className="mb-5 w-full max-w-[600px] rounded-lg border border-[#c5c6cf] bg-white p-2 shadow-[0_8px_30px_rgba(2,39,90,0.06)]">
        <div className="px-6 pb-6 pt-6">
          <label className="mb-1.5 block text-sm font-bold">Share Code or Share Link</label>
          <input
            type="text"
            placeholder="Paste share link (e.g. /share/dd8b52fc-...) or share code"
            value={shareInput}
            onChange={(e) => setShareInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="mb-2 w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
          />
          <p className="m-0 mb-4 text-xs text-[#75777f]">Only shared credentials are verifiable — ask the graduate for their share link or code.</p>
          {touched && !valid && <p className="mb-4 text-xs text-[#C0392B]">Enter a share code or link to continue.</p>}
          <button
            type="button"
            onClick={submit}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded py-3.5 text-sm font-bold text-white"
            style={{ background: "#0462BA" }}
          >
            <span className="material-symbols-outlined">verified_user</span>
            Verify Share
          </button>
        </div>

        <div className="flex justify-center gap-5 border-t border-[#eef0fb] px-6 py-4">
          <span className="flex items-center gap-1.5 text-xs text-[#75777f]">
            <span className="material-symbols-outlined text-[15px]" style={{ color: "#0462BA" }}>lock</span>
            Tamper-proof record
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#75777f]">
            <span className="material-symbols-outlined text-[15px]" style={{ color: "#0462BA" }}>no_accounts</span>
            No account needed
          </span>
        </div>
      </div>

      <div className="mb-14 mt-6 flex gap-10">
        <Step icon="edit_note" label="1. Paste share code or link" />
        <Step icon="link" label="2. We check the chain" />
        <Step icon="bolt" label="3. Instant result" />
      </div>
    </main>
  )
}

function Step({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ background: "#d5e3ff" }}>
        <span className="material-symbols-outlined text-base" style={{ color: "#02275A" }}>{icon}</span>
      </span>
      <span className="text-[13px] font-semibold text-[#44474e]">{label}</span>
    </div>
  )
}
