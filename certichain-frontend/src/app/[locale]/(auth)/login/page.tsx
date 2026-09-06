"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { ROLE_HOME, authService, useLogin, useMe } from "@/features/auth"
import { PasswordField } from "@/features/auth/components/PasswordField"
import { CertiChainShield } from "@/shared/components/brand/CertiChainShield"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const login = useLogin()
  const router = useRouter()
  // proxy.ts no longer bounces authenticated users off /login (it can't tell a
  // live session from a dead cookie). Handle both here where /api/auth/me can:
  //  - valid session -> send to the portal
  //  - stale cookie (me 401/403) -> clear it once so it stops being sent
  const me = useMe()
  const queryClient = useQueryClient()
  const clearedRef = useRef(false)
  useEffect(() => {
    if (me.data) {
      router.replace(ROLE_HOME[me.data.role])
    } else if (me.isError && !clearedRef.current) {
      clearedRef.current = true
      authService.logout().catch(() => {})
      queryClient.clear()
    }
  }, [me.data, me.isError, router, queryClient])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [touched, setTouched] = useState(false)

  const emailValid = /\S+@\S+\.\S+/.test(email)
  const passwordValid = password.length > 0
  const valid = emailValid && passwordValid

  function submit() {
    setTouched(true)
    if (!valid) return
    login.mutate({ email, password })
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      {/* top brand bar */}
      <header className="w-full bg-white border-b border-[#e6e8ec]">
        <div className="mx-auto max-w-[1120px] flex h-[60px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white p-1"><CertiChainShield size={20} /></span>
            <span className="text-[17px] font-extrabold tracking-tight text-[#02275A]">CertiChain</span>
          </Link>
          <Link href="/verify" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#44474e] hover:text-[#02275A]">
            <span className="material-symbols-outlined text-[18px]">search_check</span> {tc("verifyCertificate")}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 md:px-6">
        <div className="w-full max-w-[1020px] grid overflow-hidden rounded-[20px] border border-[#e6e8ec] bg-white shadow-[0_16px_48px_rgba(2,39,90,0.08)] md:grid-cols-[1.05fr_1fr]">
          {/* left — brand panel (replaces diagonal stripes with modern mesh) */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-[#02275A] p-8 md:flex">
            {/* subtle mesh */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 -right-24 size-[320px] rounded-full bg-[#0462BA]/30 blur-[40px]" />
              <div className="absolute -bottom-20 -left-20 size-[300px] rounded-full bg-[#0d9668]/20 blur-[40px]" />
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(to_right,white 1px,transparent 1px),linear-gradient(to_bottom,white 1px,transparent 1px)`, backgroundSize: `32px 32px` }} />
            </div>

            <div className="relative">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-white p-1"><CertiChainShield size={20} /></span>
                <span className="text-sm font-extrabold tracking-tight text-white">CertiChain</span>
              </div>
            </div>

            <div className="relative">
              <h2 className="font-heading m-0 text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em] text-white">
                {t("brandVerifyTitle")}
                <br />
                <span className="font-light text-[#d5e3ff]">{t("brandVerifySub")}</span>
              </h2>
              <p className="mt-3 max-w-[340px] text-sm leading-relaxed text-white/75">
                {t("brandBody")}
              </p>

              {/* mini floating certificate — shows product, not decoration */}
              <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest text-white/60">CERTIFICATE</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-[#0d9668]">
                    <span className="size-1.5 rounded-full bg-[#0d9668]" /> {tc("verified")}
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold leading-none text-white">Master of Science</p>
                <p className="mt-1 text-xs text-white/70">Alexandra Morgan • Stanford • #SC-2026-8841</p>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-2.5 py-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-[#02275A] text-white">
                    <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#02275A]">0x8f3a…c9e2</span>
                  <span className="ml-auto text-[11px] font-semibold text-[#0d9668]">SHA-256 • 1.4s</span>
                </div>
              </div>
            </div>

            <div className="relative flex items-center gap-2 text-xs font-medium text-white/60">
              <span className="size-1.5 rounded-full bg-emerald-400" /> {tc("trustedBy")}
            </div>
          </div>

          {/* right — form */}
          <div className="flex flex-col justify-center px-6 py-8 md:px-10 md:py-10">
            {/* mobile logo */}
            <Link href="/" className="mb-6 flex items-center gap-2 md:hidden">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white p-1 ring-1 ring-[#02275A]/10"><CertiChainShield size={20} /></span>
              <span className="text-[17px] font-extrabold text-[#02275A]">CertiChain</span>
            </Link>

            <div className="mb-7">
              <h1 className="font-heading m-0 text-[24px] font-extrabold tracking-[-0.02em] text-[#02275A]">{t("loginTitle")}</h1>
              <p className="m-0 mt-1 text-sm text-[#44474e]">{t("loginSubtitle")}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">{t("email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  className="w-full rounded-xl border bg-[#fcfdff] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#9aa0a6] focus:border-[#0462BA] focus:ring-4 focus:ring-[#d5e3ff]"
                  style={{ borderColor: touched && !emailValid ? "#C0392B" : "#c5c6cf" }}
                  placeholder={t("emailPh")}
                  autoComplete="email"
                />
                {touched && !emailValid && <p className="mt-1.5 text-xs font-medium text-[#C0392B]">{t("invalidEmail")}</p>}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-[#191c1e]">{t("password")}</label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-[#005eb3] hover:underline underline-offset-4">{t("forgotPassword")}</Link>
                </div>
                <PasswordField value={password} onChange={setPassword} onEnter={submit} placeholder="••••••••" />
                {touched && !passwordValid && <p className="mt-1.5 text-xs font-medium text-[#C0392B]">{t("passwordRequired")}</p>}
              </div>

              {touched && !valid && (
                <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#C0392B] ring-1 ring-[#fecaca]">
                  {t("loginFailed")}
                </p>
              )}
              {login.isError && (
                <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#C0392B] ring-1 ring-[#fecaca]">
                  {t("invalidCredentials")}
                </p>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={login.isPending}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0462BA] py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,98,186,0.22)] hover:bg-[#034e9a] disabled:opacity-50 transition"
              >
                {login.isPending ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> {t("loggingIn")}
                  </>
                ) : (
                  <>
                    {tc("logIn")} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-[#e6e8ec]" />
                <span className="text-xs font-semibold tracking-widest text-[#75777f]">{t("or")}</span>
                <span className="h-px flex-1 bg-[#e6e8ec]" />
              </div>

              <div className="rounded-xl bg-[#f7f9fb] px-4 py-3 ring-1 ring-[#e6e8ec]">
                <p className="text-center text-[13px] leading-relaxed text-[#44474e]">
                  {t("notAccredited")}{" "}
                  <Link href="/register" className="font-bold text-[#005eb3] hover:underline underline-offset-4">
                    {t("registerHere")}
                  </Link>
                  <br />
                  {tc("graduateNoAccount")}{" "}
                  <Link href="/register/graduate" className="font-bold text-[#005eb3] hover:underline underline-offset-4">
                    {tc("createAccount")}
                  </Link>
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1 text-xs text-[#75777f]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#0462BA]">lock</span> {t("tamperProof")}
                </span>
                <span className="size-1 rounded-full bg-[#c5c6cf]" />
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#0d9668]">verified</span> {t("onChain")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
