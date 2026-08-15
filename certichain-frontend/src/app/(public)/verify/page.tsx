"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"

export default function VerifyLandingPage() {
  const router = useRouter()
  const [certificateId, setCertificateId] = useState("")

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (certificateId.trim()) router.push(`/verify/${certificateId.trim()}`)
  }

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold">Verify a credential</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          No account required. Enter a certificate ID, upload a file, or open
          a graduate&apos;s shared link.
        </p>
      </div>

      <form
        onSubmit={handleLookup}
        className="border-border bg-card flex flex-col gap-1.5 rounded-lg border p-6 shadow-[0_8px_30px_rgba(42,77,215,0.06)]"
      >
        <Label htmlFor="certificate-id">Certificate ID</Label>
        <div className="flex gap-2">
          <Input
            id="certificate-id"
            value={certificateId}
            onChange={(e) => setCertificateId(e.target.value)}
          />
          <Button type="submit">Verify</Button>
        </div>
      </form>

      {/* TODO: file-upload verification (POST /api/verify/file) */}

      <Link href="/institutions" className="text-primary text-center text-sm underline underline-offset-4">
        Browse accredited institutions →
      </Link>
    </div>
  )
}
