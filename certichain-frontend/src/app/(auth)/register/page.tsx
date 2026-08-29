"use client"

import { useState } from "react"
import Link from "next/link"
import { useApplyInstitution } from "@/features/institution"
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
      <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
        <header className="w-full bg-white border-b border-[#e6e8ec]">
          <div className="mx-auto max-w-[1120px] flex h-[60px] items-center px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#02275A] text-white">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </span>
              <span className="text-[17px] font-extrabold tracking-tight text-[#02275A]">CertiChain</span>
            </Link>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[480px] rounded-[20px] border border-[#e6e8ec] bg-white p-10 text-center shadow-[0_16px_40px_rgba(2,39,90,0.08)]">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#e8f5e9] text-[#0d9668]">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </span>
            <h2 className="font-heading mt-4 text-2xl font-extrabold text-[#02275A]">Application Submitted</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#44474e]">
              The Accreditation Authority will review your documents and notify you by email once a decision is made.
            </p>
            <Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#0462BA] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,98,186,0.22)] hover:bg-[#034e9a]">
              Back to Login
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      {/* header */}
      <header className="w-full bg-white border-b border-[#e6e8ec]">
        <div className="mx-auto max-w-[1280px] flex h-[60px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#02275A] text-white">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </span>
            <span className="text-[17px] font-extrabold tracking-tight text-[#02275A]">CertiChain</span>
          </Link>
          <Link href="/login" className="hidden sm:inline-flex text-sm font-semibold text-[#44474e] hover:text-[#02275A]">
            Already accredited? <span className="text-[#005eb3]">Log in</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="w-full max-w-[1160px] grid overflow-hidden rounded-[20px] border border-[#e6e8ec] bg-white shadow-[0_16px_48px_rgba(2,39,90,0.08)] md:grid-cols-[360px_1fr]">
          {/* left — brand + stepper */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-[#02275A] p-8 md:flex">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 -right-24 size-[300px] rounded-full bg-[#0462BA]/25 blur-[36px]" />
              <div className="absolute -bottom-20 -left-20 size-[280px] rounded-full bg-[#0d9668]/15 blur-[36px]" />
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(to_right,white 1px,transparent 1px),linear-gradient(to_bottom,white 1px,transparent 1px)`, backgroundSize: `30px 30px` }} />
            </div>

            <div className="relative">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-white text-[#02275A]">
                  <span className="material-symbols-outlined text-[16px]">account_balance</span>
                </span>
                <span className="text-sm font-extrabold text-white">CertiChain</span>
              </div>
              <h2 className="font-heading mt-8 text-[26px] font-extrabold leading-[1.05] text-white">
                Join the global
                <br />
                <span className="font-light text-[#d5e3ff]">accreditation network.</span>
              </h2>
              <p className="mt-3 max-w-[300px] text-sm leading-relaxed text-white/70">
                Issue tamper-proof, blockchain-verified credentials your graduates can share anywhere.
              </p>
            </div>

            <div className="relative space-y-3">
              {STEPS.map((label, i) => {
                const active = i === step
                const done = i < step
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 transition ${
                        done ? "bg-[#0d9668] text-white ring-[#0d9668]" : active ? "bg-white text-[#02275A] ring-white" : "bg-white/10 text-white/60 ring-white/20"
                      }`}
                    >
                      {done ? <span className="material-symbols-outlined text-[14px]">check</span> : i + 1}
                    </span>
                    <span className={`text-sm ${active ? "font-bold text-white" : done ? "font-semibold text-white" : "font-medium text-white/60"}`}>
                      {label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span className={`ml-3 hidden h-px flex-1 ${done ? "bg-white/20" : "bg-white/10"}`} />
                    )}
                  </div>
                )
              })}
              <div className="pt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur">
                <span className="material-symbols-outlined text-[16px] text-[#7ee6c5]">verified</span>
                <span className="text-xs font-medium text-white/80">Cross-referenced with ministry databases</span>
              </div>
            </div>

            <p className="relative flex items-center gap-2 text-xs text-white/50">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Trusted by 40+ accredited institutions
            </p>
          </div>

          {/* right — form */}
          <div className="flex flex-col px-6 py-7 md:px-10 md:py-9">
            {/* step pill + mobile stepper */}
            <div className="mb-6 flex items-center justify-between">
              <span className="inline-flex rounded-full bg-[#d5e3ff] px-3 py-1 text-xs font-bold tracking-widest text-[#02275A]">
                STEP {step + 1} OF 3
              </span>
              <div className="flex items-center gap-1.5 md:hidden">
                {STEPS.map((_, i) => (
                  <span key={i} className={`h-1.5 w-6 rounded-full transition ${i <= step ? "bg-[#0462BA]" : "bg-[#e6e8ec]"}`} />
                ))}
              </div>
            </div>

            {step === 0 && (
              <>
                <h1 className="font-heading text-[22px] font-extrabold tracking-[-0.02em] text-[#02275A]">Register Your Institution</h1>
                <p className="mt-1 text-sm text-[#44474e]">Provide your official institutional details.</p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">
                      Institution Name <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. University of Information Technology"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border bg-[#fcfdff] px-3.5 py-3 text-sm outline-none placeholder:text-[#9aa0a6] focus:border-[#0462BA] focus:ring-4 focus:ring-[#d5e3ff]"
                      style={{ borderColor: touched && !name.trim() ? "#C0392B" : "#c5c6cf" }}
                    />
                    {touched && !name.trim() && <p className="mt-1 text-xs font-medium text-[#C0392B]">Institution name is required.</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">
                        Ministry Reference Number <span className="text-[#C0392B]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="MN-YYYY-XXXX"
                        value={ministry}
                        onChange={(e) => setMinistry(e.target.value)}
                        className="w-full rounded-xl border bg-[#fcfdff] px-3.5 py-3 text-sm outline-none placeholder:text-[#9aa0a6] focus:border-[#0462BA] focus:ring-4 focus:ring-[#d5e3ff]"
                        style={{ borderColor: touched && !ministry.trim() ? "#C0392B" : "#c5c6cf" }}
                      />
                      {touched && !ministry.trim() && <p className="mt-1 text-xs font-medium text-[#C0392B]">Required.</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">Institution Website <span className="text-[#75777f] font-normal">(Optional)</span></label>
                      <input
                        type="text"
                        placeholder="www.institution.edu"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full rounded-xl border border-[#c5c6cf] bg-[#fcfdff] px-3.5 py-3 text-sm outline-none placeholder:text-[#9aa0a6] focus:border-[#0462BA] focus:ring-4 focus:ring-[#d5e3ff]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">
                      Admin Email <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="registrar@institution.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border bg-[#fcfdff] px-3.5 py-3 text-sm outline-none placeholder:text-[#9aa0a6] focus:border-[#0462BA] focus:ring-4 focus:ring-[#d5e3ff]"
                      style={{ borderColor: touched && !/\S+@\S+\.\S+/.test(email) ? "#C0392B" : "#c5c6cf" }}
                    />
                    {touched && !/\S+@\S+\.\S+/.test(email) && <p className="mt-1 text-xs font-medium text-[#C0392B]">Enter a valid admin email.</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">
                      Contact Phone Number <span className="text-[#C0392B]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={phoneCountry}
                        onChange={(e) => setPhoneCountry(e.target.value)}
                        className="w-[110px] shrink-0 rounded-xl border border-[#c5c6cf] bg-white px-2 py-3 text-sm outline-none focus:border-[#0462BA] focus:ring-4 focus:ring-[#d5e3ff]"
                      >
                        {COUNTRY_CODES.map((cc) => (
                          <option key={cc.code} value={cc.code}>
                            {cc.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        placeholder="9123 456 789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 rounded-xl border bg-[#fcfdff] px-3.5 py-3 text-sm outline-none placeholder:text-[#9aa0a6] focus:border-[#0462BA] focus:ring-4 focus:ring-[#d5e3ff]"
                        style={{ borderColor: touched && phone.trim().length < 6 ? "#C0392B" : "#c5c6cf" }}
                      />
                    </div>
                    {touched && phone.trim().length < 6 && <p className="mt-1 text-xs font-medium text-[#C0392B]">Enter at least 6 digits.</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">
                      Account Password <span className="text-[#C0392B]">*</span>
                    </label>
                    <PasswordField value={password} onChange={setPassword} placeholder="At least 8 characters" showStrength />
                    {touched && password.length < 8 && <p className="mt-1 text-xs font-medium text-[#C0392B]">Password must be at least 8 characters.</p>}
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-between border-t border-[#e6e8ec] pt-5">
                  <Link href="/login" className="text-sm font-semibold text-[#44474e]">
                    Already accredited? <span className="text-[#005eb3] hover:underline underline-offset-4">Log in</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setTouched(true)
                      if (detailsValid) {
                        setStep(1)
                        setTouched(false)
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,98,186,0.2)] hover:bg-[#034e9a] transition"
                  >
                    Next <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="font-heading text-[22px] font-extrabold tracking-[-0.02em] text-[#02275A]">Accreditation Documents</h1>
                <p className="mt-1 text-sm text-[#44474e]">Upload your official accreditation and registration certificates as PDFs.</p>

                <label className="mt-6 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed bg-[#f7f9fb] p-8 text-center transition hover:border-[#0462BA]/40 hover:bg-[#f0f6ff] md:p-10" style={{ borderColor: touched && !docsValid ? "#C0392B" : "#c5c6cf" }}>
                  <span className="flex size-12 items-center justify-center rounded-full bg-white text-[#0462BA] ring-1 ring-[#e6e8ec]">
                    <span className="material-symbols-outlined text-[24px]">upload_file</span>
                  </span>
                  <p className="mt-3 text-sm font-bold text-[#02275A]">
                    Click to upload <span className="font-normal text-[#44474e]">or drag and drop</span>
                  </p>
                  <p className="mt-1 text-xs text-[#75777f]">PDF only • Multiple files allowed</p>
                  <input type="file" accept=".pdf" multiple className="hidden" onChange={(e) => setDocuments(Array.from(e.target.files ?? []))} />
                </label>

                {documents.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {documents.map((d, i) => (
                      <li key={i} className="flex items-center gap-2.5 rounded-xl border border-[#e6e8ec] bg-white px-3 py-2.5 text-sm">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-[#e8f5e9] text-[#0d9668]">
                          <span className="material-symbols-outlined text-[16px]">description</span>
                        </span>
                        <span className="flex-1 truncate font-medium text-[#191c1e]">{d.name}</span>
                        <span className="text-xs text-[#75777f]">{(d.size / 1024).toFixed(0)} KB</span>
                      </li>
                    ))}
                  </ul>
                )}
                {touched && !docsValid && <p className="mt-2 text-xs font-medium text-[#C0392B]">Upload at least one document.</p>}

                <div className="mt-7 flex justify-between border-t border-[#e6e8ec] pt-5">
                  <button type="button" onClick={() => { setStep(0); setTouched(false) }} className="rounded-xl border border-[#c5c6cf] bg-white px-6 py-3 text-sm font-semibold text-[#44474e] hover:bg-[#f7f9fb]">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTouched(true)
                      if (docsValid) { setStep(2); setTouched(false) }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,98,186,0.2)] hover:bg-[#034e9a]"
                  >
                    Next <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="font-heading text-[22px] font-extrabold tracking-[-0.02em] text-[#02275A]">Review & Submit</h1>
                <p className="mt-1 text-sm text-[#44474e]">Confirm your details before sending them to the Accreditation Authority.</p>

                <div className="mt-6 space-y-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-[#f7f9fb] text-sm">
                  {[
                    ["Institution", name],
                    ["Ministry Ref.", ministry],
                    ["Website", website || "—"],
                    ["Admin Email", email],
                    ["Contact Phone", phone ? `${phoneCountry} ${phone}` : "—"],
                    ["Documents", `${documents.length} file(s)`],
                  ].map(([k, v], i, arr) => (
                    <div key={k} className={`flex items-center justify-between px-5 py-3 ${i !== arr.length - 1 ? "border-b border-[#e6e8ec]" : ""}`}>
                      <span className="text-[#75777f]">{k}</span>
                      <span className="max-w-[60%] truncate font-semibold text-[#191c1e]">{v}</span>
                    </div>
                  ))}
                </div>

                <label className="mt-5 flex gap-3 rounded-xl border border-[#e6e8ec] bg-white p-4">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-[#0462BA]" />
                  <span className="text-xs leading-relaxed text-[#44474e]">
                    By submitting this form, you certify that you are an authorized representative of the institution and that the provided information is accurate.
                  </span>
                </label>

                {apply.isError && (
                  <p className="mt-3 rounded-xl bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#C0392B] ring-1 ring-[#fecaca]">
                    {apply.error?.message || "Submission failed — please try again."}
                  </p>
                )}

                <div className="mt-7 flex justify-between border-t border-[#e6e8ec] pt-5">
                  <button type="button" onClick={() => { setStep(1); setTouched(false) }} className="rounded-xl border border-[#c5c6cf] bg-white px-6 py-3 text-sm font-semibold text-[#44474e] hover:bg-[#f7f9fb]">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!consent || apply.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0462BA] px-7 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,98,186,0.2)] hover:bg-[#034e9a] disabled:opacity-50 disabled:shadow-none"
                  >
                    {apply.isPending ? "Submitting…" : "Submit for Authority Review"} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
