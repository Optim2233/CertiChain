"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { useApplyInstitution } from "@/features/institution"

const STEPS = ["Application", "Review", "Activation"]

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-2 flex items-center gap-2 text-xs">
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full font-semibold",
              i <= current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {i + 1}
          </span>
          <span className={i <= current ? "text-foreground" : "text-muted-foreground"}>{step}</span>
          {i < STEPS.length - 1 && <span className="text-border">—</span>}
        </li>
      ))}
    </ol>
  )
}

export default function InstitutionRegisterPage() {
  const [name, setName] = useState("")
  const [ministry, setMinistry] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [documents, setDocuments] = useState<File[]>([])
  const [consent, setConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const apply = useApplyInstitution()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) return
    apply.mutate(
      { name, ministry, email, password, documents },
      { onSuccess: () => setSubmitted(true) }
    )
  }

  if (submitted) {
    return (
      <div className="w-full max-w-sm">
        <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
          <StepIndicator current={1} />
          <h1 className="font-heading text-xl font-bold">Submitted for review</h1>
          <p className="text-muted-foreground text-sm">
            Your application is now pending. The Accreditation Authority will
            review it and you&apos;ll be able to log in once decided.
          </p>
          <Link href="/login" className="text-primary text-sm underline underline-offset-4">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <form
        onSubmit={handleSubmit}
        className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
      >
        <StepIndicator current={0} />
        <h1 className="font-heading text-xl font-bold">Apply for accreditation</h1>
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
          <Label htmlFor="ministry">Ministry reference</Label>
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
          <Label htmlFor="documents">Accreditation documents (PDF)</Label>
          <label
            htmlFor="documents"
            className="border-border bg-background hover:bg-accent flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-6 text-center text-sm"
          >
            <span className="material-symbols-outlined text-2xl text-muted-foreground">cloud_upload</span>
            {documents.length > 0 ? `${documents.length} file(s) selected` : "Click to upload PDF documents"}
          </label>
          <input
            id="documents"
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => setDocuments(Array.from(e.target.files ?? []))}
            required
          />
        </div>
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" required />
          I confirm the submitted documents are accurate and consent to review by the Accreditation Authority.
        </label>
        <Button type="submit" disabled={apply.isPending || !consent}>
          {apply.isPending ? "Submitting…" : "Submit for Authority Review"}
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
