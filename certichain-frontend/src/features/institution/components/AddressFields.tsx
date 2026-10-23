"use client"
import { useTranslations } from "next-intl"
import { Field, SelectField } from "./Field"
import { DISTRICTS, POSTAL_RE, STATE_REGIONS, TOWNSHIPS } from "../utils/myanmar"

export type Address = { stateRegion: string; district: string; township: string; ward: string; street: string; postalCode: string }
export const emptyAddress = (): Address => ({ stateRegion: "", district: "", township: "", ward: "", street: "", postalCode: "" })

/** State/Region -> District -> Township cascade; ward/street stay free text. */
export function AddressFields({ value, onChange }: { value: Address; onChange: (v: Address) => void }) {
  const t = useTranslations("auth")
  const districts = DISTRICTS[value.stateRegion] ?? []
  const townships = TOWNSHIPS[value.district] ?? []
  // Changing a parent invalidates its children.
  const set = (patch: Partial<Address>) => onChange({ ...value, ...patch })
  const badPostal = value.postalCode.trim().length > 0 && !POSTAL_RE.test(value.postalCode.trim())

  return <div className="rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] p-4 space-y-3">
    <p className="text-sm font-bold text-[#02275A]">{t("address")}</p>
    <div className="grid gap-3 sm:grid-cols-3">
      <SelectField label={t("stateRegion")} value={value.stateRegion} onChange={v => set({ stateRegion: v, district: "", township: "" })} options={STATE_REGIONS} placeholder={t("selectStateRegion")} />
      <SelectField label={t("district")} value={value.district} onChange={v => set({ district: v, township: "" })} options={districts} placeholder={t("selectDistrict")} disabled={!value.stateRegion} />
      <SelectField label={t("township")} value={value.township} onChange={v => set({ township: v })} options={townships} placeholder={t("selectTownship")} disabled={!value.district} />
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label={t("ward")} value={value.ward} onChange={v => set({ ward: v })} />
      <Field label={t("street")} value={value.street} onChange={v => set({ street: v })} />
      <Field label={t("postalCode")} value={value.postalCode} onChange={v => set({ postalCode: v.replace(/\D/g, "").slice(0, 5) })} placeholder="11181" inputMode="numeric" maxLength={5} error={badPostal ? t("invalidPostal") : undefined} />
    </div>
  </div>
}
