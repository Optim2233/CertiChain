"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { useLogin } from "@/features/auth"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const login = useLogin()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    login.mutate({ email, password })
  }

  return (
    <div className="w-full max-w-sm">
      <form
        onSubmit={handleSubmit}
        className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
      >
        <h1 className="font-heading text-xl font-bold">Log in</h1>
        {login.isError && (
          <p className="text-destructive text-sm">
            {(login.error as { message?: string })?.message ?? "Something went wrong"}
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="text-muted-foreground mt-4 text-center text-sm">
        No account?{" "}
        <Link href="/register/graduate" className="text-primary underline underline-offset-4">
          Sign up as a graduate
        </Link>{" "}
        or{" "}
        <Link href="/register/institution" className="text-primary underline underline-offset-4">
          apply as an institution
        </Link>
        .
      </p>
    </div>
  )
}
