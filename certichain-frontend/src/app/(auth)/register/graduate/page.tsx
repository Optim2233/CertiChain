"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { useSignupCheck, useSignup } from "@/features/graduate"

export default function GraduateRegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const check = useSignupCheck(email)
  const signup = useSignup()

  function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    check.mutate()
  }

  function handleConfirm() {
    signup.mutate(
      { email, password },
      { onSuccess: () => router.push("/login") }
    )
  }

  const pendingCount = check.data?.data.pendingCredentialCount ?? null
  const checkFailed = check.isError
  const emailAlreadyRegistered = /already registered/i.test(
    (check.error as { message?: string })?.message ?? ""
  )

  if (pendingCount !== null) {
    return (
      <div className="w-full max-w-sm">
        <div className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
          <h1 className="font-heading text-xl font-bold">Confirm sign up</h1>
          <p className="text-sm">
            {pendingCount} credential{pendingCount === 1 ? "" : "s"} found for
            this email — will be claimed automatically.
          </p>
          {signup.isError && (
            <p className="text-destructive text-sm">
              {(signup.error as { message?: string })?.message ?? "Something went wrong"}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Choose a password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button onClick={handleConfirm} disabled={signup.isPending || !password}>
            {signup.isPending ? "Creating account…" : "Verify email & continue"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <form
        onSubmit={handleCheck}
        className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
      >
        <h1 className="font-heading text-xl font-bold">Sign up</h1>
        {checkFailed && (
          <p className="text-destructive text-sm">
            {emailAlreadyRegistered ? (
              <>
                This email is already registered.{" "}
                <Link href="/login" className="underline underline-offset-4">
                  Log in instead
                </Link>
                .
              </>
            ) : (
              (check.error as { message?: string })?.message ?? "Something went wrong"
            )}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={check.isPending}>
          {check.isPending ? "Checking…" : "Continue"}
        </Button>
      </form>
      <p className="text-muted-foreground mt-4 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  )
}
