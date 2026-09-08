"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Link } from "@/i18n/navigation"
import { useSignupCheck, useSignup, useGraduateStore } from "@/features/graduate"
import { AuthBrandPanel } from "@/features/auth/components/AuthBrandPanel"
import { PasswordField } from "@/features/auth/components/PasswordField"
import { COUNTRY_CODES } from "@/features/auth/utils/countryCodes"

export default function GraduateRegisterPage() {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
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
        heading={t("walletTitle")}
        body={t("walletSub")}
        footer={t("socialProof")}
      />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[1000px]">
          {step === 0 ? (
            <>
              <h1 className="font-heading m-0 mb-1.5 text-[26px] font-extrabold">{t("createAccountTitle")}</h1>
              <p className="m-0 mb-6 text-sm text-[#44474e]">{t("createAccountSub")}</p>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-bold">{t("firstName")}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Aye Aye"
                    className="w-full rounded-md border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold">{t("lastName")}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Win"
                    className="w-full rounded-md border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <label className="mb-1.5 block text-sm font-bold">{t("email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mb-4 w-full rounded-md border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
              />

              <label className="mb-1.5 block text-sm font-bold">{t("phone")}</label>
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
                  {!emailValid ? t("invalidEmail") : t("fillProfile")}
                </p>
              )}
              <button
                type="button"
                onClick={checkEmail}
                disabled={signupCheck.isPending}
                className="mt-5 w-full rounded-md py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#0462BA" }}
              >
                {signupCheck.isPending ? t("checking") : t("continue")}
              </button>
            </>
          ) : (
            <>
              <h1 className="font-heading m-0 mb-1.5 text-[26px] font-extrabold">{t("secureAccount")}</h1>
              <p className="m-0 mb-5 text-sm text-[#44474e]">{t("almostThere", { name: firstName })}</p>
              <div className="mb-5 flex items-center gap-2.5 rounded-md border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)] px-4 py-3">
                <span className="material-symbols-outlined" style={{ color: "#0d9668" }}>
                  {pendingCount && pendingCount > 0 ? "workspace_premium" : "info"}
                </span>
                <p className="m-0 text-[13px] font-semibold" style={{ color: "#0d9668" }}>
                  {pendingCount && pendingCount > 0
                    ? t("credsWaiting", { n: pendingCount })
                    : t("noCredsYet")}
                </p>
              </div>

              <label className="mb-1.5 block text-sm font-bold">{t("password")}</label>
              <PasswordField value={password} onChange={setPassword} placeholder={t("min8")} showStrength />
              <label className="mb-1.5 mt-4 block text-sm font-bold">{t("confirmPassword")}</label>
              <PasswordField value={confirmPassword} onChange={setConfirmPassword} onEnter={submitSignup} placeholder="••••••••" autoComplete="new-password" />
              {touched && !passwordValid && <p className="mb-3 mt-2 text-xs text-[#C0392B]">{t("min8")}</p>}
              {touched && passwordValid && !passwordsMatch && <p className="mb-3 mt-2 text-xs text-[#C0392B]">{t("passwordMismatch")}</p>}
              {signup.isError && <p className="mb-3 mt-2 text-xs text-[#C0392B]">{t("resetFailed")}</p>}

              <button
                type="button"
                onClick={submitSignup}
                disabled={signup.isPending}
                className="mt-4 w-full rounded-md py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#0462BA" }}
              >
                {signup.isPending ? t("creating") : t("createAccountTitle")}
              </button>
              <div onClick={() => setStep(0)} className="mt-3.5 cursor-pointer text-center text-xs text-[#75777f]">
                ← {tc("back")}
              </div>
            </>
          )}

          <p className="mt-5 text-center text-[13px] text-[#44474e]">
            {t("alreadyHave")}{" "}
            <Link href="/login" className="font-semibold" style={{ color: "#005eb3" }}>
              {t("logInLink")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
