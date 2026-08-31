"use client";

import { useState } from "react";
import Link from "next/link";
import { useForgotPassword } from "@/features/auth/hooks/useAuth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const forgot = useForgotPassword();

  const emailValid = /\S+@\S+\.\S+/.test(email);

  function submit() {
    setTouched(true);
    if (!emailValid) return;
    forgot.mutate(email);
  }

  if (forgot.isSuccess) {
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
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-[480px] rounded-[20px] border border-[#e6e8ec] bg-white p-8 shadow-[0_16px_48px_rgba(2,39,90,0.08)] text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <span className="material-symbols-outlined">mark_email_read</span>
            </span>
            <h1 className="mt-4 text-xl font-extrabold text-[#02275A]">Check your email</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#44474e]">
              If an account exists for <span className="font-semibold">{email}</span>, we sent a reset link. It expires in 30 minutes. Check spam if you don&apos;t see it.
            </p>
            <Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#0462BA] px-6 py-3 text-sm font-bold text-white hover:bg-[#034e9a]">
              Back to log in
            </Link>
          </div>
        </main>
      </div>
    );
  }

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
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[480px] rounded-[20px] border border-[#e6e8ec] bg-white p-8 shadow-[0_16px_48px_rgba(2,39,90,0.08)]">
          <h1 className="text-[22px] font-extrabold tracking-tight text-[#02275A]">Forgot your password?</h1>
          <p className="mt-1 text-sm text-[#44474e]">Enter your email and we&apos;ll send a reset link.</p>

          <div className="mt-6">
            <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="you@institution.edu"
              className="w-full rounded-xl border bg-[#fcfdff] px-3.5 py-3 text-sm outline-none focus:border-[#0462BA] focus:ring-4 focus:ring-[#d5e3ff]"
              style={{ borderColor: touched && !emailValid ? "#C0392B" : "#c5c6cf" }}
            />
            {touched && !emailValid && <p className="mt-1.5 text-xs font-medium text-[#C0392B]">Enter a valid email address.</p>}
            {forgot.isError && (
              <p className="mt-3 rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#C0392B] ring-1 ring-[#fecaca]">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(forgot.error as any)?.response?.data?.message ?? "Something went wrong. Try again."}
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={forgot.isPending}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0462BA] py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,98,186,0.22)] hover:bg-[#034e9a] disabled:opacity-50"
            >
              {forgot.isPending ? "Sending…" : "Send reset link"}
            </button>
            <Link href="/login" className="mt-4 flex items-center justify-center gap-1 text-sm font-semibold text-[#005eb3] hover:underline underline-offset-4">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to log in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
