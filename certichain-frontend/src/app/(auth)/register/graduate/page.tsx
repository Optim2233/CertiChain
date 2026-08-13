"use client"

import { useState } from "react"
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

  if (pendingCount !== null) {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-4 p-6">
        <h1 className="text-lg font-semibold">Confirm sign up</h1>
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
    )
  }

  return (
    <form
      onSubmit={handleCheck}
      className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-4 p-6"
    >
      <h1 className="text-lg font-semibold">Sign up</h1>
      {check.isError && (
        <p className="text-destructive text-sm">
          {(check.error as { message?: string })?.message ?? "Something went wrong"}
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
  )
}
