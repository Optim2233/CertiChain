"use client"

import { useState } from "react"
import Link from "next/link"
import { useApplyInstitution } from "@/features/institution"
import { AuthBrandPanel } from "@/features/auth/components/AuthBrandPanel"
import { PasswordField } from "@/features/auth/components/PasswordField"
import { COUNTRY_CODES } from "@/features/auth/utils/countryCodes"

const STEPS = ["Details", "Documents", "Review"]

export default function InstitutionRegisterPage() {
  const apply = useApplyInstitution()
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [ministry, setMinistry] = useState("")
  const [website, setWebsite] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phoneCountry, setPhoneCountry] = useState("+95")
  const [phone, setPhone] = useState("")
  const [documents, setDocuments] = useState<File[]>([])
  const [consent, setConsent] = useState(false)
  const [touched, setTouched] = useState(false)

  const detailsValid =
    name.trim().length > 0 &&
    ministry.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 8 &&
    phone.trim().length >= 6
  const docsValid = documents.length > 0
  const canSubmit = detailsValid && docsValid && consent

  function submit() {
    setTouched(true)
    if (!canSubmit) return
    apply.mutate({ name, ministry, email, password, phone: `${phoneCountry} ${phone}`, website, documents })
  }

  if (apply.isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6" style={{ background: "#f7f9fb" }}>
        <div className="w-full max-w-[480px] rounded-lg border border-[#c5c6cf] bg-white p-10 text-center">
          <span className="material-symbols-outlined mb-4 inline-block text-5xl" style={{ color: "#0d9668" }}>check_circle</span>
          <h2 className="font-heading m-0 mb-3 text-2xl font-bold">Application Submitted</h2>
          <p className="m-0 mb-6 text-sm text-[#44474e]">
            The Accreditation Authority will review your documents and notify you by email once a decision is made.
          </p>
          <Link href="/login" className="inline-block rounded px-6 py-3 text-sm font-bold text-white" style={{ background: "#0462BA" }}>
            Back to Login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel
        icon="account_balance"
        heading="Join the global accreditation network."
        body="Issue tamper-proof, blockchain-verified credentials your graduates can share anywhere."
        footer="Cross-referenced with national ministry databases"
      >
        <div className="mt-7 flex flex-col gap-3.5">
          {STEPS.map((label, i) => {
            const active = i === step
            const done = i < step
            return (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    background: done ? "#4ade80" : active ? "#fff" : "rgba(255,255,255,0.15)",
                    color: done || active ? "#02275A" : "#a8c8ff",
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  className="text-sm"
                  style={{ fontWeight: active ? 700 : 500, color: active || done ? "#fff" : "#a8c8ff" }}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </AuthBrandPanel>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[1230px]">
          <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: "#0462BA" }}>
            Step {step + 1} of 3
          </p>

          {step === 0 && (
            <>
              <h1 className="font-heading m-0 mb-1.5 text-[26px] font-extrabold">Register Your Institution</h1>
              <p className="m-0 mb-7 text-sm text-[#44474e]">Provide your official institutional details.</p>

              <label className="mb-1.5 block text-sm font-semibold">
                Institution Name <span style={{ color: "#C0392B" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. University of Information Technology"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-[#75777f] px-4 py-2.5 text-sm"
                style={{ borderColor: touched && !name.trim() ? "#C0392B" : "#75777f" }}
              />
              {touched && !name.trim() && <p className="mt-1 text-xs text-[#C0392B]">Institution name is required.</p>}
              <div className="mb-[18px] mt-[18px] grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Ministry Reference Number <span style={{ color: "#C0392B" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Format: MN-YYYY-XXXX"
                    value={ministry}
                    onChange={(e) => setMinistry(e.target.value)}
                    className="w-full rounded-md border px-4 py-2.5 text-sm"
                    style={{ borderColor: touched && !ministry.trim() ? "#C0392B" : "#75777f" }}
                  />
                  {touched && !ministry.trim() && <p className="mt-1 text-xs text-[#C0392B]">Ministry reference number is required.</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Institution Website (Optional)</label>
                  <input
                    type="text"
                    placeholder="www.institution.edu"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full rounded-md border border-[#75777f] px-4 py-2.5 text-sm"
                  />
                </div>
              </div>
              <label className="mb-1.5 block text-sm font-semibold">
                Admin Email <span style={{ color: "#C0392B" }}>*</span>
              </label>
              <input
                type="email"
                placeholder="registrar@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border px-4 py-2.5 text-sm"
                style={{ borderColor: touched && !/\S+@\S+\.\S+/.test(email) ? "#C0392B" : "#75777f" }}
              />
              {touched && !/\S+@\S+\.\S+/.test(email) && <p className="mt-1 text-xs text-[#C0392B]">Enter a valid admin email address.</p>}
              <label className="mb-1.5 mt-[18px] block text-sm font-semibold">
                Contact Phone Number <span style={{ color: "#C0392B" }}>*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={phoneCountry}
                  onChange={(e) => setPhoneCountry(e.target.value)}
                  className="w-[100px] shrink-0 rounded-md border border-[#75777f] bg-white px-2 py-2.5 text-sm"
                >
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc.code} value={cc.code}>{cc.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="9123 456 789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 rounded-md border px-4 py-2.5 text-sm"
                  style={{ borderColor: touched && phone.trim().length < 6 ? "#C0392B" : "#75777f" }}
                />
              </div>
              {touched && phone.trim().length < 6 && <p className="mb-1 mt-1 text-xs text-[#C0392B]">Enter a valid phone number (at least 6 digits).</p>}
              <label className="mb-1.5 mt-[18px] block text-sm font-semibold">
                Account Password <span style={{ color: "#C0392B" }}>*</span>
              </label>
              <PasswordField value={password} onChange={setPassword} placeholder="At least 8 characters" showStrength />
              {touched && password.length < 8 && <p className="mb-4 mt-1 text-xs text-[#C0392B]">Password must be at least 8 characters.</p>}
              <div className="mt-6 flex items-center justify-between border-t border-[#eef0f3] pt-5">
                <Link href="/login" className="text-sm font-semibold text-[#44474e]">
                  Already accredited? <span style={{ color: "#005eb3" }}>Log in</span>
                </Link>
                <button
                  type="button"
                  onClick={() => { setTouched(true); if (detailsValid) { setStep(1); setTouched(false) } }}
                  className="flex items-center gap-2 rounded-md px-7 py-3 text-sm font-semibold text-white"
                  style={{ background: "#005eb3" }}
                >
                  Next
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="font-heading m-0 mb-1.5 text-[26px] font-extrabold">Accreditation Documents</h1>
              <p className="m-0 mb-7 text-sm text-[#44474e]">Upload your official accreditation and registration certificates as PDFs.</p>
              <label className="mb-5 flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-[#c5c6cf] bg-[#f7f9fb] p-10 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-full" style={{ background: "#e0e3e5" }}>
                  <span className="material-symbols-outlined text-2xl text-[#44474e]">upload_file</span>
                </div>
                <p className="m-0 text-sm font-semibold" style={{ color: "#005eb3" }}>Click to upload or drag and drop</p>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => setDocuments(Array.from(e.target.files ?? []))}
                />
              </label>
              {documents.length > 0 && (
                <ul className="mb-5 flex flex-col gap-1.5">
                  {documents.map((d, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#44474e]">
                      <span className="material-symbols-outlined text-base" style={{ color: "#0d9668" }}>description</span>
                      {d.name}
                    </li>
                  ))}
                </ul>
              )}
              {touched && !docsValid && <p className="mb-4 text-xs text-[#C0392B]">Upload at least one document.</p>}
              <div className="mt-6 flex justify-between border-t border-[#eef0f3] pt-5">
                <button type="button" onClick={() => { setStep(0); setTouched(false) }} className="rounded-md border border-[#c5c6cf] bg-white px-6 py-3 text-sm font-semibold text-[#44474e]">
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => { setTouched(true); if (docsValid) { setStep(2); setTouched(false) } }}
                  className="flex items-center gap-2 rounded-md px-7 py-3 text-sm font-semibold text-white"
                  style={{ background: "#005eb3" }}
                >
                  Next
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="font-heading m-0 mb-1.5 text-[26px] font-extrabold">Review &amp; Submit</h1>
              <p className="m-0 mb-6 text-sm text-[#44474e]">Confirm your details before sending them to the Accreditation Authority.</p>
              <div className="mb-5 flex flex-col gap-3 rounded-md border border-[#c5c6cf] bg-[#f7f9fb] p-5 text-sm">
                <div className="flex justify-between"><span className="text-[#75777f]">Institution</span><span className="font-semibold">{name}</span></div>
                <div className="flex justify-between"><span className="text-[#75777f]">Ministry Ref.</span><span className="font-semibold">{ministry}</span></div>
                <div className="flex justify-between"><span className="text-[#75777f]">Website</span><span className="font-semibold">{website || "—"}</span></div>
                <div className="flex justify-between"><span className="text-[#75777f]">Admin Email</span><span className="font-semibold">{email}</span></div>
                <div className="flex justify-between"><span className="text-[#75777f]">Contact Phone</span><span className="font-semibold">{phone ? `${phoneCountry} ${phone}` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-[#75777f]">Documents</span><span className="font-semibold">{documents.length} file(s)</span></div>
              </div>
              <label className="mb-6 flex gap-3 rounded-lg p-4" style={{ background: "#f2f4f6" }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                <span className="text-xs text-[#44474e]">
                  By submitting this form, you certify that you are an authorized representative of the institution and that the provided information is accurate.
                </span>
              </label>
              {apply.isError && (
                <p className="mb-4 text-xs text-[#C0392B]">
                  {apply.error?.message || "Submission failed — please try again."}
                </p>
              )}
              <div className="mt-6 flex justify-between border-t border-[#eef0f3] pt-5">
                <button type="button" onClick={() => { setStep(1); setTouched(false) }} className="rounded-md border border-[#c5c6cf] bg-white px-6 py-3 text-sm font-semibold text-[#44474e]">
                  Back
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!consent || apply.isPending}
                  className="flex items-center gap-2 rounded-md px-7 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "#005eb3" }}
                >
                  {apply.isPending ? "Submitting…" : "Submit for Authority Review"}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
