"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useShares, useCreateShare, useRevokeShare, useUnrevokeShare, useRevokeShares, useTimeline, useCredentialFields, useShareActivity } from "@/features/graduate"
import type { Share } from "@/features/graduate"
import dynamic from "next/dynamic"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { TableSkeleton } from "@/shared/components/ui/skeletons"
import { credentialSubtitle, credentialTitle } from "@/shared/components/credential-card"
import { toast } from "sonner"

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
  const t = useTranslations("graduate")
  const tc = useTranslations("common")
  const locale = useLocale()
  const { data, isLoading } = useShares()
  const shares = data?.data ?? []
  const { data: timelineData } = useTimeline()
  const credentials = timelineData?.data ?? []
  const createShare = useCreateShare()
  const revokeShare = useRevokeShare()
  const unrevokeShare = useUnrevokeShare()
  const revokeShares = useRevokeShares()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  // Full-timeline shares are disabled for now (verifier-side rendering not ready),
  // so every new share is SINGLE_CREDENTIAL. Legacy FULL_TIMELINE shares still display.
  const [credentialId, setCredentialId] = useState("")
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([])
  const [touched, setTouched] = useState(false)
  const [viewedShare, setViewedShare] = useState<Share | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<Share | "bulk" | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function confirmRevoke() {
    if (revokeTarget === "bulk") {
      revokeShares.mutate([...selected], {
        onSuccess: ({ data }) => {
          toast.success(t("revokeSharesToast", { revoked: data.revoked, already: data.alreadyRevoked ?? 0 }))
          setSelected(new Set())
          setRevokeTarget(null)
        },
      })
    } else if (revokeTarget) {
      revokeShare.mutate(revokeTarget.id, { onSuccess: () => setRevokeTarget(null) })
    }
  }

  const { data: fieldsData } = useCredentialFields(credentialId)
  const fields = fieldsData?.data ?? []

  // Default to everything checked when a credential's fields load - fastest path for the
  // common case (share it all), while still requiring an explicit checkbox per field.
  useEffect(() => {
    if (fieldsData) setSelectedFieldIds(fieldsData.data.map((f) => f.id))
  }, [fieldsData])

  const nameValid = name.trim().length > 0
  const credentialValid = credentialId !== ""
  const fieldsValid = fields.length === 0 || selectedFieldIds.length > 0
  const showError = touched && (!nameValid || !credentialValid || !fieldsValid)

  function toggleField(id: string) {
    setSelectedFieldIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))
  }

  function submit() {
    setTouched(true)
    if (!nameValid || !credentialValid || !fieldsValid) return
    createShare.mutate(
      {
        name,
        scope: "SINGLE_CREDENTIAL",
        credentialId,
        selectedFieldIds,
      },
      {
        onSuccess: ({ data }) => {
          setOpen(false)
          setName("")
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
    { icon: "ios_share", iconBg: "#d8e2ff", iconColor: "#005eb3", value: active.length, label: t("activeShares") },
    { icon: "visibility", iconBg: "#fff3d6", iconColor: "#a5730f", value: totalViews, label: t("totalViews") },
    { icon: "block", iconBg: "#eef0f3", iconColor: "#75777f", value: revoked.length, label: tc("revoked") },
  ]

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading m-0 text-[32px] font-bold">{t("mySharesTitle")}</h2>
          <p className="m-0 mt-1.5 text-sm text-[#44474e]">
            {t("mySharesSub")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,.1)]"
          style={{ background: "#005eb3" }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t("createShare")}
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

      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[#c5c6cf] bg-white px-4 py-2.5">
          <span className="text-sm text-[#44474e]">{t("selectedCount", { n: selected.size })}</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-semibold text-[#44474e]">
              {tc("cancel")}
            </button>
            <button
              type="button"
              onClick={() => setRevokeTarget("bulk")}
              className="rounded border border-[#c5c6cf] bg-white px-3 py-1.5 text-xs font-semibold text-[#C0392B]"
            >
              {t("revokeSelected")}
            </button>
          </div>
        </div>
      )}

      <div className="mb-8 overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
        <div
          className="grid gap-4 px-8 py-4"
          style={{ gridTemplateColumns: "28px 2.5fr 2.5fr 1.5fr 1fr 1fr", background: "#02275A" }}
        >
          <span />
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{t("shareName")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{t("whatsShared")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("created")}</span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">{tc("views")}</span>
          <span className="text-right text-[12px] font-bold uppercase tracking-wide text-white">{tc("status")}</span>
        </div>
        {isLoading ? (
          <TableSkeleton columns="28px 2.5fr 2.5fr 1.5fr 1fr 1fr" />
        ) : shares.length === 0 ? (
          <p className="p-6 text-sm text-[#75777f]">
            {t("noSharesYet")}
          </p>
        ) : (
          shares.map((s) => (
            <div
              key={s.id}
              className="grid items-center gap-4 border-t border-[#c5c6cf] px-8 py-5"
              style={{ gridTemplateColumns: "28px 2.5fr 2.5fr 1.5fr 1fr 1fr" }}
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggleSelected(s.id)}
                className="size-4 accent-[#C0392B]"
              />
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]" style={{ color: "#02275A" }}>
                  ios_share
                </span>
                <span className="text-sm font-semibold">{s.name}</span>
              </div>
              <span className="text-[13px] text-[#44474e]">
                {s.scope === "FULL_TIMELINE" ? t("fullTimeline") : t("singleCred")}
              </span>
              <span className="text-[13px] text-[#44474e]">{new Date(s.createdAt).toLocaleDateString(locale)}</span>
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
                  {s.revoked ? tc("revoked") : tc("active")}
                </span>
                <button
                  type="button"
                  onClick={() => setViewedShare(s)}
                  className="text-xs font-semibold text-[#005eb3] underline underline-offset-4"
                >
                  {tc("view")}
                </button>
                {s.revoked ? (
                  <button
                    type="button"
                    onClick={() => unrevokeShare.mutate(s.id)}
                    className="text-xs font-semibold text-[#0d9668] underline underline-offset-4"
                  >
                    {t("unrevokeBtn")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRevokeTarget(s)}
                    className="text-xs font-semibold text-[#C0392B] underline underline-offset-4"
                  >
                    {t("revokeBtn")}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {revokeTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">
              {revokeTarget === "bulk" ? t("revokeSharesTitle", { n: selected.size }) : t("revokeShareTitle")}
            </h3>
            <p className="mb-6 text-sm text-[#44474e]">{t("revokeShareWarn")}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={confirmRevoke}
                disabled={revokeShare.isPending || revokeShares.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#C0392B" }}
              >
                {t("revokeBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewedShare && <ShareDetailPanel share={viewedShare} onClose={() => setViewedShare(null)} />}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="font-heading text-lg font-bold">{t("createShareTitle")}</h3>
            <p className="mb-4 text-sm text-[#44474e]">
              {t("createShareSub")}
            </p>
            <label className="mb-1 block text-sm font-semibold">{t("shareName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={t("shareNamePh")}
              className="mb-1 w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: showError ? "#C0392B" : "#c5c6cf", background: showError ? "#fff6f5" : "#fff" }}
            />
            {showError && !nameValid && <p className="mb-3 text-xs text-[#C0392B]">{t("shareNameRequired")}</p>}
            <label className="mb-1 mt-3 block text-sm font-semibold">{tc("credential")}</label>
            <select
              value={credentialId}
              onChange={(e) => {
                setCredentialId(e.target.value)
                setSelectedFieldIds([])
              }}
              className="mb-1 w-full rounded-md border border-[#c5c6cf] px-3 py-2 text-sm"
            >
              <option value="">{t("selectCred")}</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {credentialTitle(c, c.type === "CERTIFICATE" ? tc("certificate") : tc("activityRecord"))} — {credentialSubtitle(c)}
                </option>
              ))}
            </select>
            {showError && !credentialValid && <p className="mb-3 text-xs text-[#C0392B]">{t("chooseCredShare")}</p>}
            {credentialId && fields.length > 0 && (
              <div className="mb-4 mt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-semibold">{t("fieldsToShare")}</label>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFieldIds(selectedFieldIds.length === fields.length ? [] : fields.map((f) => f.id))
                    }
                    className="text-xs font-semibold"
                    style={{ color: "#005eb3" }}
                  >
                    {selectedFieldIds.length === fields.length ? t("clearAll") : t("selectAll")}
                  </button>
                </div>
                <p className="mb-2 text-xs text-[#75777f]">{t("shareCheckedHint")}</p>
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
                {showError && selectedFieldIds.length === 0 && (
                  <p className="mt-1.5 text-xs text-[#C0392B]">{t("selectAtLeastOneField")}</p>
                )}
              </div>
            )}
            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[#c5c6cf] bg-white px-5 py-2 text-sm font-semibold text-[#44474e]"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={createShare.isPending}
                className="rounded-md px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#005eb3" }}
              >
                {createShare.isPending ? t("creating") : t("createShare")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function ShareDetailPanel({ share, onClose }: { share: Share; onClose: () => void }) {
  const t = useTranslations("graduate")
  const tc = useTranslations("common")
  const locale = useLocale()
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
            <p className="text-xs text-[#75777f]">{t("shareCodeHint")}</p>
          </div>
          <button type="button" onClick={onClose} className="material-symbols-outlined text-[#75777f]">
            close
          </button>
        </div>

        <div className="mb-4 flex justify-center">
          <ShareQr value={link} />
        </div>

        <label className="mb-1 block text-sm font-semibold">{t("codeLbl")}</label>
        <div className="mb-3 flex gap-2">
          <input readOnly value={share.shareToken} className="w-full rounded-md border border-[#c5c6cf] px-3 py-2 text-xs" />
          <button
            type="button"
            onClick={() => copy(share.shareToken, "code")}
            className="shrink-0 rounded-md border border-[#c5c6cf] px-3 py-2 text-xs font-semibold text-[#44474e]"
          >
            {copied === "code" ? tc("copied") : tc("copy")}
          </button>
        </div>

        <label className="mb-1 block text-sm font-semibold">{t("linkLbl")}</label>
        <div className="mb-5 flex gap-2">
          <input readOnly value={link} className="w-full rounded-md border border-[#c5c6cf] px-3 py-2 text-xs" />
          <button
            type="button"
            onClick={() => copy(link, "link")}
            className="shrink-0 rounded-md border border-[#c5c6cf] px-3 py-2 text-xs font-semibold text-[#44474e]"
          >
            {copied === "link" ? tc("copied") : tc("copy")}
          </button>
        </div>

        <label className="mb-1.5 block text-sm font-semibold">{t("shareActivity")}</label>
        <div className="max-h-40 overflow-y-auto rounded-md border border-[#c5c6cf]">
          {activityLoading ? (
            <p className="p-4 text-center text-xs text-[#75777f]">{tc("loading")}</p>
          ) : activity.length === 0 ? (
            <p className="p-4 text-center text-xs text-[#75777f]">{t("noViews")}</p>
          ) : (
            activity.map((a, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-[#eef0f3] px-3 py-2 text-xs text-[#44474e] last:border-0">
                <span className="material-symbols-outlined text-sm text-[#75777f]">visibility</span>
                {t("viewedDate", { date: new Date(a).toLocaleString(locale) })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
