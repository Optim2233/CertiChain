"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useAuthStore, useChangePassword } from "@/features/auth"
import { useGraduateProfile, useUpdateGraduateProfile } from "@/features/graduate"
import { Skeleton } from "@/shared/components/ui/skeleton"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const PREF_KEYS = [
  { key: "dispute", labelKey: "disputeUpdates", descKey: "disputeUpdatesSub" },
  { key: "share", labelKey: "shareActivityPref", descKey: "shareActivityPrefSub" },
  { key: "issuance", labelKey: "newCredPref", descKey: "newCredPrefSub" },
] as const

export default function GraduateSettingsPage() {
  const t = useTranslations("graduate")
  const tc = useTranslations("common")
  const ta = useTranslations("auth")
  const user = useAuthStore((s) => s.user)
  const changePassword = useChangePassword()
  const { data: profile } = useGraduateProfile()
  const updateProfile = useUpdateGraduateProfile()
  const fileInput = useRef<HTMLInputElement>(null)

  const [prefs, setPrefs] = useState(() => PREF_KEYS.map((p) => ({ ...p, on: true })))
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [imageError, setImageError] = useState<string | null>(null)

  // Seed the editable fields once the profile loads (and after a save re-fetches).
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "")
      setLastName(profile.lastName ?? "")
      setPhone(profile.phone ?? "")
    }
  }, [profile])

  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ")
  const initials =
    (profile?.firstName?.[0] ?? "") + (profile?.lastName?.[0] ?? "") ||
    (user?.email ?? "?").slice(0, 2).toUpperCase()
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword
  const profileDirty =
    firstName !== (profile?.firstName ?? "") ||
    lastName !== (profile?.lastName ?? "") ||
    phone !== (profile?.phone ?? "")

  function toggle(key: string) {
    setPrefs((p) => p.map((x) => (x.key === key ? { ...x, on: !x.on } : x)))
  }

  function saveProfile() {
    updateProfile.mutate({ firstName, lastName, phone })
  }

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) return setImageError(t("chooseImage"))
    if (file.size > MAX_IMAGE_BYTES) return setImageError(t("imageSize"))
    setImageError(null)
    updateProfile.mutate({ profileImage: file })
  }

  function removePhoto() {
    setImageError(null)
    updateProfile.mutate({ profileImageUrl: "" })
  }

  function submitPassword() {
    if (!passwordsMatch) return
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); toast.success(ta("pwUpdated")) },
        onError: () => { toast.error(ta("pwUpdateFailed")) },
      }
    )
  }

  return (
    <main className="w-full px-6 py-8">
      <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">{t("settingsTitle")}</h2>
      <p className="m-0 mb-6 text-sm text-[#44474e]">{t("settingsSub")}</p>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div className="h-fit rounded-lg border border-[#c5c6cf] bg-white p-6 text-center">
          {profile?.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profileImageUrl}
              alt={name || tc("profileAlt")}
              loading="lazy"
              className="mx-auto mb-4 size-20 rounded-full object-cover"
            />
          ) : (
            <div
              className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full text-white"
              style={{ background: "#02275A" }}
            >
              <span className="font-heading text-[28px] font-bold uppercase">{initials}</span>
            </div>
          )}
          <h3 className="font-heading m-0 text-lg font-bold">
            {profile ? name || profile.email : <Skeleton className="mx-auto h-5 w-40" />}
          </h3>
          <p className="m-0 mb-4 mt-1 text-[13px] text-[#75777f]">{t("gradAccount")}</p>

          <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickPhoto} />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={updateProfile.isPending}
            className="w-full rounded border border-[#c5c6cf] py-2 text-sm font-semibold text-[#005eb3] disabled:opacity-50"
          >
            {updateProfile.isPending ? t("uploading") : profile?.profileImageUrl ? t("changePhoto") : t("uploadPhoto")}
          </button>
          {profile?.profileImageUrl && (
            <button
              type="button"
              onClick={removePhoto}
              disabled={updateProfile.isPending}
              className="mt-2 text-xs font-semibold text-[#C0392B] disabled:opacity-50"
            >
              {t("removePhoto")}
            </button>
          )}
          {imageError && <p className="mt-2 text-xs text-[#C0392B]">{imageError}</p>}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-4 text-lg font-semibold">{t("accountInfo")}</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">{t("firstName")}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">{t("lastName")}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">{t("phoneLbl")}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={50}
                  className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">{t("emailAddr")}</label>
                <input type="email" value={profile?.email ?? user?.email ?? ""} disabled className="w-full rounded border border-[#c5c6cf] bg-[#f7f9fb] px-3.5 py-2.5 text-sm text-[#75777f]" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={saveProfile}
                disabled={!profileDirty || updateProfile.isPending}
                className="rounded px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#005eb3" }}
              >
                {updateProfile.isPending ? tc("saving") : t("saveProfile")}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-1 text-lg font-semibold">{t("notifPrefs")}</h3>
            {/* ponytail: no backend endpoint to persist these yet - toggles are
                session-only state, and honest about it, rather than faking a save.
                Wire to a real /api/graduate/preferences endpoint when one exists. */}
            <p className="m-0 mb-4 text-xs text-[#75777f]">{t("notSaved")}</p>
            {prefs.map((np, i) => (
              <div
                key={np.key}
                className="flex items-center justify-between py-2.5"
                style={i !== prefs.length - 1 ? { borderBottom: "1px solid #eef0f3" } : undefined}
              >
                <div>
                  <p className="m-0 text-sm font-semibold">{t(np.labelKey)}</p>
                  <p className="m-0 mt-0.5 text-xs text-[#75777f]">{t(np.descKey)}</p>
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
            <h3 className="font-heading mb-4 text-lg font-semibold">{t("secTitle")}</h3>
            <div className="mb-4">
              <label className="mb-1.5 block text-[13px] font-semibold">{t("curPw")}</label>
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
                <label className="mb-1.5 block text-[13px] font-semibold">{ta("newPassword")}</label>
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
                <label className="mb-1.5 block text-[13px] font-semibold">{ta("confirmPassword")}</label>
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
              <p className="mb-3 text-xs text-[#C0392B]">{ta("passwordMismatch")}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#0d9668" }}>
                <span className="material-symbols-outlined text-base">verified</span>
                {t("emailVerified")}
              </span>
              <button
                type="button"
                onClick={submitPassword}
                disabled={!passwordsMatch || changePassword.isPending}
                className="rounded px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#005eb3" }}
              >
                {changePassword.isPending ? tc("saving") : tc("save")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
