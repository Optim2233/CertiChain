"use client"

import { useState, useEffect, useRef } from "react"
import { useInstitutionMe, useUpdateInstitution } from "@/features/institution"
import { useChangePassword } from "@/features/auth"
import { CredentialCard } from "@/shared/components/credential-card"
import { toast } from "sonner"

const HEX_RE = /^#[0-9a-fA-F]{6}$/
type AccentPattern = "hatch" | "dots" | "none"

export default function InstitutionSettingsPage() {
  const { data: institutionData, isLoading } = useInstitutionMe()
  const institution = institutionData
  const updateInstitution = useUpdateInstitution()
  const changePassword = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [notifDispute, setNotifDispute] = useState(true)
  const [notifBatch, setNotifBatch] = useState(true)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [profileImageUrlInput, setProfileImageUrlInput] = useState("")
  const [brandColor, setBrandColor] = useState("")
  const [accentPattern, setAccentPattern] = useState<AccentPattern>("hatch")
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profileTouched, setProfileTouched] = useState(false)

  useEffect(() => {
    if (institution) {
      setName(institution.name ?? "")
      setPhone(institution.phone ?? "")
      setWebsite(institution.website ?? "")
      setProfileImageUrlInput(institution.profileImageUrl ?? "")
      setBrandColor(institution.brandColor ?? "")
      setAccentPattern((institution.accentPattern as AccentPattern) ?? "hatch")
    }
  }, [institution])

  useEffect(() => {
    if (profileFile) {
      const url = URL.createObjectURL(profileFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [profileFile])

  const displayImage = previewUrl || institution?.profileImageUrl || null

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  function submitPassword() {
    if (!passwordsMatch) return
    changePassword.mutate(
      { currentPassword, newPassword },
      { onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); toast.success("Password updated") }, onError: (e: unknown) => toast.error((e as { message?: string })?.message ?? "Failed to change password") }
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Unsupported image type (use jpeg, png, webp, gif)")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB)")
      return
    }
    setProfileFile(file)
    setProfileTouched(true)
  }

  function handleRemoveImage() {
    setProfileFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (institution?.profileImageUrl) {
      setProfileImageUrlInput("")
      setProfileTouched(true)
    }
  }

  const nameValid = name.trim().length > 0
  const phoneValid = phone.trim().length === 0 || phone.trim().length >= 6
  const brandColorValid = brandColor.trim().length === 0 || HEX_RE.test(brandColor.trim())

  function saveProfile() {
    setProfileTouched(true)
    if (!nameValid) { toast.error("Institution name is required"); return }
    if (!phoneValid) { toast.error("Phone must be at least 6 characters"); return }
    if (!brandColorValid) { toast.error("Brand color must be a #RRGGBB hex value"); return }
    const payload: { name?: string; phone?: string; website?: string; profileImageUrl?: string; profileImage?: File | null; brandColor?: string; accentPattern?: AccentPattern } = {}
    if (name.trim() !== (institution?.name ?? "")) payload.name = name.trim()
    if (phone.trim() !== (institution?.phone ?? "")) payload.phone = phone.trim()
    if (website.trim() !== (institution?.website ?? "")) payload.website = website.trim()
    if (profileFile) {
      payload.profileImage = profileFile
    } else if (profileImageUrlInput.trim() !== (institution?.profileImageUrl ?? "")) {
      payload.profileImageUrl = profileImageUrlInput.trim()
    }
    if (brandColor.trim() !== (institution?.brandColor ?? "")) payload.brandColor = brandColor.trim()
    if (accentPattern !== ((institution?.accentPattern as AccentPattern) ?? "hatch")) payload.accentPattern = accentPattern
    if (Object.keys(payload).length === 0 && !profileFile) {
      toast.info("No changes to save")
      return
    }
    updateInstitution.mutate(payload, {
      onSuccess: () => {
        toast.success("Profile updated")
        setProfileFile(null)
        setProfileTouched(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? "Failed to update profile"),
    })
  }

  const hasProfileChanges = name.trim() !== (institution?.name ?? "") || phone.trim() !== (institution?.phone ?? "") || website.trim() !== (institution?.website ?? "") || !!profileFile || profileImageUrlInput.trim() !== (institution?.profileImageUrl ?? "") || brandColor.trim() !== (institution?.brandColor ?? "") || accentPattern !== ((institution?.accentPattern as AccentPattern) ?? "hatch")

  return (
    <main className="w-full px-6 py-8">
      <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">Settings</h2>
      <p className="m-0 mb-6 text-sm text-[#44474e]">Manage your institution&apos;s profile, notifications, and account security.</p>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div className="h-fit rounded-lg border border-[#c5c6cf] bg-white p-6 text-center">
          <div className="relative mx-auto mb-4 size-20 overflow-hidden rounded-full" style={{ background: "#02275A" }}>
            {displayImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayImage} alt="Institution logo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white">
                <span className="material-symbols-outlined text-[36px]">account_balance</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
              aria-label="Change institution logo"
            >
              <span className="material-symbols-outlined text-white">photo_camera</span>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
          <h3 className="font-heading m-0 text-lg font-bold">{institution?.name ?? "—"}</h3>
          <p className="m-0 mb-2 mt-1 text-[13px] text-[#75777f]">
            {institution?.status === "APPROVED" ? "Accredited institution" : institution?.status ?? "—"}
          </p>
          {institution?.phone && <p className="m-0 text-xs text-[#44474e]">{institution.phone}</p>}
          {institution?.website && <p className="m-0 text-xs text-[#005eb3] underline">{institution.website}</p>}
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded border border-[#c5c6cf] bg-white px-4 py-2 text-xs font-semibold text-[#44474e] hover:bg-[#f7f9fb]">
              {displayImage ? "Change logo" : "Upload logo"}
            </button>
            {displayImage && (
              <button type="button" onClick={handleRemoveImage} className="text-xs text-[#C0392B] underline">
                Remove
              </button>
            )}
            <p className="m-0 text-[11px] leading-tight text-[#75777f]">Your institution&apos;s logo — shown on issued certificates.<br />JPEG, PNG, WebP, GIF • max 5MB</p>
          </div>
          {profileFile && <p className="m-0 mt-2 text-xs font-semibold text-[#0d9668]">New image selected: {profileFile.name}</p>}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-4 text-lg font-semibold">Institution Information</h3>
            {isLoading ? (
              <p className="text-sm text-[#75777f]">Loading…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold">Institution Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3.5 py-2.5 text-sm" style={{ borderColor: profileTouched && !nameValid ? "#C0392B" : "#c5c6cf" }} />
                    {profileTouched && !nameValid && <p className="mt-1 text-xs text-[#C0392B]">Name is required</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold">Ministry Reference</label>
                    <input type="text" value={institution?.ministry ?? ""} disabled className="w-full rounded border border-[#c5c6cf] bg-[#f7f9fb] px-3.5 py-2.5 text-sm text-[#75777f]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold">Phone</label>
                    <input type="tel" placeholder="+855 12 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded border px-3.5 py-2.5 text-sm" style={{ borderColor: profileTouched && !phoneValid ? "#C0392B" : "#c5c6cf" }} />
                    {profileTouched && !phoneValid && <p className="mt-1 text-xs text-[#C0392B]">At least 6 characters</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold">Website</label>
                    <input type="text" placeholder="https://example.edu" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full rounded border px-3.5 py-2.5 text-sm" style={{ borderColor: "#c5c6cf" }} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-[13px] font-semibold">Logo URL <span className="font-normal text-[#75777f]">(fallback if upload is unavailable)</span></label>
                    <input type="text" placeholder="https://..." value={profileImageUrlInput} onChange={(e) => setProfileImageUrlInput(e.target.value)} disabled={!!profileFile} className="w-full rounded border px-3.5 py-2.5 text-sm disabled:bg-[#f7f9fb] disabled:text-[#75777f]" style={{ borderColor: "#c5c6cf" }} />
                    {profileFile && <p className="mt-1 text-xs text-[#75777f]">Using uploaded file — URL field ignored</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold">Brand color <span className="font-normal text-[#75777f]">(certificate accent)</span></label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={HEX_RE.test(brandColor) ? brandColor : "#0b1e3d"}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="h-10 w-12 shrink-0 rounded border border-[#c5c6cf] bg-white p-0.5"
                        aria-label="Brand color picker"
                      />
                      <input
                        type="text"
                        placeholder="#0B1E3D"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-full rounded border px-3.5 py-2.5 text-sm"
                        style={{ borderColor: profileTouched && !brandColorValid ? "#C0392B" : "#c5c6cf" }}
                      />
                      {brandColor && (
                        <button type="button" onClick={() => setBrandColor("")} className="shrink-0 text-xs text-[#C0392B] underline">Clear</button>
                      )}
                    </div>
                    {profileTouched && !brandColorValid && <p className="mt-1 text-xs text-[#C0392B]">Use a #RRGGBB hex value</p>}
                    <p className="mt-1 text-xs text-[#75777f]">Very light colors are rejected — card text is white.</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold">Accent pattern</label>
                    <div className="inline-flex overflow-hidden rounded border border-[#c5c6cf]">
                      {(["hatch", "dots", "none"] as AccentPattern[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setAccentPattern(p)}
                          className="px-4 py-2.5 text-sm font-semibold capitalize"
                          style={{
                            background: accentPattern === p ? "#005eb3" : "#fff",
                            color: accentPattern === p ? "#fff" : "#44474e",
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-[13px] font-semibold">Preview</label>
                    <div className="max-w-xs">
                      <CredentialCard
                        id="preview"
                        type="CERTIFICATE"
                        title="Bachelor of Science"
                        subtitle={`${name.trim() || institution?.name || "Your institution"} · ${new Date().getFullYear()}`}
                        status="ISSUED"
                        institutionName={name.trim() || institution?.name}
                        brandColor={HEX_RE.test(brandColor.trim()) ? brandColor.trim() : null}
                        logoUrl={displayImage}
                        accentPattern={accentPattern}
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-[13px] font-semibold">Accreditation Status</label>
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: institution?.status === "APPROVED" ? "#0d9668" : "#a5730f" }}>
                      <span className="material-symbols-outlined text-base">{institution?.status === "APPROVED" ? "check_circle" : "schedule"}</span>
                      {institution?.status ?? "Pending review"}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={!hasProfileChanges || updateInstitution.isPending}
                    className="rounded px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "#005eb3" }}
                  >
                    {updateInstitution.isPending ? "Saving…" : "Save Profile"}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-1 text-lg font-semibold">Notification Preferences</h3>
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
            {confirmPassword.length > 0 && !passwordsMatch && <p className="mb-3 text-xs text-[#C0392B]">Passwords don&apos;t match.</p>}
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
