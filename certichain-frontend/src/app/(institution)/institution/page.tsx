"use client"

import { useState } from "react"
import Link from "next/link"
import { useCredentials, useCredentialSummary, useDisputes, useRevokeCredential } from "@/features/institution"
import { TableSkeleton } from "@/shared/components/ui/skeletons"
import { Pager } from "@/shared/components/ui/pager"
import type { Credential } from "@/features/institution"

const GRID_COLS = "2.5fr 2fr 1.5fr 1.3fr 0.6fr"
const TYPE_ICON: Record<string, string> = { CERTIFICATE: "workspace_premium", ACTIVITY_RECORD: "diversity_3" }
const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  ISSUED: { bg: "rgba(16,185,129,0.1)", color: "#0d9668", icon: "check_circle", label: "Issued" },
  REVOKED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: "Revoked" },
  PENDING_CLAIM: { bg: "#fff3d6", color: "#a5730f", icon: "schedule", label: "Pending Claim" },
}

export default function InstitutionDashboardPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError } = useCredentials(null, page)
  const rows = data?.data.content ?? []
  const { data: summaryData } = useCredentialSummary()
  const summary = summaryData?.data
  const { data: disputesData } = useDisputes()
  const disputes = disputesData?.data ?? []
  const revoke = useRevokeCredential()

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<Credential | null>(null)
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)

  const reasonValid = reason.trim().length > 0
  const showError = touched && !reasonValid

  function confirmRevoke() {
    setTouched(true)
    if (!reasonValid || !revokeTarget) return
    revoke.mutate(
      { id: revokeTarget.id, reason },
      { onSuccess: () => { setRevokeTarget(null); setReason(""); setTouched(false) } }
    )
  }

  const issued = summary?.total ?? 0
  const revoked = summary?.revoked ?? 0
  const claimed = issued - (summary?.unclaimed ?? 0)
  const claimedPct = issued ? Math.round((claimed / issued) * 100) : 0
  const openDisputes = disputes.filter((d) => d.status === "OPEN").length

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-9 overflow-hidden rounded-xl border border-[#c5c6cf] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <div className="flex justify-end gap-2 px-6 pt-4">
          <span className="inline-flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-xs font-bold" style={{ background: "#ffdad6", color: "#C0392B" }}>
            Disputed
            <span className="flex size-[18px] items-center justify-center rounded-full text-[11px] text-white" style={{ background: "#C0392B" }}>{openDisputes}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-xs font-bold" style={{ background: "#eef0f3", color: "#44474e" }}>
            Revoked
            <span className="flex size-[18px] items-center justify-center rounded-full text-[11px] text-white" style={{ background: "#75777f" }}>{revoked}</span>
          </span>
        </div>
        <div className="grid grid-cols-3 px-6 pb-7 pt-4">
          <div className="pr-7">
            <div className="mb-2 flex items-start justify-between">
              <p className="m-0 text-[13px] font-semibold text-[#44474e]">Credentials issued</p>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle at 32% 28%, #c9a85c, #8b6914 75%)",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.35)",
                }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ color: "#0B1E3D" }}>workspace_premium</span>
              </span>
            </div>
            <p className="font-heading m-0 text-[36px] font-extrabold">{issued}</p>
          </div>
          <div className="border-l border-[#c5c6cf] px-7">
            <div className="mb-2 flex items-start justify-between">
              <p className="m-0 text-[13px] font-semibold text-[#44474e]">Credentials claimed</p>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle at 32% 28%, #c9a85c, #8b6914 75%)",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.35)",
                }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ color: "#0B1E3D" }}>touch_app</span>
              </span>
            </div>
            <p className="font-heading m-0 text-[36px] font-extrabold">{claimed}</p>
            <p className="m-0 mt-1 text-xs text-[#75777f]">{claimedPct}% of issued</p>
            <div className="relative mt-3 h-1.5 rounded-full" style={{ background: "#eef0f3" }}>
              <div className="absolute left-0 top-0 h-1.5 rounded-full" style={{ width: claimedPct + "%", background: "#0d9668" }} />
            </div>
          </div>
          <div className="border-l border-[#c5c6cf] pl-7">
            <div className="mb-2 flex items-start justify-between">
              <p className="m-0 text-[13px] font-semibold text-[#44474e]">Open disputes</p>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle at 32% 28%, #c9a85c, #8b6914 75%)",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.35)",
                }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ color: "#0B1E3D" }}>gavel</span>
              </span>
            </div>
            <p className="font-heading m-0 text-[36px] font-extrabold">{openDisputes}</p>
            <p className="m-0 mt-1 text-xs text-[#75777f]">of {disputes.length} filed total</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4 border-b border-[#c5c6cf] pb-6">
        <div>
          <h2 className="font-heading m-0 text-[32px] font-bold">Issued Credentials</h2>
          <p className="m-0 mt-1 text-sm text-[#44474e]">Manage and track digital certificates and academic records.</p>
        </div>
        <Link
          href="/institution/issue"
          className="flex items-center gap-2 rounded px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,.1)]"
          style={{ background: "#005eb3" }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Issue New
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <div className="grid gap-4 px-6 py-3.5" style={{ gridTemplateColumns: GRID_COLS, background: "#02275A" }}>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Graduate</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Credential Type</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Status</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Issue Date</span>
          <span className="text-right text-[12px] font-bold uppercase tracking-wide text-white">Actions</span>
        </div>
        {isLoading ? (
          <TableSkeleton columns={GRID_COLS} />
        ) : isError ? (
          <p className="p-6 text-sm text-[#C0392B]">
            Couldn&apos;t load credentials — you may be signed in with an account that doesn&apos;t have institution
            access. Try logging out and back in with an institution account.
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[#75777f]">No credentials issued yet.</p>
        ) : (
          rows.map((row) => {
            const style = STATUS_STYLE[row.status] ?? STATUS_STYLE.ISSUED
            return (
              <div key={row.id} className="relative grid items-center gap-4 border-t border-[#c5c6cf] px-6 py-3.5" style={{ gridTemplateColumns: GRID_COLS }}>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full font-heading text-[13px] font-bold text-white" style={{ background: "#0462BA" }}>
                    {row.graduateEmail.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[15px] font-semibold">{row.graduateEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#02275A]">{TYPE_ICON[row.type]}</span>
                  <span className="text-sm text-[#44474e]">{row.type === "CERTIFICATE" ? "Certificate" : "Activity Record"}</span>
                </div>
                <span className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: style.bg, color: style.color }}>
                  <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                  {style.label}
                </span>
                <span className="text-sm text-[#44474e]">{new Date(row.issuedAt).toLocaleDateString()}</span>
                <div className="relative text-right">
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(menuOpenId === row.id ? null : row.id)}
                    className="material-symbols-outlined text-[#75777f]"
                  >
                    more_vert
                  </button>
                  {menuOpenId === row.id && (
                    <div className="absolute right-0 top-8 z-10 w-44 rounded border border-[#c5c6cf] bg-white shadow-lg">
                      <Link
                        href={"/institution/credentials/" + row.id}
                        onClick={() => setMenuOpenId(null)}
                        className="block px-4 py-2.5 text-left text-[13px] text-[#191c1e] hover:bg-[#f7f9fb]"
                      >
                        View Certificate
                      </Link>
                      {row.status !== "REVOKED" && (
                        <button
                          type="button"
                          onClick={() => { setRevokeTarget(row); setMenuOpenId(null) }}
                          className="block w-full border-t border-[#eef0f3] px-4 py-2.5 text-left text-[13px] text-[#C0392B]"
                        >
                          Revoke Certificate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <Pager page={data?.data} onPageChange={setPage} />
      </div>

      {revokeTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">Revoke {revokeTarget.graduateEmail}'s credential?</h3>
            <p className="mb-5 text-sm text-[#44474e]">
              It will be marked revoked on-chain immediately and reflected wherever it's verified. This cannot be undone.
            </p>
            <label className="mb-1.5 block text-[13px] font-bold">Reason (required, shown to graduate + logged)</label>
            <textarea
              rows={3}
              placeholder="Enter reason for revocation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-1 w-full resize-none rounded border px-3.5 py-2.5 text-sm"
              style={{ borderColor: showError ? "#C0392B" : "#c5c6cf" }}
            />
            {showError && <p className="mb-3.5 text-xs text-[#C0392B]">A reason is required before revoking.</p>}
            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setRevokeTarget(null); setReason(""); setTouched(false) }}
                className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRevoke}
                disabled={revoke.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#C0392B" }}
              >
                {revoke.isPending ? "Revoking…" : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
