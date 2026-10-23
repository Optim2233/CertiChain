"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useResetPassword } from "@/features/auth/hooks/useAuth";
import { PasswordField } from "@/features/auth/components/PasswordField";

function ResetForm() {
  const t = useTranslations("auth")
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const reset = useResetPassword();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);

  const valid = password.length >= 8 && password === confirm;

  function submit() {
    setTouched(true);
    if (!valid || !token) return;
    reset.mutate(
      { token, newPassword: password },
      { onSuccess: () => setTimeout(() => router.push("/login"), 1500) }
    );
  }

  if (!token) {
    return (
      <div className="w-full max-w-[480px] rounded-[20px] border border-[#e6e8ec] bg-white p-8 text-center">
        <p className="text-sm font-semibold text-[#C0392B]">{t("missingToken")}</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-[#005eb3] hover:underline">{t("requestNewLink")}</Link>
      </div>
    );
  }

  if (reset.isSuccess) {
    return (
      <div className="w-full max-w-[480px] rounded-[20px] border border-[#e6e8ec] bg-white p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <span className="material-symbols-outlined">check_circle</span>
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-[#02275A]">{t("resetSuccess")}</h1>
        <p className="mt-2 text-sm text-[#44474e]">{t("redirecting")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px] rounded-[20px] border border-[#e6e8ec] bg-white p-8 shadow-[0_16px_48px_rgba(2,39,90,0.08)]">
      <h1 className="text-[22px] font-extrabold tracking-tight text-[#02275A]">{t("setNewPassword")}</h1>
      <p className="mt-1 text-sm text-[#44474e]">{t("setNewPasswordSub")}</p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">{t("newPassword")}</label>
          <PasswordField value={password} onChange={setPassword} onEnter={submit} placeholder="••••••••" />
          {touched && password.length < 8 && <p className="mt-1.5 text-xs font-medium text-[#C0392B]">{t("min8")}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[#191c1e]">{t("confirmPassword")}</label>
          <PasswordField value={confirm} onChange={setConfirm} onEnter={submit} placeholder="••••••••" />
          {touched && password !== confirm && <p className="mt-1.5 text-xs font-medium text-[#C0392B]">{t("passwordMismatch")}</p>}
        </div>
        {reset.isError && (
          <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#C0392B] ring-1 ring-[#fecaca]">
            {t("invalidLink")}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={reset.isPending}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#0462BA] py-3.5 text-sm font-bold text-white hover:bg-[#034e9a] disabled:opacity-50"
        >
          {reset.isPending ? t("resetting") : t("resetPassword")}
        </button>
        <Link href="/login" className="flex items-center justify-center gap-1 text-sm font-semibold text-[#005eb3] hover:underline underline-offset-4">
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const tc = useTranslations("common")
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
        <Suspense fallback={<div className="text-sm text-[#75777f]">{tc("loading")}</div>}>
          <ResetForm />
        </Suspense>
      </main>
    </div>
  );
}
