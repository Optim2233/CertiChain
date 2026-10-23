"use client"
import { useTranslations } from "next-intl"
import { COUNTRY_CODES } from "@/features/auth/utils/countryCodes"
import { FieldShell } from "./Field"
import { normalizeMmPhone } from "../utils/myanmar"

/**
 * Country code + number. For +95 the number is canonicalized to +959XXXXXXX on
 * blur, so what reaches the backend is comparable across applications.
 */
export function PhoneField({ label, req, country, onCountryChange, value, onChange, error }: { label: string; req?: boolean; country: string; onCountryChange: (v: string) => void; value: string; onChange: (v: string) => void; error?: string }) {
  const t = useTranslations("auth")
  const invalid = country === "+95" && value.trim().length > 0 && normalizeMmPhone(value) === null
  const blur = () => { if (country === "+95") { const n = normalizeMmPhone(value); if (n) onChange(n.slice(3)) } }

  return <FieldShell label={label} req={req} error={error ?? (invalid ? t("invalidPhoneMm") : undefined)}>
    <div className="flex gap-2">
      <select value={country} onChange={e => onCountryChange(e.target.value)} className="w-[110px] rounded-xl border border-[#c5c6cf] bg-white px-2 py-3 text-sm">
        {COUNTRY_CODES.map(cc => <option key={cc.code} value={cc.code}>{cc.label}</option>)}
      </select>
      <input type="tel" value={value} onChange={e => onChange(e.target.value)} onBlur={blur} placeholder="9123456789" className="flex-1 rounded-xl border bg-[#fcfdff] px-3.5 py-3 text-sm outline-none focus:border-[#0462BA]" style={{ borderColor: error || invalid ? "#C0392B" : "#c5c6cf" }} />
    </div>
  </FieldShell>
}
