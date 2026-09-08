"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useApplyInstitution } from "@/features/institution"
import { PasswordField } from "@/features/auth/components/PasswordField"
import { COUNTRY_CODES } from "@/features/auth/utils/countryCodes"
import { CertiChainShield } from "@/shared/components/brand/CertiChainShield"

const STEP_KEYS = ["stepType", "stepProfile", "stepDetails", "stepDocuments"] as const
const CATEGORIES = ["university", "college", "degreeCollege", "institute", "center"] as const
const MINISTRIES = ["Ministry of Education","Ministry of Science and Technology","Ministry of Health","Ministry of Defence","Ministry of Religious Affairs"] as const
const DOC_TYPES = ["establishmentLaw","establishmentAct","governmentOrder","governmentDecree","subDecree"] as const
type Person = { fullName:string; fullNameMyanmar:string; nationality:string; race:string; religion:string; nrcOrPassport:string; dateOfBirth:string; educationalQualification:string; currentAddress:string; permanentAddress:string; phone:string; email:string }
const emptyPerson = ():Person => ({ fullName:"",fullNameMyanmar:"",nationality:"",race:"",religion:"",nrcOrPassport:"",dateOfBirth:"",educationalQualification:"",currentAddress:"",permanentAddress:"",phone:"",email:""})

