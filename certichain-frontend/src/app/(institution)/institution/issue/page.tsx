"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { useIssueCertificate } from "@/features/institution"

export default function IssueCertificatePage() {
  const router = useRouter()
  const [graduateEmail, setGraduateEmail] = useState("")
  const [program, setProgram] = useState("")
  const [graduationDate, setGraduationDate] = useState("")
  const [extraFields, setExtraFields] = useState<{ name: string; value: string }[]>([])
  const issueCertificate = useIssueCertificate()

  function addField() {
    setExtraFields((f) => [...f, { name: "", value: "" }])
  }

  function updateField(i: number, key: "name" | "value", val: string) {
    setExtraFields((f) => f.map((field, idx) => (idx === i ? { ...field, [key]: val } : field)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fields = [
      { name: "degree", value: program },
      { name: "graduationDate", value: graduationDate },
      ...extraFields.filter((f) => f.name && f.value),
    ]
    issueCertificate.mutate(
      { graduateEmail, fields },
      { onSuccess: () => router.push("/institution") }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md p-6">
      <h1 className="mb-4 text-lg font-semibold">Issue certificate</h1>
      {issueCertificate.isError && (
        <p className="text-destructive mb-2 text-sm">
          {(issueCertificate.error as { message?: string })?.message ?? "Something went wrong"}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="graduate-email">Graduate email</Label>
          <Input
            id="graduate-email"
            type="email"
            value={graduateEmail}
            onChange={(e) => setGraduateEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="program">Degree / program</Label>
          <Input id="program" value={program} onChange={(e) => setProgram(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="graduation-date">Graduation date</Label>
          <Input
            id="graduation-date"
            type="date"
            value={graduationDate}
            onChange={(e) => setGraduationDate(e.target.value)}
            required
          />
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

        <Button type="submit" disabled={issueCertificate.isPending} className="w-fit">
          {issueCertificate.isPending ? "Signing…" : "Sign & issue"}
        </Button>
      </div>
    </form>
  )
}
