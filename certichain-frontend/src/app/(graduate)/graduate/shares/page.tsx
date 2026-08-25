"use client"

import { useState } from "react"
import { useShares, useCreateShare, useRevokeShare, useTimeline, useCredentialFields, useShareActivity } from "@/features/graduate"
import type { Share, ShareScope } from "@/features/graduate"
import dynamic from "next/dynamic"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { TableSkeleton } from "@/shared/components/ui/skeletons"

// Pulls the qrcode lib out of the initial bundle - it's only needed once the
// share modal is open. ssr:false because it renders to a canvas/data URL.
const ShareQr = dynamic(() => import("@/shared/components/share-qr").then((m) => m.ShareQr), {
  ssr: false,
  loading: () => <Skeleton className="size-[180px] rounded-md" />,
})

function shareLink(token: string) {
  return (typeof window !== "undefined" ? window.location.origin : "") + "/share/" + token
}

export default function GraduateSharesPage() {
  const { data, isLoading } = useShares()
  const shares = data?.data ?? []
  const { data: timelineData } = useTimeline()
  const credentials = timelineData?.data ?? []
  const createShare = useCreateShare()
  const revokeShare = useRevokeShare()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [scope, setScope] = useState<ShareScope>("FULL_TIMELINE")
  const [credentialId, setCredentialId] = useState("")
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([])
  const [touched, setTouched] = useState(false)
  const [viewedShare, setViewedShare] = useState<Share | null>(null)

  const { data: fieldsData } = useCredentialFields(scope === "SINGLE_CREDENTIAL" ? credentialId : "")
  const fields = fieldsData?.data ?? []

  const nameValid = name.trim().length > 0
  const showError = touched && !nameValid

  function toggleField(id: string) {
    setSelectedFieldIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))
  }

  function submit() {
    setTouched(true)
    if (!nameValid) return
    createShare.mutate(
      {
        name,
        scope,
        credentialId: scope === "SINGLE_CREDENTIAL" ? credentialId || null : null,
        selectedFieldIds: scope === "SINGLE_CREDENTIAL" ? selectedFieldIds : [],
      },
      {
        onSuccess: ({ data }) => {
          setOpen(false)
          setName("")
          setScope("FULL_TIMELINE")
          setCredentialId("")
          setSelectedFieldIds([])
          setTouched(false)
          setViewedShare(data)
        },
      }
    )
  }

  const active = shares.filter((s) => !s.revoked)
  const revoked = shares.filter((s) => s.revoked)
  const totalViews = shares.reduce((sum, s) => sum + (s.viewCount ?? 0), 0)

  const stats = [
    { icon: "ios_share", iconBg: "#d8e2ff", iconColor: "#005eb3", value: active.length, label: "Active Shares" },
    { icon: "visibility", iconBg: "#fff3d6", iconColor: "#a5730f", value: totalViews, label: "Total Views" },
    { icon: "block", iconBg: "#eef0f3", iconColor: "#75777f", value: revoked.length, label: "Revoked" },
  ]

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading m-0 text-[32px] font-bold">My Shares</h2>
          <p className="m-0 mt-1.5 text-sm text-[#44474e]">
            Manage who can see your credentials and exactly which fields are visible.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,.1)]"
          style={{ background: "#005eb3" }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create New Share
        </button>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-5">
        {stats.map((st) => (
          <div key={st.label} className="rounded-lg border border-[#c5c6cf] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
            <div
              className="mb-3 flex size-10 items-center justify-center rounded-lg"
              style={{ background: st.iconBg }}
            >
              <span className="material-symbols-outlined text-xl" style={{ color: st.iconColor }}>
                {st.icon}
              </span>
            </div>
            <p className="font-heading m-0 text-[32px] font-extrabold">{st.value}</p>
            <p className="m-0 mt-1 text-sm text-[#75777f]">{st.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
        <div
          className="grid gap-4 px-8 py-4"
          style={{ gridTemplateColumns: "2.5fr 2.5fr 1.5fr 1fr 1fr", background: "#02275A" }}
        >
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Share Name</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">What's Shared</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Created</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Views</span>
          <span className="text-right text-[12px] font-bold uppercase tracking-wide text-white">Status</span>
        </div>
        {isLoading ? (
          <TableSkeleton columns="2.5fr 2.5fr 1.5fr 1fr 1fr" />
        ) : shares.length === 0 ? (
          <p className="p-6 text-sm text-[#75777f]">
            No shares yet. Create one to send your credentials to an employer or visa office.
          </p>
        ) : (
          shares.map((s) => (
            <div
              key={s.id}
              className="grid items-center gap-4 border-t border-[#c5c6cf] px-8 py-5"
              style={{ gridTemplateColumns: "2.5fr 2.5fr 1.5fr 1fr 1fr" }}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]" style={{ color: "#02275A" }}>
                  ios_share
                </span>
                <span className="text-sm font-semibold">{s.name}</span>
              </div>
              <span className="text-[13px] text-[#44474e]">
                {s.scope === "FULL_TIMELINE" ? "Full timeline" : "Single credential"}
              </span>
              <span className="text-[13px] text-[#44474e]">{new Date(s.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1 text-[13px] text-[#44474e]">
                <span className="material-symbols-outlined text-[15px]">visibility</span>
                {s.viewCount ?? 0}
              </span>
              <div className="flex items-center justify-end gap-3">
                <span
                  className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={
                    s.revoked
                      ? { background: "#eef0f3", color: "#75777f" }
                      : { background: "rgba(16,185,129,0.1)", color: "#0d9668" }
                  }
                >
                  {s.revoked ? "Revoked" : "Active"}
                </span>
                <button
                  type="button"
                  onClick={() => setViewedShare(s)}
                  className="text-xs font-semibold text-[#005eb3] underline underline-offset-4"
                >
                  View
                </button>
                {!s.revoked && (
                  <button
                    type="button"
                    onClick={() => revokeShare.mutate(s.id)}
                    className="text-xs font-semibold text-[#C0392B] underline underline-offset-4"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {viewedShare && <ShareDetailPanel share={viewedShare} onClose={() => setViewedShare(null)} />}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="font-heading text-lg font-bold">Create a new share</h3>
            <p className="mb-4 text-sm text-[#44474e]">
              Give it a name and choose what's visible to whoever holds the link.
            </p>
            <label className="mb-1 block text-sm font-semibold">Share name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. For Internship Application"
              className="mb-1 w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: showError ? "#C0392B" : "#c5c6cf", background: showError ? "#fff6f5" : "#fff" }}
            />
            {showError && <p className="mb-3 text-xs text-[#C0392B]">Give this share a name.</p>}
            <label className="mb-1 mt-3 block text-sm font-semibold">What's shared</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ShareScope)}
              className="mb-3 w-full rounded-md border border-[#c5c6cf] px-3 py-2 text-sm"
            >
              <option value="FULL_TIMELINE">Full timeline</option>
              <option value="SINGLE_CREDENTIAL">Single credential</option>
            </select>
            {scope === "SINGLE_CREDENTIAL" && (
              <>
                <select
                  value={credentialId}
                  onChange={(e) => {
                    setCredentialId(e.target.value)
                    setSelectedFieldIds([])
                  }}
                  className="mb-3 w-full rounded-md border border-[#c5c6cf] px-3 py-2 text-sm"
                >
                  <option value="">Select credential</option>
                  {credentials.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.type === "CERTIFICATE" ? "Certificate" : "Activity Record"} — {c.graduateEmail}
                    </option>
                  ))}
                </select>
                {credentialId && fields.length > 0 && (
                  <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-semibold">Fields to share</label>
                    <p className="mb-2 text-xs text-[#75777f]">Leave all unchecked to share every field.</p>
                    <div className="flex flex-col gap-1.5 rounded-md border border-[#c5c6cf] p-3">
                      {fields.map((f) => (
                        <label key={f.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedFieldIds.includes(f.id)}
                            onChange={() => toggleField(f.id)}
                          />
                          {f.fieldName}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[#c5c6cf] bg-white px-5 py-2 text-sm font-semibold text-[#44474e]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={createShare.isPending}
                className="rounded-md px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#005eb3" }}
              >
                {createShare.isPending ? "Creating…" : "Create Share"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function ShareDetailPanel({ share, onClose }: { share: Share; onClose: () => void }) {
  const link = shareLink(share.shareToken)
  const [copied, setCopied] = useState<"code" | "link" | null>(null)
  const { data: activityData, isLoading: activityLoading } = useShareActivity(share.id)
  const activity = activityData?.data ?? []

  function copy(text: string, which: "code" | "link") {
    const done = () => {
      setCopied(which)
      setTimeout(() => setCopied(null), 1500)
    }
    function legacyCopy() {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      done()
    }
    // navigator.clipboard is missing outside a secure context (HTTPS/localhost), and some
    // browser extensions shim it as an object without writeText - try/catch rather than
    // feature-detect, and fall back to the legacy textarea+execCommand trick either way.
    try {
      navigator.clipboard.writeText(text).then(done, legacyCopy)
    } catch {
      legacyCopy()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold">{share.name}</h3>
            <p className="text-xs text-[#75777f]">Share this code, link, or QR with anyone who needs to verify it.</p>
          </div>
          <button type="button" onClick={onClose} className="material-symbols-outlined text-[#75777f]">
            close
          </button>
        </div>

        <div className="mb-4 flex justify-center">
          <ShareQr value={link} />
        </div>

        <label className="mb-1 block text-sm font-semibold">Code</label>
        <div className="mb-3 flex gap-2">
          <input readOnly value={share.shareToken} className="w-full rounded-md border border-[#c5c6cf] px-3 py-2 text-xs" />
          <button
            type="button"
            onClick={() => copy(share.shareToken, "code")}
            className="shrink-0 rounded-md border border-[#c5c6cf] px-3 py-2 text-xs font-semibold text-[#44474e]"
          >
            {copied === "code" ? "Copied" : "Copy"}
          </button>
        </div>

        <label className="mb-1 block text-sm font-semibold">Link</label>
        <div className="mb-5 flex gap-2">
          <input readOnly value={link} className="w-full rounded-md border border-[#c5c6cf] px-3 py-2 text-xs" />
          <button
            type="button"
            onClick={() => copy(link, "link")}
            className="shrink-0 rounded-md border border-[#c5c6cf] px-3 py-2 text-xs font-semibold text-[#44474e]"
          >
            {copied === "link" ? "Copied" : "Copy"}
          </button>
        </div>

        <label className="mb-1.5 block text-sm font-semibold">Share Activity</label>
        <div className="max-h-40 overflow-y-auto rounded-md border border-[#c5c6cf]">
          {activityLoading ? (
            <p className="p-4 text-center text-xs text-[#75777f]">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="p-4 text-center text-xs text-[#75777f]">No views yet.</p>
          ) : (
            activity.map((a, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-[#eef0f3] px-3 py-2 text-xs text-[#44474e] last:border-0">
                <span className="material-symbols-outlined text-sm text-[#75777f]">visibility</span>
                Viewed {new Date(a).toLocaleString()}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