function Field({ label, req, value, onChange, placeholder, type="text", error }: { label:string; req?:boolean; value:string; onChange:(v:string)=>void; placeholder?:string; type?:string; error?:string }) {
  return <div><label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">{label} {req && <span className="text-[#C0392B]">*</span>}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border bg-[#fcfdff] px-3.5 py-3 text-sm outline-none placeholder:text-[#9aa0a6] focus:border-[#0462BA] focus:ring-4 focus:ring-[#d5e3ff]" style={{borderColor:error?"#C0392B":"#c5c6cf"}}/>{error && <p className="mt-1 text-xs font-medium text-[#C0392B]">{error}</p>}</div>
}
function PersonForm({ title, p, setP }: { title:string; p:Person; setP:(v:Person)=>void }) {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const upd = (k:keyof Person, v:string)=> setP({ ...p, [k]: v })
  return <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3"><p className="text-sm font-bold text-[#02275A]">{title}</p>
    <div className="grid gap-3 sm:grid-cols-2"><Field label={t("fullName")} req value={p.fullName} onChange={v=>upd("fullName",v)} placeholder="Aung Ko"/><Field label={t("myanmarName")} value={p.fullNameMyanmar} onChange={v=>upd("fullNameMyanmar",v)}/></div>
    <div className="grid gap-3 sm:grid-cols-3"><Field label={t("nationality")} value={p.nationality} onChange={v=>upd("nationality",v)}/><Field label={t("race")} value={p.race} onChange={v=>upd("race",v)}/><Field label={t("religion")} value={p.religion} onChange={v=>upd("religion",v)}/></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label={t("nrcPassport")} value={p.nrcOrPassport} onChange={v=>upd("nrcOrPassport",v)} placeholder="12/NAMA(N)123456"/><Field label={t("dob")} value={p.dateOfBirth} onChange={v=>upd("dateOfBirth",v)} type="date"/></div>
    <Field label={t("eduQual")} value={p.educationalQualification} onChange={v=>upd("educationalQualification",v)} placeholder="Ph.D."/>
    <Field label={t("currentAddr")} value={p.currentAddress} onChange={v=>upd("currentAddress",v)}/><Field label={t("permanentAddr")} value={p.permanentAddress} onChange={v=>upd("permanentAddress",v)}/>
    <div className="grid gap-3 sm:grid-cols-2"><Field label={tc("phone")} value={p.phone} onChange={v=>upd("phone",v)}/><Field label={tc("email")} value={p.email} onChange={v=>upd("email",v)} placeholder="a@example.com"/></div>
  </div>
}

export default function InstitutionRegisterPage() {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const apply = useApplyInstitution()
  const [step, setStep] = useState(0)
  const [touched, setTouched] = useState(false)
  // common
  const [institutionType, setInstitutionType] = useState<""|"public"|"private">("")
  const [name, setName] = useState("")
  const [institutionNameMm, setInstitutionNameMm] = useState("")
  const [institutionCategory, setInstitutionCategory] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phoneCountry, setPhoneCountry] = useState("+95")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [stateRegion, setStateRegion] = useState("")
  const [district, setDistrict] = useState("")
  const [township, setTownship] = useState("")
  const [ward, setWard] = useState("")
  const [street, setStreet] = useState("")
  const [postalCode, setPostalCode] = useState("")
  // public
  const [governingMinistry, setGoverningMinistry] = useState("")
  const [yearEstablished, setYearEstablished] = useState("")
  const [establishmentDocType, setEstablishmentDocType] = useState("")
  const [establishmentDocTitle, setEstablishmentDocTitle] = useState("")
  const [establishmentDocRef, setEstablishmentDocRef] = useState("")
  const [establishmentDocIssueDate, setEstablishmentDocIssueDate] = useState("")
  const [establishmentDocFile, setEstablishmentDocFile] = useState<File|null>(null)
  // private
  const [founders, setFounders] = useState<Person[]>([emptyPerson()])
  const [administrator, setAdministrator] = useState<Person>(emptyPerson())
  const [companyName, setCompanyName] = useState("")
  const [dicaCertificateNumber, setDicaCertificateNumber] = useState("")
  const [mycoRegistrationNumber, setMycoRegistrationNumber] = useState("")
  const [tinNumber, setTinNumber] = useState("")
  const [incorporationDate, setIncorporationDate] = useState("")
  const [ownershipStructure, setOwnershipStructure] = useState("")
  const [investmentAmount, setInvestmentAmount] = useState("")
  const [foreignInvolvement, setForeignInvolvement] = useState(false)
  const [micPermitNumber, setMicPermitNumber] = useState("")
  const [dicaCertificate, setDicaCertificate] = useState<File|null>(null)
  const [taxClearance, setTaxClearance] = useState<File|null>(null)
  const [micPermit, setMicPermit] = useState<File|null>(null)
  const [consent, setConsent] = useState(false)

  const profileValid = name.trim().length>0 && /\S+@\S+\.\S+/.test(email) && password.length>=8 && phone.trim().length>=6
  const detailsValid = institutionType==="public" ? governingMinistry.length>0 : founders.some(f=>f.fullName.trim().length>0)
  const docsValid = institutionType==="public" ? !!establishmentDocFile : (!!dicaCertificate && !!taxClearance && (!foreignInvolvement || !!micPermit || true))
  // micPermit optional even if foreign; allow submit without
  const canSubmit = !!institutionType && profileValid && consent && (institutionType==="private" ? (!!dicaCertificate && !!taxClearance) : !!establishmentDocFile)

  function submit() {
    setTouched(true)
    if (!canSubmit) return
    const fields: Record<string, unknown> = {
      name: name.trim(), institutionNameMm: institutionNameMm.trim()||undefined,
      institutionType, institutionCategory: institutionCategory||undefined,
      email: email.trim(), password, phone: `${phoneCountry} ${phone}`.trim(), website: website.trim()||undefined,
      stateRegion: stateRegion.trim()||undefined, district: district.trim()||undefined, township: township.trim()||undefined,
      ward: ward.trim()||undefined, street: street.trim()||undefined, postalCode: postalCode.trim()||undefined,
      governingMinistry: governingMinistry||undefined, yearEstablished: yearEstablished ? Number(yearEstablished) : undefined,
      establishmentDocType: establishmentDocType||undefined, establishmentDocTitle: establishmentDocTitle||undefined,
      establishmentDocRef: establishmentDocRef||undefined, establishmentDocIssueDate: establishmentDocIssueDate||undefined,
      companyName: companyName||undefined, dicaCertificateNumber: dicaCertificateNumber||undefined,
      mycoRegistrationNumber: mycoRegistrationNumber||undefined, tinNumber: tinNumber||undefined,
      incorporationDate: incorporationDate||undefined, ownershipStructure: ownershipStructure||undefined,
      investmentAmount: investmentAmount ? Number(investmentAmount) : undefined,
      foreignInvolvement, micPermitNumber: micPermitNumber||undefined,
      foundersJson: institutionType==="private" ? JSON.stringify(founders.filter(f=>f.fullName.trim())) : undefined,
      administratorJson: institutionType==="private" && administrator.fullName.trim() ? JSON.stringify(administrator) : undefined,
    }
    apply.mutate({ fields, files: { establishmentDocFile, dicaCertificate, taxClearance, micPermit } })
  }

  if (apply.isSuccess) {
    return <div className="min-h-screen bg-[#f7f9fb] flex flex-col"><header className="w-full bg-white border-b border-[#e6e8ec]"><div className="mx-auto max-w-[1120px] flex h-[60px] items-center px-6"><Link href="/" className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-white p-1"><CertiChainShield size={20} /></span><span className="text-[17px] font-extrabold tracking-tight text-[#02275A]">CertiChain</span></Link></div></header><main className="flex flex-1 items-center justify-center px-6 py-12"><div className="w-full max-w-[480px] rounded-[20px] border border-[#e6e8ec] bg-white p-10 text-center shadow-[0_16px_40px_rgba(2,39,90,0.08)]"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#e8f5e9] text-[#0d9668]"><span className="material-symbols-outlined text-[28px]">check_circle</span></span><h2 className="font-heading mt-4 text-2xl font-extrabold text-[#02275A]">{t("appSubmitted")}</h2><p className="mt-2 text-sm leading-relaxed text-[#44474e]">{t("appSubmittedSub")}</p><Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#0462BA] px-6 py-3 text-sm font-bold text-white">{t("backToLogin")}</Link></div></main></div>
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      <header className="w-full bg-white border-b border-[#e6e8ec]"><div className="mx-auto max-w-[1280px] flex h-[60px] items-center justify-between px-6"><Link href="/" className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-white p-1"><CertiChainShield size={20} /></span><span className="text-[17px] font-extrabold tracking-tight text-[#02275A]">CertiChain</span></Link><Link href="/login" className="hidden sm:inline-flex text-sm font-semibold text-[#44474e]">{t("alreadyAccredited")}</Link></div></header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="w-full max-w-[1160px] grid overflow-hidden rounded-[20px] border border-[#e6e8ec] bg-white shadow-[0_16px_48px_rgba(2,39,90,0.08)] md:grid-cols-[360px_1fr]">
          <div className="relative hidden flex-col justify-between overflow-hidden bg-[#02275A] p-8 md:flex">
            <div className="pointer-events-none absolute inset-0"><div className="absolute -top-24 -right-24 size-[300px] rounded-full bg-[#0462BA]/25 blur-[36px]" /><div className="absolute -bottom-20 -left-20 size-[280px] rounded-full bg-[#0d9668]/15 blur-[36px]" /></div>
            <div className="relative"><div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-full bg-white p-1"><CertiChainShield size={18} /></span><span className="text-sm font-extrabold text-white">CertiChain</span></div><h2 className="font-heading mt-8 text-[26px] font-extrabold leading-[1.05] text-white">{t("joinNetwork")}</h2><p className="mt-3 max-w-[300px] text-sm leading-relaxed text-white/70">{t("joinNetworkSub")}</p></div>
            <div className="relative space-y-3">{STEP_KEYS.map((key,i)=>{const active=i===step,done=i<step;return <div key={key} className="flex items-center gap-3"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${done?"bg-[#0d9668] text-white ring-[#0d9668]":active?"bg-white text-[#02275A] ring-white":"bg-white/10 text-white/60 ring-white/20"}`}>{done?<span className="material-symbols-outlined text-[14px]">check</span>:i+1}</span><span className={`text-sm ${active?"font-bold text-white":done?"font-semibold text-white":"font-medium text-white/60"}`}>{t(key)}</span></div>})}</div>
            <p className="relative flex items-center gap-2 text-xs text-white/50"><span className="size-1.5 rounded-full bg-emerald-400"/> {tc("trustedBy")}</p>
          </div>
          <div className="flex flex-col px-6 py-7 md:px-10 md:py-9">
            <div className="mb-6 flex items-center justify-between"><span className="inline-flex rounded-full bg-[#d5e3ff] px-3 py-1 text-xs font-bold tracking-widest text-[#02275A]">{t("stepOf", { n: step + 1 })}</span><div className="flex items-center gap-1.5 md:hidden">{STEP_KEYS.map((_,i)=><span key={i} className={`h-1.5 w-6 rounded-full ${i<=step?"bg-[#0462BA]":"bg-[#e6e8ec]"}`}/>)}</div></div>

            {step===0 && <>
              <h1 className="font-heading text-[22px] font-extrabold tracking-[-0.02em] text-[#02275A]">{t("chooseType")}</h1><p className="mt-1 text-sm text-[#44474e]">{t("chooseTypeSub")}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {(["public","private"] as const).map(ty=>{
                  const sel = institutionType===ty
                  return <button key={ty} type="button" onClick={()=>setInstitutionType(ty)} className={`rounded-2xl border-2 p-6 text-left transition ${sel?"border-[#0462BA] bg-[#f0f6ff]":"border-[#e6e8ec] bg-white hover:border-[#c5c6cf]"}`}>
                    <span className={`flex size-10 items-center justify-center rounded-xl ${sel?"bg-[#0462BA] text-white":"bg-[#f7f9fb] text-[#02275A]"} ring-1 ring-[#e6e8ec]`}><span className="material-symbols-outlined">{ty==="public"?"account_balance":"business"}</span></span>
                    <p className="mt-3 text-sm font-extrabold text-[#02275A] capitalize">{t(ty === "public" ? "publicCard" : "privateCard")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#44474e]">{ty==="public"?t("publicDesc"):t("privateDesc")}</p>
                    <p className="mt-2 text-xs font-semibold text-[#0462BA]">{ty==="public"?"e.g. Mandalay University":"e.g. Yangon International University"}</p>
                  </button>
                })}
              </div>
              {touched && !institutionType && <p className="mt-2 text-xs font-medium text-[#C0392B]">{t("selectType")}</p>}
              <div className="mt-7 flex justify-end border-t border-[#e6e8ec] pt-5"><button type="button" onClick={()=>{setTouched(true);if(institutionType) {setStep(1);setTouched(false)}}} className="inline-flex items-center gap-2 rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white">{tc("next")} <span className="material-symbols-outlined text-[18px]">arrow_forward</span></button></div>
            </>}

            {step===1 && <>
              <h1 className="font-heading text-[22px] font-extrabold text-[#02275A]">{t("profileTitle")}</h1><p className="mt-1 text-sm text-[#44474e]">{t("profileSub")}</p>
              <div className="mt-6 space-y-4">
                <Field label={t("institutionName")} req value={name} onChange={setName} placeholder="University of Information Technology" error={touched&&!name.trim()?t("required"):undefined}/>
                <div className="grid gap-4 sm:grid-cols-2"><Field label={t("myanmarName")} value={institutionNameMm} onChange={setInstitutionNameMm} placeholder="မန္တလေးတက္ကသိုလ်"/><div><label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">{t("category")}</label><select value={institutionCategory} onChange={e=>setInstitutionCategory(e.target.value)} className="w-full rounded-xl border border-[#c5c6cf] bg-white px-3.5 py-3 text-sm"><option value="">{t("select")}</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div></div>
                <Field label={t("adminEmail")} req value={email} onChange={setEmail} placeholder={t("emailPh")} error={touched&&!/\S+@\S+\.\S+/.test(email)?t("invalidEmail"):undefined}/>
                <div><label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">{t("contactPhone")} <span className="text-[#C0392B]">*</span></label><div className="flex gap-2"><select value={phoneCountry} onChange={e=>setPhoneCountry(e.target.value)} className="w-[110px] rounded-xl border border-[#c5c6cf] bg-white px-2 py-3 text-sm">{COUNTRY_CODES.map(cc=><option key={cc.code} value={cc.code}>{cc.label}</option>)}</select><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="9123 456 789" className="flex-1 rounded-xl border bg-[#fcfdff] px-3.5 py-3 text-sm" style={{borderColor:touched&&phone.trim().length<6?"#C0392B":"#c5c6cf"}}/></div>{touched&&phone.trim().length<6&&<p className="mt-1 text-xs text-[#C0392B]">{t("min6")}</p>}</div>
                <Field label={t("website")} value={website} onChange={setWebsite} placeholder="www.institution.edu"/>
                <div><label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">{t("accountPassword")} <span className="text-[#C0392B]">*</span></label><PasswordField value={password} onChange={setPassword} placeholder={t("min8")} showStrength />{touched&&password.length<8&&<p className="mt-1 text-xs text-[#C0392B]">{t("min8")}</p>}</div>
                <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3"><p className="text-sm font-bold text-[#02275A]">{t("address")}</p><div className="grid gap-3 sm:grid-cols-3"><Field label={t("stateRegion")} value={stateRegion} onChange={setStateRegion}/><Field label={t("district")} value={district} onChange={setDistrict}/><Field label={t("township")} value={township} onChange={setTownship}/></div><div className="grid gap-3 sm:grid-cols-3"><Field label={t("ward")} value={ward} onChange={setWard}/><Field label={t("street")} value={street} onChange={setStreet}/><Field label={t("postalCode")} value={postalCode} onChange={setPostalCode}/></div></div>
              </div>
              <div className="mt-7 flex justify-between border-t border-[#e6e8ec] pt-5"><button type="button" onClick={()=>{setStep(0);setTouched(false)}} className="rounded-xl border border-[#c5c6cf] bg-white px-6 py-3 text-sm font-semibold">{tc("back")}</button><button type="button" onClick={()=>{setTouched(true);if(profileValid){setStep(2);setTouched(false)}}} className="rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white">{tc("next")} <span className="material-symbols-outlined text-[18px]">arrow_forward</span></button></div>
            </>}

            {step===2 && institutionType==="public" && <>
              <h1 className="font-heading text-[22px] font-extrabold text-[#02275A]">{t("publicDetails")}</h1><p className="mt-1 text-sm text-[#44474e]">{t("publicDetailsSub")}</p>
              <div className="mt-6 space-y-4">
                <div><label className="mb-1.5 block text-sm font-semibold">{t("governingMinistry")} <span className="text-[#C0392B]">*</span></label><select value={governingMinistry} onChange={e=>setGoverningMinistry(e.target.value)} className="w-full rounded-xl border border-[#c5c6cf] bg-white px-3.5 py-3 text-sm" style={{borderColor:touched&&!governingMinistry?"#C0392B":"#c5c6cf"}}><option value="">{t("selectMinistry")}</option>{MINISTRIES.map(m=><option key={m} value={m}>{m}</option>)}</select>{touched&&!governingMinistry&&<p className="mt-1 text-xs text-[#C0392B]">{t("required")}</p>}</div>
                <Field label={t("yearEstablished")} value={yearEstablished} onChange={setYearEstablished} placeholder="1994" type="number"/>
                <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3"><p className="text-sm font-bold text-[#02275A]">{t("estDoc")}</p>
                  <div><label className="mb-1.5 block text-sm font-semibold">{t("docType")}</label><select value={establishmentDocType} onChange={e=>setEstablishmentDocType(e.target.value)} className="w-full rounded-xl border border-[#c5c6cf] bg-white px-3.5 py-3 text-sm"><option value="">{t("select")}</option>{DOC_TYPES.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
                  <Field label={t("docTitle")} value={establishmentDocTitle} onChange={setEstablishmentDocTitle} placeholder="Mandalay University Establishment Law"/><Field label={t("docRef")} value={establishmentDocRef} onChange={setEstablishmentDocRef} placeholder="Law No. 15/94"/><Field label={t("docIssueDate")} value={establishmentDocIssueDate} onChange={setEstablishmentDocIssueDate} type="date"/>
                </div>
              </div>
              <div className="mt-7 flex justify-between border-t pt-5"><button type="button" onClick={()=>setStep(1)} className="rounded-xl border px-6 py-3 text-sm font-semibold">{tc("back")}</button><button type="button" onClick={()=>{setTouched(true);if(governingMinistry) {setStep(3);setTouched(false)}}} className="rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white">{tc("next")}</button></div>
            </>}

            {step===2 && institutionType==="private" && <>
              <h1 className="font-heading text-[22px] font-extrabold text-[#02275A]">{t("privateDetails")}</h1><p className="mt-1 text-sm text-[#44474e]">{t("privateDetailsSub")}</p>
              <div className="mt-6 space-y-4">
                <div className="space-y-3">{founders.map((f,i)=><div key={i} className="relative"><PersonForm title={t("founder", { n: i + 1 })} p={f} setP={v=>setFounders(founders.map((x,idx)=>idx===i?v:x))}/>{founders.length>1&&<button type="button" onClick={()=>setFounders(founders.filter((_,idx)=>idx!==i))} className="mt-2 text-xs font-semibold text-[#C0392B]">{tc("remove")}</button>}</div>)}<button type="button" onClick={()=>setFounders([...founders, emptyPerson()])} className="rounded-xl border border-dashed px-4 py-2 text-sm font-semibold">{t("addFounder")}</button></div>
                <PersonForm title={t("administrator")} p={administrator} setP={setAdministrator}/>
                <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3"><p className="text-sm font-bold text-[#02275A]">{t("businessReg")}</p>
                  <Field label={t("companyName")} value={companyName} onChange={setCompanyName}/><div className="grid gap-3 sm:grid-cols-2"><Field label={t("dicaNo")} value={dicaCertificateNumber} onChange={setDicaCertificateNumber}/><Field label={t("mycoNo")} value={mycoRegistrationNumber} onChange={setMycoRegistrationNumber}/></div>
                  <div className="grid gap-3 sm:grid-cols-2"><Field label={t("tinNo")} value={tinNumber} onChange={setTinNumber}/><Field label={t("incorpDate")} value={incorporationDate} onChange={setIncorporationDate} type="date"/></div>
                  <div className="grid gap-3 sm:grid-cols-2"><Field label={t("ownership")} value={ownershipStructure} onChange={setOwnershipStructure} placeholder="Private Limited Company"/><Field label={t("investment")} value={investmentAmount} onChange={setInvestmentAmount} type="number"/></div>
                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={foreignInvolvement} onChange={e=>setForeignInvolvement(e.target.checked)}/> {t("foreignInv")}</label>
                  {foreignInvolvement&&<Field label={t("micPermit")} value={micPermitNumber} onChange={setMicPermitNumber}/>}
                </div>
              </div>
              <div className="mt-7 flex justify-between border-t pt-5"><button type="button" onClick={()=>setStep(1)} className="rounded-xl border px-6 py-3 text-sm font-semibold">{tc("back")}</button><button type="button" onClick={()=>setStep(3)} className="rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white">{tc("next")}</button></div>
            </>}

            {step===3 && <>
              <h1 className="font-heading text-[22px] font-extrabold text-[#02275A]">{t("reviewTitle")}</h1><p className="mt-1 text-sm text-[#44474e]">{institutionType==="public"?t("reviewSub"):t("reviewSubPrivate")}</p>
              <div className="mt-6 space-y-4">
                {institutionType==="public" ? (
                  <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed bg-[#f7f9fb] p-8 text-center" style={{borderColor:touched&&!establishmentDocFile?"#C0392B":"#c5c6cf"}}><span className="material-symbols-outlined text-[#0462BA]">upload_file</span><span className="mt-2 text-sm font-bold text-[#02275A]">{establishmentDocFile?establishmentDocFile.name:t("uploadDoc")}</span><span className="text-xs text-[#75777f]">{t("pdfOnly")}</span><input type="file" accept=".pdf" className="hidden" onChange={e=>setEstablishmentDocFile(e.target.files?.[0]||null)}/></label>
                ) : (
                  <>
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-3" style={{borderColor:touched&&!dicaCertificate?"#C0392B":"#e6e8ec"}}><span className="text-sm font-semibold">{t("uploadDica")} <span className="text-[#C0392B]">*</span> — {dicaCertificate?.name||"PDF"}</span><input type="file" accept=".pdf" className="hidden" onChange={e=>setDicaCertificate(e.target.files?.[0]||null)}/><span className="rounded-lg bg-[#0462BA] px-3 py-1.5 text-xs font-bold text-white">{t("uploadBtn")}</span></label>
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-3" style={{borderColor:touched&&!taxClearance?"#C0392B":"#e6e8ec"}}><span className="text-sm font-semibold">{t("uploadTax")} <span className="text-[#C0392B]">*</span> — {taxClearance?.name||"PDF"}</span><input type="file" accept=".pdf" className="hidden" onChange={e=>setTaxClearance(e.target.files?.[0]||null)}/><span className="rounded-lg bg-[#0462BA] px-3 py-1.5 text-xs font-bold text-white">{t("uploadBtn")}</span></label>
                    {foreignInvolvement&&<label className="flex cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-3"><span className="text-sm font-semibold">{t("uploadMic")} — {micPermit?.name||"PDF"}</span><input type="file" accept=".pdf" className="hidden" onChange={e=>setMicPermit(e.target.files?.[0]||null)}/><span className="rounded-lg bg-white border px-3 py-1.5 text-xs font-bold">{t("uploadBtn")}</span></label>}
                  </>
                )}
                <div className="overflow-hidden rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] text-sm">{([[tc("type"),institutionType],[t("institutionName"),name],[tc("email"),email],[tc("phone"),phone?`${phoneCountry} ${phone}`:"—"],[t("category"),institutionCategory||"—"],...(institutionType==="public"? ([[tc("ministry"),governingMinistry],[t("docTitle"),establishmentDocTitle||"—"]] as [string,string][]) : []),[t("stepDocuments"),institutionType==="public"? (establishmentDocFile? "1 file":"—") : [dicaCertificate,taxClearance,micPermit].filter(Boolean).length+" file(s)"]] as [string,string][]).map(([k,v],i,arr)=><div key={k} className={`flex justify-between px-5 py-3 ${i!==arr.length-1?"border-b border-[#e6e8ec]":""}`}><span className="text-[#75777f]">{k}</span><span className="font-semibold truncate max-w-[60%]">{v}</span></div>)}</div>
                <label className="flex gap-3 rounded-xl border bg-white p-4"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5 size-4 accent-[#0462BA]"/><span className="text-xs leading-relaxed text-[#44474e]">{t("certify")}</span></label>
                {apply.isError&&<p className="rounded-xl bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#C0392B] ring-1 ring-[#fecaca]">{(apply.error as Error)?.message||t("submitFailed")}</p>}
              </div>
              <div className="mt-7 flex justify-between border-t pt-5"><button type="button" onClick={()=>setStep(2)} className="rounded-xl border px-6 py-3 text-sm font-semibold">{tc("back")}</button><button type="button" onClick={submit} disabled={!consent||apply.isPending} className="rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white disabled:opacity-50">{apply.isPending?t("submitting"):t("submitReview")}</button></div>
            </>}
          </div>
        </div>
      </main>
    </div>
  )
}
