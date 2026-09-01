"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSignupCheck, useSignup, useGraduateStore } from "@/features/graduate"
import { AuthBrandPanel } from "@/features/auth/components/AuthBrandPanel"
import { PasswordField } from "@/features/auth/components/PasswordField"
import { COUNTRY_CODES } from "@/features/auth/utils/countryCodes"

export default function GraduateRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneCountry, setPhoneCountry] = useState("+95")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [touched, setTouched] = useState(false)

  const signupCheck = useSignupCheck()
  const signup = useSignup()
  const pendingCount = useGraduateStore((s) => s.pendingCredentialCount)

  const emailValid = /\S+@\S+\.\S+/.test(email)
  const detailsValid = emailValid && firstName.trim().length > 0 && lastName.trim().length > 0 && phone.trim().length >= 6
  const passwordValid = password.length >= 8
  const passwordsMatch = password === confirmPassword

  function checkEmail() {
    setTouched(true)
    if (!detailsValid) return
    signupCheck.mutate(email.trim().toLowerCase(), { onSuccess: () => setStep(1) })
  }

  function submitSignup() {
    setTouched(true)
    if (!passwordValid || !passwordsMatch) return
    signup.mutate(
      { email, password, firstName, lastName, phone: `${phoneCountry} ${phone}` },
      { onSuccess: () => router.push("/login") }
    )
  }

  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel
        icon="school"
        heading="Your credentials, your wallet."
        body="Own a portable, verifiable record of every certificate and degree you've earned, and choose who gets to see it."
        footer="120,000+ graduates already on CertiChain"
      />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[1000px]">
          {step === 0 ? (
            <>
              <h1 className="font-heading m-0 mb-1.5 text-[26px] font-extrabold">Create your account</h1>
              <p className="m-0 mb-6 text-sm text-[#44474e]">Tell us a little about you.</p>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-bold">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Aye Aye"
                    className="w-full rounded-md border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Win"
                    className="w-full rounded-md border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <label className="mb-1.5 block text-sm font-bold">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mb-4 w-full rounded-md border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
              />

              <label className="mb-1.5 block text-sm font-bold">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={phoneCountry}
                  onChange={(e) => setPhoneCountry(e.target.value)}
                  className="w-[100px] shrink-0 rounded-md border border-[#c5c6cf] bg-white px-2 py-2.5 text-sm"
                >
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc.code} value={cc.code}>{cc.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkEmail()}
                  placeholder="9123 456 789"
                  className="flex-1 rounded-md border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                />
              </div>
              {touched && !detailsValid && (
                <p className="mb-3 mt-3 text-xs text-[#C0392B]">
                  {!emailValid ? "Enter a valid email address." : "Fill in your name and phone number."}
                </p>
              )}
              <button
                type="button"
                onClick={checkEmail}
                disabled={signupCheck.isPending}
                className="mt-5 w-full rounded-md py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#0462BA" }}
              >
                {signupCheck.isPending ? "Checking…" : "Continue"}
              </button>
            </>
          ) : (
            <>
              <h1 className="font-heading m-0 mb-1.5 text-[26px] font-extrabold">Secure your account</h1>
              <p className="m-0 mb-5 text-sm text-[#44474e]">Almost there, {firstName}.</p>
              <div className="mb-5 flex items-center gap-2.5 rounded-md border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)] px-4 py-3">
                <span className="material-symbols-outlined" style={{ color: "#0d9668" }}>
                  {pendingCount && pendingCount > 0 ? "workspace_premium" : "info"}
                </span>
                <p className="m-0 text-[13px] font-semibold" style={{ color: "#0d9668" }}>
                  {pendingCount && pendingCount > 0
                    ? `We found ${pendingCount} credential${pendingCount > 1 ? "s" : ""} waiting for you.`
                    : "No credentials yet under this email — that's OK, you can still create an account."}
                </p>
              </div>

              <label className="mb-1.5 block text-sm font-bold">Password</label>
              <PasswordField value={password} onChange={setPassword} placeholder="At least 8 characters" showStrength />
              <label className="mb-1.5 mt-4 block text-sm font-bold">Confirm Password</label>
              <PasswordField value={confirmPassword} onChange={setConfirmPassword} onEnter={submitSignup} placeholder="••••••••" autoComplete="new-password" />
              {touched && !passwordValid && <p className="mb-3 mt-2 text-xs text-[#C0392B]">Password must be at least 8 characters.</p>}
              {touched && passwordValid && !passwordsMatch && <p className="mb-3 mt-2 text-xs text-[#C0392B]">Passwords don't match.</p>}
              {signup.isError && <p className="mb-3 mt-2 text-xs text-[#C0392B]">Something went wrong — try again.</p>}

              <button
                type="button"
                onClick={submitSignup}
                disabled={signup.isPending}
                className="mt-4 w-full rounded-md py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#0462BA" }}
              >
                {signup.isPending ? "Creating account…" : "Create Account"}
              </button>
              <div onClick={() => setStep(0)} className="mt-3.5 cursor-pointer text-center text-xs text-[#75777f]">
                ← Back
              </div>
            </>
          )}

          <p className="mt-5 text-center text-[13px] text-[#44474e]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "#005eb3" }}>
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
