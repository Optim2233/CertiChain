"use client"
import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Field, FieldShell, SelectField } from "./Field"
import { NRC_REGIONS, NRC_TOWNSHIP_CODES, NRC_TYPES, PASSPORT_RE, buildNrc, parseNrc } from "../utils/myanmar"

/**
 * Composes the four official NRC parts into the single `nrcOrPassport` string the
 * backend already stores, or falls back to a plain passport input for foreigners.
 */
export function NrcField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const t = useTranslations("auth")
  const parsed = parseNrc(value)
  const [passportMode, setPassportMode] = useState(() => !!value && !parsed)
  const [parts, setParts] = useState(() => parsed ?? { region: "", township: "", type: "", serial: "" })

  const codes = useMemo(
    () => NRC_TOWNSHIP_CODES.filter(c => String(c.region) === parts.region).map(c => ({ value: c.code, label: `${c.code} (${c.label})` })),
    [parts.region],
  )

  function set(k: keyof typeof parts, v: string) {
    // Changing the region invalidates the township code issued under the old one.
    const next = k === "region" ? { ...parts, region: v, township: "" } : { ...parts, [k]: v }
    setParts(next)
    onChange(buildNrc(next))
  }

  const toggle = () => { setPassportMode(m => !m); onChange("") }

  return <div>
    <div className="mb-1.5 flex items-center justify-between">
      <label className="block text-sm font-semibold text-[#191c1e]">{label}</label>
      <button type="button" onClick={toggle} className="text-xs font-semibold text-[#0462BA]">{passportMode ? t("useNrc") : t("usePassport")}</button>
    </div>
    {passportMode ? (
      <Field value={value} onChange={onChange} placeholder="MA123456" error={value && !PASSPORT_RE.test(value.trim()) ? t("invalidPassport") : error} />
    ) : (
      <FieldShell error={error}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SelectField value={parts.region} onChange={v => set("region", v)} options={NRC_REGIONS} placeholder={t("nrcRegion")} />
          <SelectField value={parts.township} onChange={v => set("township", v)} options={codes} placeholder={t("nrcTownship")} disabled={!parts.region} />
          <SelectField value={parts.type} onChange={v => set("type", v)} options={NRC_TYPES} placeholder={t("nrcType")} />
          <Field value={parts.serial} onChange={v => set("serial", v.replace(/\D/g, "").slice(0, 6))} placeholder={t("nrcSerial")} inputMode="numeric" />
        </div>
      </FieldShell>
    )}
  </div>
}
