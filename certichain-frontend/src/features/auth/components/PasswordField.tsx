"use client"

import { useState } from "react"

function strength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  score = Math.min(score, 4)
  const labels = ["Weak", "Weak", "Fair", "Good", "Strong"]
  const colors = ["#C0392B", "#C0392B", "#e2a03f", "#0462BA", "#0d9668"]
  return { pct: (score / 4) * 100, label: labels[score], color: colors[score] }
}

export function PasswordField({
  value,
  onChange,
  placeholder,
  onEnter,
  showStrength = false,
  autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onEnter?: () => void
  showStrength?: boolean
  autoComplete?: "current-password" | "new-password"
}) {
  // showStrength is true on every signup/new-password field except "confirm"
  // fields, which pass autoComplete explicitly instead.
  const resolvedAutoComplete = autoComplete ?? (showStrength ? "new-password" : "current-password")
  const [show, setShow] = useState(false)
  const s = strength(value)

  return (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={placeholder}
          autoComplete={resolvedAutoComplete}
          className="w-full rounded-md border border-[#c5c6cf] px-3.5 py-2.5 pr-10 text-sm"
        />
        <span
          className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[18px] text-[#75777f]"
          onClick={() => setShow((v) => !v)}
        >
          {show ? "visibility_off" : "visibility"}
        </span>
      </div>
      {showStrength && value.length > 0 && (
        <div className="mt-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-[#eef0f3]">
            <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: s.color }} />
          </div>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: s.color }}>{s.label} password</p>
        </div>
      )}
    </div>
  )
}
