"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { useApplyInstitution } from "@/features/institution"

export default function InstitutionRegisterPage() {
  const [name, setName] = useState("")
  const [ministry, setMinistry] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [documents, setDocuments] = useState<FileList | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const apply = useApplyInstitution()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    apply.mutate(
      { name, ministry, email, password, documents: Array.from(documents ?? []) },
      { onSuccess: () => setSubmitted(true) }
    )
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-3 p-6">
        <h1 className="text-lg font-semibold">Submitted for review</h1>
        <p className="text-muted-foreground text-sm">
          Your application is now pending. The Accreditation Authority will
          review it and you&apos;ll be able to log in once decided.
        </p>
        <Link href="/login" className="text-primary text-sm underline underline-offset-4">
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-4 p-6"
    >
      <h1 className="text-lg font-semibold">Apply for accreditation</h1>
      <p className="text-muted-foreground text-sm">
        Submitted applications enter the Accreditation Authority&apos;s review
        queue. You&apos;ll land in a pending state until reviewed.
      </p>
      {apply.isError && (
        <p className="text-destructive text-sm">
          {(apply.error as { message?: string })?.message ?? "Something went wrong"}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Institution name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ministry">Ministry</Label>
        <Input id="ministry" value={ministry} onChange={(e) => setMinistry(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Account email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Account password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="documents">Accreditation documents</Label>
        <Input id="documents" type="file" multiple onChange={(e) => setDocuments(e.target.files)} required />
      </div>
      <Button type="submit" disabled={apply.isPending}>
        {apply.isPending ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  )
}
