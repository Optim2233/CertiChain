"use client"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useInstitutionMe, useResubmitInstitution } from "@/features/institution"

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <div><label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">{label}</label><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-[#c5c6cf] bg-[#fcfdff] px-3.5 py-3 text-sm outline-none focus:border-[#0462BA]" /></div>
}

export default function InstitutionResubmitPage() {
  const t = useTranslations("institution")
  const { data: me } = useInstitutionMe()
  const inst: any = me
  const resubmit = useResubmitInstitution()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [governingMinistry, setGoverningMinistry] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [dicaNo, setDicaNo] = useState("")
  const [tinNo, setTinNo] = useState("")
  const [estTitle, setEstTitle] = useState("")
  const [estRef, setEstRef] = useState("")
  const [estFile, setEstFile] = useState<File | null>(null)
  const [dicaFile, setDicaFile] = useState<File | null>(null)
  const [taxFile, setTaxFile] = useState<File | null>(null)

  useEffect(() => {
    if (inst) { setName(inst.name ?? ""); setPhone(inst.phone ?? ""); setWebsite(inst.website ?? "") }
  }, [me])

  if (inst && inst.status !== "REJECTED") {
    return <div className="mx-auto max-w-[720px] px-6 py-10"><p className="rounded-xl bg-[#e8f5e9] px-4 py-3 text-sm font-semibold text-[#0d5c2e]">{t("allClear")}: {inst.status}</p></div>
  }

  function submit() {
    resubmit.mutate({
      fields: {
        name: name.trim() || undefined, phone: phone.trim() || undefined, website: website.trim() || undefined,
        governingMinistry: governingMinistry.trim() || undefined,
        companyName: companyName.trim() || undefined, dicaCertificateNumber: dicaNo.trim() || undefined,
        tinNumber: tinNo.trim() || undefined, establishmentDocTitle: estTitle.trim() || undefined,
        establishmentDocRef: estRef.trim() || undefined,
      },
      files: { establishmentDocFile: estFile, dicaCertificate: dicaFile, taxClearance: taxFile },
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
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" value={phone} onChange={setPhone} /><Field label="Website" value={website} onChange={setWebsite} /></div>
        <Field label="Governing ministry (public)" value={governingMinistry} onChange={setGoverningMinistry} />
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Company name (private)" value={companyName} onChange={setCompanyName} /><Field label="DICA no. (private)" value={dicaNo} onChange={setDicaNo} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="TIN no. (private)" value={tinNo} onChange={setTinNo} /><Field label="Est. doc title (public)" value={estTitle} onChange={setEstTitle} /></div>
        <Field label="Est. doc ref (public)" value={estRef} onChange={setEstRef} />
        {(["establishment", "dica", "tax"] as const).map(k => (
          <label key={k} className="flex cursor-pointer items-center justify-between rounded-xl border border-[#e6e8ec] bg-white px-4 py-3">
            <span className="text-sm font-semibold">{k === "establishment" ? "Establishment doc (PDF)" : k === "dica" ? "DICA certificate (PDF)" : "Tax clearance (PDF)"} — {(k === "establishment" ? estFile : k === "dica" ? dicaFile : taxFile)?.name || "replace (optional)"}</span>
            <input type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0] || null; if (k === "establishment") setEstFile(f); else if (k === "dica") setDicaFile(f); else setTaxFile(f) }} />
            <span className="rounded-lg bg-[#0462BA] px-3 py-1.5 text-xs font-bold text-white">Upload</span>
          </label>
        ))}
        {resubmit.isError && <p className="rounded-xl bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#C0392B] ring-1 ring-[#fecaca]">{(resubmit.error as Error)?.message}</p>}
        <button type="button" onClick={submit} disabled={resubmit.isPending} className="rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white disabled:opacity-50">{resubmit.isPending ? "..." : t("editResubmit")}</button>
      </div>
    </div>
  )
}
