"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { useCredentialFields, useCreateShare, type Share } from "@/features/graduate"

export default function NewSharePage() {
  return (
    <Suspense>
      <NewShareForm />
    </Suspense>
  )
}

function GeneratedShare({ share }: { share: Share }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const link = typeof window !== "undefined" ? `${window.location.origin}/verify/share/${share.shareToken}` : ""

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="material-symbols-outlined text-5xl text-emerald-600">check_circle</span>
      <h1 className="font-heading text-xl font-bold">Share Created Successfully</h1>

      {/* ponytail: no `qrcode` dependency installed - QR render deferred,
          the copyable link covers the same function for now. */}
      <div className="border-border bg-card flex size-40 items-center justify-center rounded-lg border">
        <span className="material-symbols-outlined text-5xl text-muted-foreground">qr_code_2</span>
      </div>

      <p className="text-primary break-all text-sm">{link}</p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(link)
            setCopied(true)
          }}
        >
          {copied ? "Copied!" : "Copy Link"}
        </Button>
        <Button type="button" onClick={() => router.push("/graduate/shares")}>
          View on Shares
        </Button>
      </div>
    </div>
  )
}

function NewShareForm() {
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
    createShare.mutate({
      name,
      scope: "SINGLE_CREDENTIAL",
      credentialId,
      selectedFieldIds: Array.from(selected),
    })
  }

  if (!credentialId) {
    return <div className="p-6 text-sm">Pick a credential from the timeline to share.</div>
  }

  if (createShare.isSuccess) {
    return <GeneratedShare share={createShare.data.data} />
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md p-6">
      <h1 className="mb-1 font-heading text-xl font-bold">Create share</h1>
      <p className="text-muted-foreground mb-4 text-sm">Choose which fields the verifier sees.</p>
      {createShare.isError && (
        <p className="text-destructive mb-2 text-sm">
          {(createShare.error as { message?: string })?.message ?? "Something went wrong"}
        </p>
      )}
      <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
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

        <ul className="flex flex-col gap-1">
          {fields.map((f) => (
            <li key={f.id} className="border-border border-b py-1.5 last:border-0">
              <label className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {f.fieldName}
                  <span className="text-muted-foreground block text-xs">{f.fieldValue}</span>
                </span>
                <input
                  type="checkbox"
                  checked={selected.has(f.id)}
                  onChange={() => toggle(f.id)}
                />
              </label>
            </li>
          ))}
        </ul>

        <div className="bg-accent text-accent-foreground flex items-center gap-2 rounded-lg p-2 text-xs">
          <span className="material-symbols-outlined text-sm leading-none">lock</span>
          Only the selected information will be visible to the verifier.
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {selected.size} of {fields.length} fields selected
        </p>
        <Button type="submit" disabled={createShare.isPending}>
          {createShare.isPending ? "Generating…" : "Generate Link"}
        </Button>
      </div>
    </form>
  )
}
