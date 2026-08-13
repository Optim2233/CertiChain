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
      <div>
        <h1 className="text-lg font-semibold">Verify a credential</h1>
        <p className="text-muted-foreground text-sm">
          No account required. Enter a certificate ID, upload a file, or open
          a graduate&apos;s shared link.
        </p>
      </div>

      <form onSubmit={handleLookup} className="flex flex-col gap-1.5">
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

      <Link href="/institutions" className="text-primary text-sm underline underline-offset-4">
        Browse accredited institutions →
      </Link>
    </div>
  )
}
