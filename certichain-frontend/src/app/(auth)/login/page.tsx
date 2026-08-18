"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useLogin } from "@/features/auth"
import { AuthBrandPanel } from "@/features/auth/components/AuthBrandPanel"
import { PasswordField } from "@/features/auth/components/PasswordField"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const login = useLogin()
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
    <div className="flex min-h-screen">
      <AuthBrandPanel
        icon="verified_user"
        heading="Verify credentials in seconds, not weeks."
        body="CertiChain anchors every certificate on-chain so institutions, graduates, and employers can all trust the same record."
        footer="Trusted by 40+ accredited institutions"
      />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[950px]">
          <div className="mb-8">
            <h1 className="font-heading m-0 mb-1.5 text-[26px] font-extrabold">Log in to your portal</h1>
            <p className="m-0 text-sm text-[#44474e]">Enter your credentials to continue.</p>
          </div>

          <label className="mb-1.5 block text-sm font-bold">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="mb-4 w-full rounded-md border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
            placeholder="you@institution.edu"
          />
          <label className="mb-1.5 block text-sm font-bold">Password</label>
          <PasswordField value={password} onChange={setPassword} onEnter={submit} placeholder="••••••••" />
          <div className="mb-4 mt-2 flex justify-end">
            <span className="cursor-pointer text-xs font-semibold" style={{ color: "#005eb3" }}>Forgot password?</span>
          </div>
          {touched && !valid && <p className="mb-3 text-xs text-[#C0392B]">Enter a valid email and password.</p>}
          {login.isError && <p className="mb-3 text-xs text-[#C0392B]">Incorrect email or password.</p>}

          <button
            type="button"
            onClick={submit}
            disabled={login.isPending}
            className="mt-1 w-full rounded-md py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "#0462BA" }}
          >
            {login.isPending ? "Logging in…" : "Log In"}
          </button>

          <p className="mt-6 text-center text-[13px] text-[#44474e]">
            Institution not yet accredited?{" "}
            <Link href="/register" className="font-semibold" style={{ color: "#005eb3" }}>
              Register here
            </Link>
          </p>
          <p className="mt-1.5 text-center text-[13px] text-[#44474e]">
            Graduate, no account yet?{" "}
            <Link href="/register/graduate" className="font-semibold" style={{ color: "#005eb3" }}>
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
