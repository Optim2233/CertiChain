"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { useCredentialFields, useCreateShare } from "@/features/graduate"

export default function NewSharePage() {
  return (
    <Suspense>
      <NewShareForm />
    </Suspense>
  )
}

function NewShareForm() {
  const router = useRouter()
  const credentialId = useSearchParams().get("credentialId")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState("")

  const { data } = useCredentialFields(credentialId ?? "")
  const fields = data?.data ?? []
  const createShare = useCreateShare()

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!credentialId) return
    createShare.mutate(
      {
        name,
        scope: "SINGLE_CREDENTIAL",
        credentialId,
        selectedFieldIds: Array.from(selected),
      },
      { onSuccess: () => router.push("/graduate/shares") }
    )
  }

  if (!credentialId) {
    return <div className="p-6 text-sm">Pick a credential from the timeline to share.</div>
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md p-6">
      <h1 className="mb-4 text-lg font-semibold">Create share</h1>
      {createShare.isError && (
        <p className="text-destructive mb-2 text-sm">
          {(createShare.error as { message?: string })?.message ?? "Something went wrong"}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Share name</Label>
          <Input
            id="name"
            placeholder="For Employer X"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <p className="text-muted-foreground text-xs">
          {selected.size} of {fields.length} fields will be shared.
        </p>
        <ul className="flex flex-col gap-1">
          {fields.map((f) => (
            <li key={f.id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(f.id)}
                  onChange={() => toggle(f.id)}
                />
                {f.fieldName}
                {!selected.has(f.id) && (
                  <span className="text-muted-foreground">(hidden)</span>
                )}
              </label>
            </li>
          ))}
        </ul>

        <Button type="submit" disabled={createShare.isPending} className="w-fit">
          {createShare.isPending ? "Generating…" : "Generate link"}
        </Button>
      </div>
    </form>
  )
}
