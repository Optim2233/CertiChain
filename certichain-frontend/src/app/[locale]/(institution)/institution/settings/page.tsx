"use client"
import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { useInstitutionMe, useUpdateInstitution } from "@/features/institution"
import { useChangePassword } from "@/features/auth"
import { CredentialCard } from "@/shared/components/credential-card"
import { toast } from "sonner"

const HEX_RE = /^#[0-9a-fA-F]{6}$/
type AccentPattern = "hatch" | "dots" | "none" | "grid" | "waves" | "circles"

function EnumButtons({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded border border-[#c5c6cf]">
      {options.map((p) => (
        <button key={p} type="button" onClick={() => onChange(p)} className="px-3 py-2 text-xs font-semibold capitalize" style={{ background: value === p ? "#005eb3" : "#fff", color: value === p ? "#fff" : "#44474e" }}>{p}</button>
      ))}
    </div>
  )
}

export default function InstitutionSettingsPage() {
  const t = useTranslations("institution")
  const tc = useTranslations("common")
  const { data: institutionData, isLoading } = useInstitutionMe()
  const institution: any = institutionData
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
  const [secondaryBrandColor, setSecondaryBrandColor] = useState("")
  const [accentPattern, setAccentPattern] = useState<AccentPattern>("hatch")
  const [accentColor, setAccentColor] = useState("light")
  const [patternScale, setPatternScale] = useState("md")
  const [titleFont, setTitleFont] = useState("heading")
  const [medalPosition, setMedalPosition] = useState("top-left")
  const [watermarkIcon, setWatermarkIcon] = useState("workspace_premium")
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profileTouched, setProfileTouched] = useState(false)

  useEffect(() => {
    if (institution) {
      setName(institution.name ?? ""); setPhone(institution.phone ?? ""); setWebsite(institution.website ?? "")
      setProfileImageUrlInput(institution.profileImageUrl ?? ""); setBrandColor(institution.brandColor ?? "")
      setSecondaryBrandColor(institution.secondaryBrandColor ?? "")
      setAccentPattern((institution.accentPattern as AccentPattern) ?? "hatch")
      setAccentColor(institution.accentColor ?? "light")
      setPatternScale(institution.patternScale ?? "md")
      setTitleFont(institution.titleFont ?? "heading")
      setMedalPosition(institution.medalPosition ?? "top-left"); setWatermarkIcon(institution.watermarkIcon ?? "workspace_premium")
    }
  }, [institution])

  useEffect(() => {
    if (profileFile) { const url = URL.createObjectURL(profileFile); setPreviewUrl(url); return () => URL.revokeObjectURL(url) }
    else setPreviewUrl(null)
  }, [profileFile])

  const displayImage = previewUrl || (logoRemoved ? null : institution?.profileImageUrl) || null
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword
  function submitPassword() {
    if (!passwordsMatch) return
    changePassword.mutate({ currentPassword, newPassword }, { onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); toast.success(t("toastPwUpdated")) }, onError: (e: unknown) => { console.error(e); toast.error(t("toastFailed")) } })
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null; if (!file) return
    if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)) { toast.error(t("toastUnsupported")); return }
    if (file.size > 5*1024*1024) { toast.error(t("toastTooLarge")); return }
    setProfileFile(file); setLogoRemoved(false); setProfileTouched(true)
  }
  function handleRemoveImage() {
    setProfileFile(null); setPreviewUrl(null); if(fileInputRef.current) fileInputRef.current.value=""; setProfileImageUrlInput("")
    if(institution?.profileImageUrl){ setLogoRemoved(true); setProfileTouched(true)}
  }
  const nameValid = name.trim().length>0; const phoneValid = phone.trim().length===0||phone.trim().length>=6
  const brandColorValid = brandColor.trim().length===0||HEX_RE.test(brandColor.trim())
  const secondaryValid = secondaryBrandColor.trim().length===0||HEX_RE.test(secondaryBrandColor.trim())
  function saveProfile() {
    setProfileTouched(true)
    if(!nameValid){toast.error(t("toastNameReq")); return}
    if(!phoneValid){toast.error(t("toastPhone")); return}
    if(!brandColorValid||!secondaryValid){toast.error(t("toastColor")); return}
    const payload: any = {}
    if(name.trim()!==(institution?.name??"")) payload.name=name.trim()
    if(phone.trim()!==(institution?.phone??"")) payload.phone=phone.trim()
    if(website.trim()!==(institution?.website??"")) payload.website=website.trim()
    if(profileFile) payload.profileImage=profileFile
    else if(logoRemoved) payload.profileImageUrl=""
    else if(profileImageUrlInput.trim()!==(institution?.profileImageUrl??"")) payload.profileImageUrl=profileImageUrlInput.trim()
    if(brandColor.trim()!==(institution?.brandColor??"")) payload.brandColor=brandColor.trim()
    if(secondaryBrandColor.trim()!==(institution?.secondaryBrandColor??"")) payload.secondaryBrandColor=secondaryBrandColor.trim()
    if(accentPattern!==((institution?.accentPattern??"hatch") as any)) payload.accentPattern=accentPattern
    if(accentColor!==(institution?.accentColor??"light")) payload.accentColor=accentColor
    if(patternScale!==(institution?.patternScale??"md")) payload.patternScale=patternScale
    if(titleFont!==(institution?.titleFont??"heading")) payload.titleFont=titleFont
    if(medalPosition!==(institution?.medalPosition??"top-left")) payload.medalPosition=medalPosition
    if(watermarkIcon!==(institution?.watermarkIcon??"workspace_premium")) payload.watermarkIcon=watermarkIcon
    if(Object.keys(payload).length===0&&!profileFile){toast.info(t("noChanges")); return}
    updateInstitution.mutate(payload, { onSuccess:()=>{toast.success(t("profileUpdated")); setProfileFile(null); setLogoRemoved(false); setProfileTouched(false); if(fileInputRef.current) fileInputRef.current.value=""}, onError:(e:any)=>{ console.error(e); toast.error(t("toastFailed")) }})
  }
  const hasProfileChanges = true

  return (
    <main className="w-full px-6 py-8">
      <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">{t("settingsTitle")}</h2>
      <p className="m-0 mb-6 text-sm text-[#44474e]">{t("settingsSub")}</p>
      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div className="h-fit rounded-lg border border-[#c5c6cf] bg-white p-6 text-center">
          <div className="relative mx-auto mb-4 size-20 overflow-hidden rounded-xl" style={{ background: "#02275A" }}>
            {displayImage ? <img src={displayImage} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-white p-3"><img src="/certichain-shield.svg" alt="" className="h-full w-full object-contain" /></div>}
            <button type="button" onClick={()=>fileInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100"><span className="material-symbols-outlined text-white">photo_camera</span></button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
          <h3 className="font-heading m-0 text-lg font-bold">{institution?.name ?? "—"}</h3>
          <p className="m-0 mb-2 mt-1 text-[13px] text-[#75777f]">{institution?.status==="APPROVED"?t("accredited"):institution?.status??"—"}</p>
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" onClick={()=>fileInputRef.current?.click()} className="rounded border border-[#c5c6cf] bg-white px-4 py-2 text-xs font-semibold"> {displayImage?t("changeLogo"):t("uploadLogo")} </button>
            {displayImage && <button type="button" onClick={handleRemoveImage} className="text-xs text-[#C0392B] underline">{tc("remove")}</button>}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-4 text-lg font-semibold">{t("institutionInfo")}</h3>
            {isLoading ? <p className="text-sm text-[#75777f]">{tc("loading")}</p> : (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <div><label className="mb-1.5 block text-[13px] font-semibold">{t("institutionName")}</label><input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded border px-3.5 py-2.5 text-sm" style={{borderColor: profileTouched&&!nameValid?"#C0392B":"#c5c6cf"}} /></div>
                  <div><label className="mb-1.5 block text-[13px] font-semibold">{t("ministryRef")}</label><input type="text" value={institution?.ministry ?? ""} disabled className="w-full rounded border bg-[#f7f9fb] px-3.5 py-2.5 text-sm" /></div>
                  <div><label className="mb-1.5 block text-[13px] font-semibold">{t("phone")}</label><input type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full rounded border px-3.5 py-2.5 text-sm" /></div>
                  <div><label className="mb-1.5 block text-[13px] font-semibold">{t("website")}</label><input type="text" value={website} onChange={(e)=>setWebsite(e.target.value)} className="w-full rounded border px-3.5 py-2.5 text-sm" /></div>
                  <div className="col-span-2"><label className="mb-1.5 block text-[13px] font-semibold">{t("logoUrl")}</label><input type="text" value={profileImageUrlInput} onChange={(e)=>setProfileImageUrlInput(e.target.value)} disabled={!!profileFile} className="w-full rounded border px-3.5 py-2.5 text-sm disabled:bg-[#f7f9fb]" /></div>
                  <div><label className="mb-1.5 block text-[13px] font-semibold">{t("brandColor")}</label><div className="flex items-center gap-2"><input type="color" value={HEX_RE.test(brandColor)?brandColor:"#0b1e3d"} onChange={(e)=>setBrandColor(e.target.value)} className="h-10 w-12 rounded border p-0.5" /><input type="text" value={brandColor} onChange={(e)=>setBrandColor(e.target.value)} placeholder="#0B1E3D" className="w-full rounded border px-3.5 py-2.5 text-sm" />{brandColor&&<button type="button" onClick={()=>setBrandColor("")} className="text-xs underline text-[#C0392B]">{t("clear")}</button>}</div></div>
                  <div><label className="mb-1.5 block text-[13px] font-semibold">{t("secondaryColor")}</label><div className="flex items-center gap-2"><input type="color" value={HEX_RE.test(secondaryBrandColor)?secondaryBrandColor:"#123564"} onChange={(e)=>setSecondaryBrandColor(e.target.value)} className="h-10 w-12 rounded border p-0.5" /><input type="text" value={secondaryBrandColor} onChange={(e)=>setSecondaryBrandColor(e.target.value)} placeholder="#123564" className="w-full rounded border px-3.5 py-2.5 text-sm" />{secondaryBrandColor&&<button type="button" onClick={()=>setSecondaryBrandColor("")} className="text-xs underline text-[#C0392B]">{t("clear")}</button>}</div></div>
                </div>

                <h4 className="font-heading mt-6 mb-3 text-sm font-bold">{t("watermarkPattern")}</h4>
                <div className="grid grid-cols-2 gap-5">
                  <div><label className="mb-1.5 block text-xs font-semibold">{t("accentPattern")}</label><EnumButtons value={accentPattern} options={["hatch","dots","grid","waves","circles","none"]} onChange={(v)=>setAccentPattern(v as any)} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold">{t("accentColor")}</label><EnumButtons value={accentColor} options={["light","brand","gold"]} onChange={setAccentColor} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold">{t("patternScale")}</label><EnumButtons value={patternScale} options={["sm","md","lg"]} onChange={setPatternScale} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold">{t("watermarkIcon")}</label><EnumButtons value={watermarkIcon} options={["workspace_premium","verified","stars","none"]} onChange={setWatermarkIcon} /></div>
                </div>

                <h4 className="font-heading mt-6 mb-3 text-sm font-bold">{t("typography")}</h4>
                <div className="grid grid-cols-2 gap-5">
                  <div><label className="mb-1.5 block text-xs font-semibold">{t("titleFont")}</label><EnumButtons value={titleFont} options={["heading","serif","mono"]} onChange={setTitleFont} /></div>
                </div>

                <h4 className="font-heading mt-6 mb-3 text-sm font-bold">{t("medal")}</h4>
                <div className="grid grid-cols-2 gap-5">
                  <div><label className="mb-1.5 block text-xs font-semibold">{t("medalPosition")}</label><EnumButtons value={medalPosition} options={["top-left","top-right"]} onChange={setMedalPosition} /></div>
                </div>

                <div className="mt-6"><label className="mb-1.5 block text-[13px] font-semibold">{t("preview")}</label><div className="max-w-xs"><CredentialCard id="preview" type="CERTIFICATE" title="Bachelor of Science" subtitle={`${name.trim()||institution?.name||"Your institution"} · ${new Date().getFullYear()}`} status="ISSUED" institutionName={name.trim()||institution?.name} brandColor={HEX_RE.test(brandColor.trim())?brandColor.trim():null} secondaryBrandColor={HEX_RE.test(secondaryBrandColor.trim())?secondaryBrandColor.trim():null} logoUrl={displayImage} accentPattern={accentPattern} accentColor={accentColor} patternScale={patternScale} titleFont={titleFont} medalPosition={medalPosition} watermarkIcon={watermarkIcon} /></div></div>

                <div className="mt-5 flex justify-end"><button type="button" onClick={saveProfile} disabled={updateInstitution.isPending} className="rounded px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{background:"#005eb3"}}>{updateInstitution.isPending?tc("saving"):t("saveProfile")}</button></div>
              </>
            )}
          </div>
          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-1 text-lg font-semibold">{t("notifPrefs")}</h3>
            <div className="flex items-center justify-between border-b py-2.5"><div><p className="m-0 text-sm font-semibold">{t("notifDispute")}</p></div><button type="button" onClick={()=>setNotifDispute(v=>!v)} className="relative h-5 w-9 rounded-full" style={{background:notifDispute?"#0d9668":"#c5c6cf"}}><span className="absolute top-0.5 size-4 rounded-full bg-white" style={{transform:notifDispute?"translateX(18px)":"translateX(2px)"}} /></button></div>
            <div className="flex items-center justify-between py-2.5"><div><p className="m-0 text-sm font-semibold">{t("notifBatch")}</p></div><button type="button" onClick={()=>setNotifBatch(v=>!v)} className="relative h-5 w-9 rounded-full" style={{background:notifBatch?"#0d9668":"#c5c6cf"}}><span className="absolute top-0.5 size-4 rounded-full bg-white" style={{transform:notifBatch?"translateX(18px)":"translateX(2px)"}} /></button></div>
          </div>
          <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
            <h3 className="font-heading mb-4 text-lg font-semibold">{t("secTitle")}</h3>
            <div className="mb-4"><label className="mb-1.5 block text-[13px] font-semibold">{t("curPw")}</label><input type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} className="w-full rounded border px-3.5 py-2.5 text-sm" /></div>
            <div className="mb-4 grid grid-cols-2 gap-5"><div><label className="mb-1.5 block text-[13px] font-semibold">{t("newPwLbl")}</label><input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="w-full rounded border px-3.5 py-2.5 text-sm" /></div><div><label className="mb-1.5 block text-[13px] font-semibold">{t("confPw")}</label><input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} className="w-full rounded border px-3.5 py-2.5 text-sm" /></div></div>
            <div className="flex justify-end"><button type="button" onClick={submitPassword} disabled={!passwordsMatch||changePassword.isPending} className="rounded px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{background:"#005eb3"}}>{changePassword.isPending?tc("saving"):tc("save")}</button></div>
          </div>
        </div>
      </div>
    </main>
  )
}
