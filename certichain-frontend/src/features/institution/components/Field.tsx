// Shared form primitives for the institution application forms.
// Extracted verbatim from register/page.tsx, which duplicated them with resubmit/page.tsx.
import type { Lookup } from "../utils/lookups"

const INPUT = "w-full rounded-xl border bg-[#fcfdff] px-3.5 py-3 text-sm outline-none placeholder:text-[#9aa0a6] focus:border-[#0462BA] focus:ring-4 focus:ring-[#d5e3ff]"

export function FieldShell({ label, req, error, children }: { label?: string; req?: boolean; error?: string; children: React.ReactNode }) {
  return <div>
    {label && <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">{label} {req && <span className="text-[#C0392B]">*</span>}</label>}
    {children}
    {error && <p className="mt-1 text-xs font-medium text-[#C0392B]">{error}</p>}
  </div>
}

export function Field({ label, req, value, onChange, onBlur, placeholder, type = "text", error, inputMode, maxLength }: { label?: string; req?: boolean; value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; type?: string; error?: string; inputMode?: "text" | "numeric" | "tel"; maxLength?: number }) {
  return <FieldShell label={label} req={req} error={error}>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength} className={INPUT} style={{ borderColor: error ? "#C0392B" : "#c5c6cf" }} />
  </FieldShell>
}

export function SelectField({ label, req, value, onChange, options, placeholder, error, disabled }: { label?: string; req?: boolean; value: string; onChange: (v: string) => void; options: Lookup[]; placeholder?: string; error?: string; disabled?: boolean }) {
  // A stored value outside the dataset (legacy free-text rows) stays selectable
  // instead of being silently blanked by the browser.
  const unlisted = value && !options.some(o => o.value === value)
  return <FieldShell label={label} req={req} error={error}>
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none focus:border-[#0462BA] disabled:bg-[#f1f2f4] disabled:text-[#9aa0a6]" style={{ borderColor: error ? "#C0392B" : "#c5c6cf" }}>
      <option value="">{placeholder ?? "Select"}</option>
      {unlisted && <option value={value}>{value}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </FieldShell>
}
