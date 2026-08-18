"use client"

import { useState } from "react"
import { useInstitutionMe } from "@/features/institution"
import { useChangePassword } from "@/features/auth"

export default function InstitutionSettingsPage() {
  const { data: institution } = useInstitutionMe()
  const changePassword = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [notifDispute, setNotifDispute] = useState(true)
  const [notifBatch, setNotifBatch] = useState(true)

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
      <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">Settings</h2>
      <p className="m-0 mb-6 text-sm text-[#44474e]">Manage your institution's profile, notifications, and account security.</p>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div className="h-fit rounded-lg border border-[#c5c6cf] bg-white p-6 text-center">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full text-white" style={{ background: "#02275A" }}>
            <span className="material-symbols-outlined text-[36px]">account_balance</span>
          </div>
          <h3 className="font-heading m-0 text-lg font-bold">{institution?.name ?? "—"}</h3>
          <p className="m-0 mb-4 mt-1 text-[13px] text-[#75777f]">
            {institution?.status === "APPROVED" ? "Accredited institution" : institution?.status ?? "—"}
          </p>
          {/* ponytail: no logo upload endpoint/field exists on Institution yet -
              button removed rather than linking nowhere. */}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-4 text-lg font-semibold">Institution Information</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">Institution Name</label>
                <input type="text" value={institution?.name ?? ""} disabled className="w-full rounded border border-[#c5c6cf] bg-[#f7f9fb] px-3.5 py-2.5 text-sm text-[#75777f]" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">Ministry Reference</label>
                <input type="text" value={institution?.ministry ?? ""} disabled className="w-full rounded border border-[#c5c6cf] bg-[#f7f9fb] px-3.5 py-2.5 text-sm text-[#75777f]" />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-[13px] font-semibold">Accreditation Status</label>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: institution?.status === "APPROVED" ? "#0d9668" : "#a5730f" }}>
                  <span className="material-symbols-outlined text-base">{institution?.status === "APPROVED" ? "check_circle" : "schedule"}</span>
                  {institution?.status ?? "Pending review"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-1 text-lg font-semibold">Notification Preferences</h3>
            {/* ponytail: no backend endpoint to persist these yet - toggles are
                session-only state, and honest about it, rather than faking a save. */}
            <p className="m-0 mb-4 text-xs text-[#75777f]">Not saved yet — resets on refresh.</p>
            <div className="flex items-center justify-between border-b border-[#eef0f3] py-2.5">
              <div>
                <p className="m-0 text-sm font-semibold">New dispute filed</p>
                <p className="m-0 mt-0.5 text-xs text-[#75777f]">When a graduate flags a credential.</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifDispute((v) => !v)}
                className="relative h-5 w-9 rounded-full transition-colors"
                style={{ background: notifDispute ? "#0d9668" : "#c5c6cf" }}
              >
                <span className="absolute top-0.5 size-4 rounded-full bg-white transition-transform" style={{ transform: notifDispute ? "translateX(18px)" : "translateX(2px)" }} />
              </button>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div>
                <p className="m-0 text-sm font-semibold">Batch issuance complete</p>
                <p className="m-0 mt-0.5 text-xs text-[#75777f]">When a bulk upload finishes signing.</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifBatch((v) => !v)}
                className="relative h-5 w-9 rounded-full transition-colors"
                style={{ background: notifBatch ? "#0d9668" : "#c5c6cf" }}
              >
                <span className="absolute top-0.5 size-4 rounded-full bg-white transition-transform" style={{ transform: notifBatch ? "translateX(18px)" : "translateX(2px)" }} />
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-4 text-lg font-semibold">Security</h3>
            <div className="mb-4">
              <label className="mb-1.5 block text-[13px] font-semibold">Current Password</label>
              <input type="password" autoComplete="current-password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm" />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">New Password</label>
                <input type="password" autoComplete="new-password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">Confirm Password</label>
                <input type="password" autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm" />
              </div>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && <p className="mb-3 text-xs text-[#C0392B]">Passwords don't match.</p>}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={submitPassword}
                disabled={!passwordsMatch || changePassword.isPending}
                className="rounded px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#005eb3" }}
              >
                {changePassword.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
