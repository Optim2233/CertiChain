"use client"

import { useState } from "react"
import { useAuthStore, useChangePassword } from "@/features/auth"
import { Skeleton } from "@/shared/components/ui/skeleton"

const DEFAULT_PREFS = [
  { key: "dispute", label: "Dispute updates", desc: "When an institution resolves a dispute you raised.", on: true },
  { key: "share", label: "Share activity", desc: "When someone views a credential you shared.", on: true },
  { key: "issuance", label: "New credential issued", desc: "When an institution issues you a new credential.", on: true },
]

export default function GraduateSettingsPage() {
  const user = useAuthStore((s) => s.user)
  const changePassword = useChangePassword()
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase()
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  function toggle(key: string) {
    setPrefs((p) => p.map((x) => (x.key === key ? { ...x, on: !x.on } : x)))
  }

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
      <p className="m-0 mb-6 text-sm text-[#44474e]">Manage your profile, notifications, and account security.</p>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div className="h-fit rounded-lg border border-[#c5c6cf] bg-white p-6 text-center">
          <div
            className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full text-white"
            style={{ background: "#02275A" }}
          >
            <span className="font-heading text-[28px] font-bold">{initials}</span>
          </div>
          <h3 className="font-heading m-0 text-lg font-bold">
            {user ? user.email : <Skeleton className="h-5 w-48" />}
          </h3>
          <p className="m-0 mb-4 mt-1 text-[13px] text-[#75777f]">Graduate account</p>
          {/* ponytail: no photo upload endpoint/field exists for graduates yet -
              button removed rather than linking nowhere. */}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-4 text-lg font-semibold">Account Information</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">Email Address</label>
                <input type="email" value={user?.email ?? ""} disabled className="w-full rounded border border-[#c5c6cf] bg-[#f7f9fb] px-3.5 py-2.5 text-sm text-[#75777f]" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">Role</label>
                <input type="text" value={user?.role ?? "GRADUATE"} disabled className="w-full rounded border border-[#c5c6cf] bg-[#f7f9fb] px-3.5 py-2.5 text-sm capitalize text-[#75777f]" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-1 text-lg font-semibold">Notification Preferences</h3>
            {/* ponytail: no backend endpoint to persist these yet - toggles are
                session-only state, and honest about it, rather than faking a save.
                Wire to a real /api/graduate/preferences endpoint when one exists. */}
            <p className="m-0 mb-4 text-xs text-[#75777f]">Not saved yet — resets on refresh.</p>
            {prefs.map((np, i) => (
              <div
                key={np.key}
                className="flex items-center justify-between py-2.5"
                style={i !== prefs.length - 1 ? { borderBottom: "1px solid #eef0f3" } : undefined}
              >
                <div>
                  <p className="m-0 text-sm font-semibold">{np.label}</p>
                  <p className="m-0 mt-0.5 text-xs text-[#75777f]">{np.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(np.key)}
                  className="relative h-5 w-9 rounded-full transition-colors"
                  style={{ background: np.on ? "#0d9668" : "#c5c6cf" }}
                >
                  <span
                    className="absolute top-0.5 size-4 rounded-full bg-white transition-transform"
                    style={{ transform: np.on ? "translateX(18px)" : "translateX(2px)" }}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-4 text-lg font-semibold">Security</h3>
            <div className="mb-4">
              <label className="mb-1.5 block text-[13px] font-semibold">Current Password</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">New Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">Confirm Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mb-3 text-xs text-[#C0392B]">Passwords don't match.</p>
            )}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#0d9668" }}>
                <span className="material-symbols-outlined text-base">verified</span>
                Email verified
              </span>
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
