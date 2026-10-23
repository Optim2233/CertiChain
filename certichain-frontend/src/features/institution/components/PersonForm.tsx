"use client"
import { useTranslations } from "next-intl"
import { Field } from "./Field"
import { NrcField } from "./NrcField"
import { PhoneField } from "./PhoneField"
import { normalizeMmPhone } from "../utils/myanmar"

export type Person = { fullName: string; fullNameMyanmar: string; nationality: string; race: string; religion: string; nrcOrPassport: string; dateOfBirth: string; educationalQualification: string; currentAddress: string; permanentAddress: string; phone: string; email: string }
export const emptyPerson = (): Person => ({ fullName: "", fullNameMyanmar: "", nationality: "", race: "", religion: "", nrcOrPassport: "", dateOfBirth: "", educationalQualification: "", currentAddress: "", permanentAddress: "", phone: "", email: "" })

// Founder/administrator block. The phone is stored already-normalized (+959…) so
// the person's number matches the institution contact format.
export function PersonForm({ title, p, setP }: { title: string; p: Person; setP: (v: Person) => void }) {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const upd = (k: keyof Person, v: string) => setP({ ...p, [k]: v })
  const local = p.phone.startsWith("+95") ? p.phone.slice(3) : p.phone

  return <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3"><p className="text-sm font-bold text-[#02275A]">{title}</p>
    <div className="grid gap-3 sm:grid-cols-2"><Field label={t("fullName")} req value={p.fullName} onChange={v => upd("fullName", v)} placeholder="Aung Ko" /><Field label={t("myanmarName")} value={p.fullNameMyanmar} onChange={v => upd("fullNameMyanmar", v)} /></div>
    <div className="grid gap-3 sm:grid-cols-3"><Field label={t("nationality")} value={p.nationality} onChange={v => upd("nationality", v)} /><Field label={t("race")} value={p.race} onChange={v => upd("race", v)} /><Field label={t("religion")} value={p.religion} onChange={v => upd("religion", v)} /></div>
    <NrcField label={t("nrcPassport")} value={p.nrcOrPassport} onChange={v => upd("nrcOrPassport", v)} />
    <Field label={t("dob")} value={p.dateOfBirth} onChange={v => upd("dateOfBirth", v)} type="date" />
    <Field label={t("eduQual")} value={p.educationalQualification} onChange={v => upd("educationalQualification", v)} placeholder="Ph.D." />
    <Field label={t("currentAddr")} value={p.currentAddress} onChange={v => upd("currentAddress", v)} />
    <Field label={t("permanentAddr")} value={p.permanentAddress} onChange={v => upd("permanentAddress", v)} />
    <div className="grid gap-3 sm:grid-cols-2">
      <PhoneField label={tc("phone")} country="+95" onCountryChange={() => {}} value={local} onChange={v => upd("phone", normalizeMmPhone(v) ?? v)} />
      <Field label={tc("email")} value={p.email} onChange={v => upd("email", v)} placeholder="a@example.com" />
    </div>
  </div>
}
