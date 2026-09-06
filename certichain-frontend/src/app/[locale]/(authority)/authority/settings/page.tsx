"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useAuthStore, useChangePassword } from "@/features/auth"
import { Skeleton } from "@/shared/components/ui/skeleton"

export default function AuthoritySettingsPage() {
  const t = useTranslations("authority")
  const tc = useTranslations("common")
  const user = useAuthStore((s) => s.user)
  const changePassword = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [criticalAlerts, setCriticalAlerts] = useState(true)
  const [dailyDigest, setDailyDigest] = useState(false)

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  function submitPassword() {
    if (!passwordsMatch) return
    changePassword.mutate(
      { currentPassword, newPassword },
      { onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword("") } }
    )
  }

  return (
    <main className="w-full px-6 py-8">
      <h2 className="font-heading m-0 mb-1 text-[32px] font-bold">{t("settings")}</h2>
      <p className="m-0 mb-6 text-sm text-[#44474e]">{t("settingsSub")}</p>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div className="rounded-lg border border-[#c5c6cf] bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex size-24 items-center justify-center rounded-lg" style={{ background: "#e0e3e5" }}>
            <span className="material-symbols-outlined text-4xl text-[#75777f]">admin_panel_settings</span>
          </div>
          <h3 className="font-heading m-0 mb-1 text-lg font-bold">
            {user ? user.email : <Skeleton className="h-5 w-48" />}
          </h3>
          <p className="m-0 mb-5 text-[13px] text-[#44474e]">{t("sysAdmin")}</p>
          {/* ponytail: no photo upload endpoint/field exists for AA users yet -
              button removed rather than linking nowhere. */}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h4 className="mb-4 border-b border-[#c5c6cf] pb-2 text-xs font-bold uppercase tracking-wide text-[#44474e]">{t("accountInfo")}</h4>
            <label className="mb-1.5 block text-[13px] font-semibold">{tc("email")}</label>
            <input type="text" value={user?.email ?? ""} disabled className="mb-4 w-full rounded border border-[#c5c6cf] bg-[#f7f9fb] px-3.5 py-2.5 text-sm text-[#75777f]" />
            <label className="mb-1.5 block text-[13px] font-semibold">{t("roleLevel")}</label>
            <input type="text" value={user?.role ?? t("portalSubtitle")} disabled className="w-full rounded border border-[#c5c6cf] bg-[#f7f9fb] px-3.5 py-2.5 text-sm text-[#75777f]" />
          </div>

          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h4 className="mb-1 border-b border-[#c5c6cf] pb-2 text-xs font-bold uppercase tracking-wide text-[#44474e]">{t("notifPrefs")}</h4>
            {/* ponytail: no backend endpoint to persist these yet - toggles are
                session-only state, and honest about it, rather than faking a save. */}
            <p className="m-0 mb-4 mt-3 text-xs text-[#75777f]">{t("notSaved")}</p>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="m-0 text-sm font-semibold">{t("criticalAlerts")}</p>
                <p className="m-0 mt-0.5 text-xs text-[#75777f]">{t("criticalAlertsSub")}</p>
              </div>
              <button
                type="button"
                onClick={() => setCriticalAlerts((v) => !v)}
                className="relative h-[22px] w-10 rounded-full"
                style={{ background: criticalAlerts ? "#02275A" : "#e0e3e5" }}
              >
                <span className="absolute top-0.5 size-[18px] rounded-full bg-white transition-transform" style={{ transform: criticalAlerts ? "translateX(18px)" : "translateX(2px)" }} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="m-0 text-sm font-semibold">{t("dailyDigest")}</p>
                <p className="m-0 mt-0.5 text-xs text-[#75777f]">{t("dailyDigestSub")}</p>
              </div>
              <button
                type="button"
                onClick={() => setDailyDigest((v) => !v)}
                className="relative h-[22px] w-10 rounded-full"
                style={{ background: dailyDigest ? "#02275A" : "#e0e3e5" }}
              >
                <span className="absolute top-0.5 size-[18px] rounded-full bg-white transition-transform" style={{ transform: dailyDigest ? "translateX(18px)" : "translateX(2px)" }} />
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h4 className="mb-4 border-b border-[#c5c6cf] pb-2 text-xs font-bold uppercase tracking-wide text-[#44474e]">{t("security")}</h4>
            <label className="mb-1.5 block text-[13px] font-semibold">{t("currentPw")}</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mb-4 w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm" />
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">{t("newPw")}</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">{t("confirmPw")}</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm" />
              </div>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && <p className="mb-3 text-xs text-[#C0392B]">{t("pwMismatch")}</p>}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={submitPassword}
                disabled={!passwordsMatch || changePassword.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#02275A" }}
              >
                {changePassword.isPending ? tc("saving") : t("updatePw")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
