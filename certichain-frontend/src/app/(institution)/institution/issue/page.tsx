"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { useIssueCertificate } from "@/features/institution"

export default function IssueCertificatePage() {
  const router = useRouter()
  const [graduateEmail, setGraduateEmail] = useState("")
  const [program, setProgram] = useState("")
  const [graduationDate, setGraduationDate] = useState("")
  const [credentialId, setCredentialId] = useState("")
  const [extraFields, setExtraFields] = useState<{ name: string; value: string }[]>([])
  const [touched, setTouched] = useState(false)
  const issueCertificate = useIssueCertificate()

  const emailValid = /\S+@\S+\.\S+/.test(graduateEmail)
  const programValid = program.trim().length > 0
  const dateValid = graduationDate.trim().length > 0
  const formValid = emailValid && programValid && dateValid

  function addField() {
    setExtraFields((f) => [...f, { name: "", value: "" }])
  }

  function updateField(i: number, key: "name" | "value", val: string) {
    setExtraFields((f) => f.map((field, idx) => (idx === i ? { ...field, [key]: val } : field)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!formValid) return
    const fields = [
      { name: "degree", value: program },
      { name: "graduationDate", value: graduationDate },
      ...(credentialId ? [{ name: "credentialId", value: credentialId }] : []),
      ...extraFields.filter((f) => f.name && f.value),
    ]
    issueCertificate.mutate(
      { graduateEmail, fields },
      { onSuccess: () => router.push("/institution") }
    )
  }

  function fieldClass(valid: boolean) {
    return touched && !valid ? "border-destructive bg-[#fff6f5]" : undefined
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 font-heading text-xl font-bold">Issue single certificate</h1>

      {issueCertificate.isError && (
        <p className="text-destructive mb-3 text-sm">
          {(issueCertificate.error as { message?: string })?.message ?? "Something went wrong"}
        </p>
      )}

      <div className="border-border bg-card mb-4 flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Recipient information</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="graduate-email">Graduate email</Label>
          <Input
            id="graduate-email"
            type="email"
            value={graduateEmail}
            onChange={(e) => setGraduateEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            className={fieldClass(emailValid)}
            required
          />
          {touched && !emailValid && (
            <p className="text-destructive text-xs">Enter a valid email address.</p>
          )}
        </div>
      </div>

      <div className="border-border bg-card mb-4 flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Credential details</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="program">Degree / program</Label>
          <Input
            id="program"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            onBlur={() => setTouched(true)}
            className={fieldClass(programValid)}
            required
          />
          {touched && !programValid && (
            <p className="text-destructive text-xs">Degree / program title is required.</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="graduation-date">Graduation date</Label>
          <Input
            id="graduation-date"
            type="date"
            value={graduationDate}
            onChange={(e) => setGraduationDate(e.target.value)}
            onBlur={() => setTouched(true)}
            className={fieldClass(dateValid)}
            required
          />
          {touched && !dateValid && (
            <p className="text-destructive text-xs">Graduation date is required.</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="credential-id">Credential ID (optional)</Label>
          <Input id="credential-id" value={credentialId} onChange={(e) => setCredentialId(e.target.value)} />
        </div>

        {extraFields.map((field, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Field name (e.g. GPA)"
              value={field.name}
              onChange={(e) => updateField(i, "name", e.target.value)}
            />
            <Input
              placeholder="Value"
              value={field.value}
              onChange={(e) => updateField(i, "value", e.target.value)}
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addField} className="w-fit">
          + Add field
        </Button>
      </div>

      <div className="border-border bg-secondary mb-4 flex gap-2 rounded-lg border p-4 text-sm">
        <span className="material-symbols-outlined text-base leading-none">warning</span>
        <p>
          <span className="font-semibold">Immutable record.</span> Once signed, this credential is
          permanently recorded and can only be revoked (not edited or deleted), with the revocation
          reason logged and shown to the institution.
        </p>
      </div>

      {touched && formValid && !issueCertificate.isError && (
        <div className={cn("mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm", "border-emerald-500/50 bg-emerald-500/10 text-emerald-700")}>
          <span className="material-symbols-outlined text-base leading-none">check_circle</span>
          All required fields look good.
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/institution")}>
          Cancel
        </Button>
        <Button type="submit" disabled={issueCertificate.isPending}>
          {issueCertificate.isPending ? "Signing…" : "Sign & Issue on Blockchain"}
        </Button>
      </div>
    </form>
  )
}
