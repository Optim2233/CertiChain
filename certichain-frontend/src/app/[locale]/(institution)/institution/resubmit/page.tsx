"use client"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useInstitutionMe, useResubmitInstitution, CATEGORIES, DOC_TYPES, MINISTRIES,
  Field, SelectField, AddressFields, PersonForm, emptyAddress, emptyPerson, normalizeMmPhone,
  type Address, type Person } from "@/features/institution"
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
  const [address, setAddress] = useState<Address>(emptyAddress())
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
    setAddress({
      stateRegion: inst.stateRegion ?? "", district: inst.district ?? "", township: inst.township ?? "",
      ward: inst.ward ?? "", street: inst.street ?? "", postalCode: inst.postalCode ?? "",
    })
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
    return <div className="mx-auto max-w-[720px] px-6 py-10"><p className="rounded-xl bg-[#e8f5e9] px-4 py-3 text-sm font-semibold text-[#0d5c2e]">{t("allClear")}</p></div>
  }

  function submit() {
    const fields: Record<string, unknown> = {
      name: name.trim() || undefined, institutionNameMm: institutionNameMm.trim() || undefined,
      institutionCategory: institutionCategory || undefined,
      phone: (normalizeMmPhone(phone) ?? phone.trim()) || undefined, website: website.trim() || undefined,
      ...Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v.trim() || undefined])),
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
          <SelectField label="Category" value={institutionCategory} onChange={setInstitutionCategory} options={CATEGORIES} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" value={phone} onChange={setPhone} /><Field label="Website" value={website} onChange={setWebsite} /></div>

        <AddressFields value={address} onChange={setAddress} />

        {institutionType === "public" && <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3">
          <p className="text-sm font-bold text-[#02275A]">Public institution details</p>
          <SelectField label="Governing ministry" value={governingMinistry} onChange={setGoverningMinistry} options={MINISTRIES} />
          <Field label="Year established" value={yearEstablished} onChange={setYearEstablished} type="number" />
          <SelectField label="Establishment doc type" value={establishmentDocType} onChange={setEstablishmentDocType} options={DOC_TYPES} />
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

        {resubmit.isError && <p className="rounded-xl bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#C0392B] ring-1 ring-[#fecaca]">{t("toastFailed")}</p>}
        <button type="button" onClick={submit} disabled={resubmit.isPending} className="rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white disabled:opacity-50">{resubmit.isPending ? "..." : t("editResubmit")}</button>
      </div>
    </div>
  )
}
