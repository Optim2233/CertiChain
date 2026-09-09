"use client"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useInstitutionMe, useResubmitInstitution } from "@/features/institution"

const CATEGORIES = ["university", "college", "degreeCollege", "institute", "center"] as const
const MINISTRIES = ["Ministry of Education","Ministry of Science and Technology","Ministry of Health","Ministry of Defence","Ministry of Religious Affairs"] as const
const DOC_TYPES = ["establishmentLaw","establishmentAct","governmentOrder","governmentDecree","subDecree"] as const
type Person = { fullName:string; fullNameMyanmar:string; nationality:string; race:string; religion:string; nrcOrPassport:string; dateOfBirth:string; educationalQualification:string; currentAddress:string; permanentAddress:string; phone:string; email:string }
const emptyPerson = ():Person => ({ fullName:"",fullNameMyanmar:"",nationality:"",race:"",religion:"",nrcOrPassport:"",dateOfBirth:"",educationalQualification:"",currentAddress:"",permanentAddress:"",phone:"",email:""})

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <div><label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">{label}</label><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-[#c5c6cf] bg-[#fcfdff] px-3.5 py-3 text-sm outline-none focus:border-[#0462BA]" /></div>
}
function PersonForm({ title, p, setP }: { title:string; p:Person; setP:(v:Person)=>void }) {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const upd = (k:keyof Person, v:string)=> setP({ ...p, [k]: v })
  return <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3"><p className="text-sm font-bold text-[#02275A]">{title}</p>
    <div className="grid gap-3 sm:grid-cols-2"><Field label={t("fullName")} value={p.fullName} onChange={v=>upd("fullName",v)} placeholder="Aung Ko"/><Field label={t("myanmarName")} value={p.fullNameMyanmar} onChange={v=>upd("fullNameMyanmar",v)}/></div>
    <div className="grid gap-3 sm:grid-cols-3"><Field label={t("nationality")} value={p.nationality} onChange={v=>upd("nationality",v)}/><Field label={t("race")} value={p.race} onChange={v=>upd("race",v)}/><Field label={t("religion")} value={p.religion} onChange={v=>upd("religion",v)}/></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label={t("nrcPassport")} value={p.nrcOrPassport} onChange={v=>upd("nrcOrPassport",v)} placeholder="12/NAMA(N)123456"/><Field label={t("dob")} value={p.dateOfBirth} onChange={v=>upd("dateOfBirth",v)} type="date"/></div>
    <Field label={t("eduQual")} value={p.educationalQualification} onChange={v=>upd("educationalQualification",v)} placeholder="Ph.D."/>
    <Field label={t("currentAddr")} value={p.currentAddress} onChange={v=>upd("currentAddress",v)}/><Field label={t("permanentAddr")} value={p.permanentAddress} onChange={v=>upd("permanentAddress",v)}/>
    <div className="grid gap-3 sm:grid-cols-2"><Field label={tc("phone")} value={p.phone} onChange={v=>upd("phone",v)}/><Field label={tc("email")} value={p.email} onChange={v=>upd("email",v)} placeholder="a@example.com"/></div>
  </div>
}

export default function InstitutionResubmitPage() {
  const t = useTranslations("institution")
  const { data: me } = useInstitutionMe()
  const inst: any = me
  const resubmit = useResubmitInstitution()

  const [institutionType, setInstitutionType] = useState<""|"public"|"private">("")
  const [name, setName] = useState("")
  const [institutionNameMm, setInstitutionNameMm] = useState("")
  const [institutionCategory, setInstitutionCategory] = useState("")
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
  const [establishmentDocFile, setEstablishmentDocFile] = useState<File | null>(null)
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
  const [dicaCertificate, setDicaCertificate] = useState<File | null>(null)
  const [taxClearance, setTaxClearance] = useState<File | null>(null)
  const [micPermit, setMicPermit] = useState<File | null>(null)

  useEffect(() => {
    if (!inst) return
    setInstitutionType(inst.institutionType ?? "")
    setName(inst.name ?? "")
    setInstitutionNameMm(inst.institutionNameMm ?? "")
    setInstitutionCategory(inst.institutionCategory ?? "")
    setPhone(inst.phone ?? "")
    setWebsite(inst.website ?? "")
    setStateRegion(inst.stateRegion ?? ""); setDistrict(inst.district ?? ""); setTownship(inst.township ?? "")
    setWard(inst.ward ?? ""); setStreet(inst.street ?? ""); setPostalCode(inst.postalCode ?? "")
    setGoverningMinistry(inst.governingMinistry ?? "")
    setYearEstablished(inst.yearEstablished ? String(inst.yearEstablished) : "")
    setEstablishmentDocType(inst.establishmentDocType ?? "")
    setEstablishmentDocTitle(inst.establishmentDocTitle ?? "")
    setEstablishmentDocRef(inst.establishmentDocRef ?? "")
    setEstablishmentDocIssueDate(inst.establishmentDocIssueDate ?? "")
    setCompanyName(inst.companyName ?? "")
    setDicaCertificateNumber(inst.dicaCertificateNumber ?? "")
    setMycoRegistrationNumber(inst.mycoRegistrationNumber ?? "")
    setTinNumber(inst.tinNumber ?? "")
    setIncorporationDate(inst.incorporationDate ?? "")
    setOwnershipStructure(inst.ownershipStructure ?? "")
    setInvestmentAmount(inst.investmentAmount != null ? String(inst.investmentAmount) : "")
    setForeignInvolvement(!!inst.foreignInvolvement)
    setMicPermitNumber(inst.micPermitNumber ?? "")
    if (inst.founders) { try { const f = JSON.parse(inst.founders); if (Array.isArray(f) && f.length) setFounders(f) } catch {} }
    if (inst.administrator) { try { setAdministrator(JSON.parse(inst.administrator)) } catch {} }
  }, [me])

  if (inst && inst.status !== "REJECTED") {
    return <div className="mx-auto max-w-[720px] px-6 py-10"><p className="rounded-xl bg-[#e8f5e9] px-4 py-3 text-sm font-semibold text-[#0d5c2e]">{t("allClear")}: {inst.status}</p></div>
  }

  function submit() {
    const fields: Record<string, unknown> = {
      name: name.trim() || undefined, institutionNameMm: institutionNameMm.trim() || undefined,
      institutionCategory: institutionCategory || undefined,
      phone: phone.trim() || undefined, website: website.trim() || undefined,
      stateRegion: stateRegion.trim() || undefined, district: district.trim() || undefined, township: township.trim() || undefined,
      ward: ward.trim() || undefined, street: street.trim() || undefined, postalCode: postalCode.trim() || undefined,
      governingMinistry: governingMinistry || undefined, yearEstablished: yearEstablished ? Number(yearEstablished) : undefined,
      establishmentDocType: establishmentDocType || undefined, establishmentDocTitle: establishmentDocTitle.trim() || undefined,
      establishmentDocRef: establishmentDocRef.trim() || undefined, establishmentDocIssueDate: establishmentDocIssueDate || undefined,
      companyName: companyName.trim() || undefined, dicaCertificateNumber: dicaCertificateNumber.trim() || undefined,
      mycoRegistrationNumber: mycoRegistrationNumber.trim() || undefined, tinNumber: tinNumber.trim() || undefined,
      incorporationDate: incorporationDate || undefined, ownershipStructure: ownershipStructure.trim() || undefined,
      investmentAmount: investmentAmount ? Number(investmentAmount) : undefined,
      foreignInvolvement, micPermitNumber: micPermitNumber.trim() || undefined,
      foundersJson: institutionType === "private" ? JSON.stringify(founders.filter(f => f.fullName.trim())) : undefined,
      administratorJson: institutionType === "private" && administrator.fullName.trim() ? JSON.stringify(administrator) : undefined,
    }
    resubmit.mutate({
      fields,
      files: { establishmentDocFile, dicaCertificate, taxClearance, micPermit },
    })
  }

  if (resubmit.isSuccess) {
    return <div className="mx-auto max-w-[560px] px-6 py-12 text-center"><span className="material-symbols-outlined text-[40px] text-[#0d9668]">check_circle</span><h1 className="mt-3 text-xl font-extrabold text-[#02275A]">{t("pendingBanner")}</h1></div>
  }

  return (
    <div className="mx-auto max-w-[720px] px-6 py-8">
      <h1 className="text-[22px] font-extrabold text-[#02275A]">{t("editResubmit")}</h1>
      {inst?.statusReason && <p className="mt-3 rounded-xl bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#C0392B] ring-1 ring-[#fecaca]">{inst.statusReason}</p>}
      <p className="mt-2 text-sm text-[#44474e]">Only changed fields are updated. Re-upload a document only to replace it.</p>
      <div className="mt-6 space-y-4">
        <Field label="Institution name" value={name} onChange={setName} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Myanmar name" value={institutionNameMm} onChange={setInstitutionNameMm} />
          <div><label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">Category</label><select value={institutionCategory} onChange={e => setInstitutionCategory(e.target.value)} className="w-full rounded-xl border border-[#c5c6cf] bg-white px-3.5 py-3 text-sm"><option value="">Select</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" value={phone} onChange={setPhone} /><Field label="Website" value={website} onChange={setWebsite} /></div>

        <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3"><p className="text-sm font-bold text-[#02275A]">Address</p>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="State/Region" value={stateRegion} onChange={setStateRegion} /><Field label="District" value={district} onChange={setDistrict} /><Field label="Township" value={township} onChange={setTownship} /></div>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="Ward" value={ward} onChange={setWard} /><Field label="Street" value={street} onChange={setStreet} /><Field label="Postal code" value={postalCode} onChange={setPostalCode} /></div>
        </div>

        {institutionType === "public" && <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3">
          <p className="text-sm font-bold text-[#02275A]">Public institution details</p>
          <div><label className="mb-1.5 block text-sm font-semibold">Governing ministry</label><select value={governingMinistry} onChange={e => setGoverningMinistry(e.target.value)} className="w-full rounded-xl border border-[#c5c6cf] bg-white px-3.5 py-3 text-sm"><option value="">Select</option>{MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <Field label="Year established" value={yearEstablished} onChange={setYearEstablished} type="number" />
          <div><label className="mb-1.5 block text-sm font-semibold">Establishment doc type</label><select value={establishmentDocType} onChange={e => setEstablishmentDocType(e.target.value)} className="w-full rounded-xl border border-[#c5c6cf] bg-white px-3.5 py-3 text-sm"><option value="">Select</option>{DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
          <Field label="Est. doc title" value={establishmentDocTitle} onChange={setEstablishmentDocTitle} />
          <Field label="Est. doc ref" value={establishmentDocRef} onChange={setEstablishmentDocRef} />
          <Field label="Est. doc issue date" value={establishmentDocIssueDate} onChange={setEstablishmentDocIssueDate} type="date" />
        </div>}

        {institutionType === "private" && <>
          <div className="space-y-3">{founders.map((f, i) => <div key={i} className="relative"><PersonForm title={`Founder ${i + 1}`} p={f} setP={v => setFounders(founders.map((x, idx) => idx === i ? v : x))} />{founders.length > 1 && <button type="button" onClick={() => setFounders(founders.filter((_, idx) => idx !== i))} className="mt-2 text-xs font-semibold text-[#C0392B]">Remove</button>}</div>)}<button type="button" onClick={() => setFounders([...founders, emptyPerson()])} className="rounded-xl border border-dashed px-4 py-2 text-sm font-semibold">Add founder</button></div>
          <PersonForm title="Administrator" p={administrator} setP={setAdministrator} />
          <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3"><p className="text-sm font-bold text-[#02275A]">Business registration</p>
            <Field label="Company name" value={companyName} onChange={setCompanyName} />
            <div className="grid gap-3 sm:grid-cols-2"><Field label="DICA no." value={dicaCertificateNumber} onChange={setDicaCertificateNumber} /><Field label="MYCO no." value={mycoRegistrationNumber} onChange={setMycoRegistrationNumber} /></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="TIN no." value={tinNumber} onChange={setTinNumber} /><Field label="Incorporation date" value={incorporationDate} onChange={setIncorporationDate} type="date" /></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Ownership structure" value={ownershipStructure} onChange={setOwnershipStructure} /><Field label="Investment amount" value={investmentAmount} onChange={setInvestmentAmount} type="number" /></div>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={foreignInvolvement} onChange={e => setForeignInvolvement(e.target.checked)} /> Foreign involvement</label>
            {foreignInvolvement && <Field label="MIC permit no." value={micPermitNumber} onChange={setMicPermitNumber} />}
          </div>
        </>}

        <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3">
          <p className="text-sm font-bold text-[#02275A]">Documents</p>
          {(institutionType === "public"
            ? [["establishment", "Establishment doc (PDF)", establishmentDocFile, setEstablishmentDocFile]]
            : [["dica", "DICA certificate (PDF)", dicaCertificate, setDicaCertificate], ["tax", "Tax clearance (PDF)", taxClearance, setTaxClearance], ["mic", "MIC permit (PDF)", micPermit, setMicPermit]]
          ).map(([k, label, file, setFile]: any) => (
            <label key={k} className="flex cursor-pointer items-center justify-between rounded-xl border border-[#e6e8ec] bg-white px-4 py-3">
              <span className="text-sm font-semibold">{label} — {file?.name || "replace (optional)"}</span>
              <input type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              <span className="rounded-lg bg-[#0462BA] px-3 py-1.5 text-xs font-bold text-white">Upload</span>
            </label>
          ))}
        </div>

        {resubmit.isError && <p className="rounded-xl bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#C0392B] ring-1 ring-[#fecaca]">{(resubmit.error as Error)?.message}</p>}
        <button type="button" onClick={submit} disabled={resubmit.isPending} className="rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white disabled:opacity-50">{resubmit.isPending ? "..." : t("editResubmit")}</button>
      </div>
    </div>
  )
}
