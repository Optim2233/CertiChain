"use client"

import { useRef, useState } from "react"
import { useVerifyCertificate, useVerifyFile, useTrustStats } from "@/features/verifier"
import type { VerificationResponse } from "@/features/verifier"

const QR_PATH = "M0 0h3v3H0zM7 0h3v3H7zM0 7h3v3H0zM4 0h1v1H4zM4 2h1v2H4zM4 5h2v1H4zM4 7h1v3H4zM6 4h1v1H6zM8 4h2v1H8zM6 6h1v4H6zM8 8h2v2H8z"

export default function VerifyPage() {
  const [mode, setMode] = useState<"text" | "qr">("text")
  const [certId, setCertId] = useState("")
  const [certLink, setCertLink] = useState("")
  const [touched, setTouched] = useState(false)
  const [result, setResult] = useState<VerificationResponse | null>(null)

  const qrInputRef = useRef<HTMLInputElement>(null)
  const verifyCert = useVerifyCertificate()
  const verifyFile = useVerifyFile()
  const { data: statsData } = useTrustStats()
  const stats = statsData?.data

  const valid = certId.trim().length > 0 || certLink.trim().length > 0

  function submit() {
    setTouched(true)
    if (!valid) return
    const id = certId.trim() || certLink.trim()
    verifyCert.mutate(id, { onSuccess: ({ data }) => setResult(data) })
  }

  function reset() {
    setResult(null)
    setCertId("")
    setCertLink("")
    setTouched(false)
  }

  if (result) {
    return result.result === "VERIFIED" ? (
      <VerifiedResult result={result} onBack={reset} />
    ) : (
      <InvalidResult result={result} onBack={reset} />
    )
  }

  return (
    <main className="flex flex-col items-center px-6 pt-16">
      <div className="mb-4 max-w-[640px] text-center">
        <h1 className="font-heading m-0 mb-4 text-[40px] font-extrabold">Verify a Certificate</h1>
        <p className="m-0 text-base text-[#44474e]">
          CertiChain allows organizations to verify digitally signed academic certificates and confirm the
          legitimacy of their issuing institution — no account required.
        </p>
      </div>

      {stats && (
        <div className="mb-10 flex items-center gap-2 rounded-full px-4 py-2" style={{ background: "#d5e3ff" }}>
          <span className="material-symbols-outlined text-base" style={{ color: "#02275A" }}>domain_verification</span>
          <span className="text-[13px] font-semibold" style={{ color: "#02275A" }}>
            {stats.institutionCount} institutions accredited on CertiChain · {stats.verificationCount.toLocaleString()}+ certificates verified
          </span>
        </div>
      )}

      <div className="mb-5 w-full max-w-[600px] rounded-lg border border-[#c5c6cf] bg-white p-2 shadow-[0_8px_30px_rgba(2,39,90,0.06)]">
        <div className="mb-6 flex gap-1">
          <button
            type="button"
            onClick={() => setMode("text")}
            className="rounded px-3.5 py-2 text-sm font-semibold"
            style={{ background: mode === "text" ? "#0462BA" : "transparent", color: mode === "text" ? "#fff" : "#44474e" }}
          >
            Certificate ID or Link
          </button>
          <button
            type="button"
            onClick={() => setMode("qr")}
            className="rounded px-3.5 py-2 text-sm font-semibold"
            style={{ background: mode === "qr" ? "#0462BA" : "transparent", color: mode === "qr" ? "#fff" : "#44474e" }}
          >
            Scan QR Code
          </button>
        </div>

        {mode === "text" ? (
          <div className="px-6 pb-6">
            <label className="mb-1.5 block text-sm font-bold">Certificate ID</label>
            <input
              type="text"
              placeholder="Enter certificate ID (e.g. EDU-2024-XXXXX)"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              className="mb-5 w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
            />
            <label className="mb-1.5 block text-sm font-bold">Certificate Link</label>
            <input
              type="text"
              placeholder="Paste the certificate URL here"
              value={certLink}
              onChange={(e) => setCertLink(e.target.value)}
              className="mb-2 w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
            />
            {touched && !valid && <p className="mb-4 text-xs text-[#C0392B]">Enter a certificate ID or link to continue.</p>}
            <button
              type="button"
              onClick={submit}
              disabled={verifyCert.isPending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded py-3.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#0462BA" }}
            >
              <span className="material-symbols-outlined">verified_user</span>
              {verifyCert.isPending ? "Verifying…" : "Verify Certificate"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 pb-6">
            <label className="mb-4 flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[#c5c6cf] bg-[#f7f9fb] text-center">
              <span className="material-symbols-outlined text-[40px] text-[#75777f]">qr_code_scanner</span>
              <p className="m-0 max-w-[280px] text-[13px] text-[#44474e]">
                Point your camera at the QR code printed on the certificate, or upload an image of it.
              </p>
              <input
                ref={qrInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) verifyFile.mutate(file, { onSuccess: ({ data }) => setResult(data) })
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => qrInputRef.current?.click()}
              disabled={verifyFile.isPending}
              className="flex w-full items-center justify-center gap-2 rounded py-3.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#0462BA" }}
            >
              <span className="material-symbols-outlined">photo_camera</span>
              {verifyFile.isPending ? "Checking…" : "Upload QR Image"}
            </button>
            {verifyFile.isError && (
              <p className="mt-3 text-center text-xs font-semibold" style={{ color: "#C0392B" }}>
                {verifyFile.error?.message || "Couldn't read that image. Please try again."}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-center gap-5 border-t border-[#eef0fb] px-6 py-4">
          <span className="flex items-center gap-1.5 text-xs text-[#75777f]">
            <span className="material-symbols-outlined text-[15px]" style={{ color: "#0462BA" }}>lock</span>
            Tamper-proof record
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#75777f]">
            <span className="material-symbols-outlined text-[15px]" style={{ color: "#0462BA" }}>no_accounts</span>
            No account needed
          </span>
        </div>
      </div>

      <div className="mb-14 mt-6 flex gap-10">
        <Step icon="edit_note" label="1. Enter ID, link, or scan" />
        <Step icon="link" label="2. We check the chain" />
        <Step icon="bolt" label="3. Instant result" />
      </div>
    </main>
  )
}

function Step({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ background: "#d5e3ff" }}>
        <span className="material-symbols-outlined text-base" style={{ color: "#02275A" }}>{icon}</span>
      </span>
      <span className="text-[13px] font-semibold text-[#44474e]">{label}</span>
    </div>
  )
}

function VerifiedResult({ result, onBack }: { result: VerificationResponse; onBack: () => void }) {
  return (
    <main className="mx-auto max-w-[640px] px-6 py-14">
      <div className="mb-8 text-center">
        <span className="material-symbols-outlined mb-3 inline-block text-5xl" style={{ color: "#0d9668" }}>check_circle</span>
        <h1 className="font-heading m-0 mb-3 text-[32px] font-extrabold">Certificate Verified</h1>
        <p className="m-0 text-base text-[#44474e]">
          This digital credential has been successfully confirmed. The certificate is authentic and the issuing institution is trusted.
        </p>
      </div>

      <div
        className="relative mb-5 overflow-hidden rounded-2xl p-9 text-white shadow-[0_12px_32px_rgba(2,39,90,0.25)]"
        style={{ background: "linear-gradient(135deg,#02275A,#0462BA)" }}
      >
        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2" style={{ fontSize: 150, opacity: 0.08 }}>
          workspace_premium
        </span>
        <div className="relative mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-white">
              <span className="material-symbols-outlined text-[20px]" style={{ color: "#02275A" }}>account_balance</span>
            </div>
            <div>
              <p className="font-heading m-0 text-sm font-bold">{result.institutionName}</p>
              <p className="m-0 mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: "#c4d3ff" }}>
                <span className="material-symbols-outlined text-xs">verified</span>
                Accredited Institution
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "rgba(16,185,129,0.2)", color: "#7ee6c5" }}>
            <span className="material-symbols-outlined text-sm">verified</span>
            Verified on Chain
          </span>
        </div>

        <div className="relative mb-7">
          <p className="font-heading m-0 mb-1.5 text-[26px] font-extrabold leading-tight">{result.credentialTitle}</p>
          {result.issuedTo && <p className="m-0 text-[15px]" style={{ color: "#dbe3ff" }}>Issued to {result.issuedTo}</p>}
        </div>

        <div className="relative flex items-end justify-between gap-6">
          <div className="flex flex-wrap gap-8">
            {result.issuedAt && (
              <div>
                <p className="m-0 mb-0.5 text-[11px] uppercase tracking-wide" style={{ color: "#a9bcff" }}>Issue Date</p>
                <p className="m-0 text-[13px] font-semibold">{new Date(result.issuedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          <div className="shrink-0 rounded-md bg-white p-1.5" style={{ width: 52, height: 52 }}>
            <svg viewBox="0 0 10 10" width="100%" height="100%">
              <rect width="10" height="10" fill="#fff" />
              <path d={QR_PATH} fill="#02275A" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-[#c5c6cf] bg-white px-6 py-5">
        <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wide text-[#75777f]">How this was verified</p>
        <div className="flex flex-col gap-2.5">
          <CheckRow label="Signature matches issuer's public key on-chain" />
          <CheckRow label="Not present on the revocation registry" />
          <CheckRow label="Issuing institution's accreditation is active" />
        </div>
      </div>

      {/* ponytail: no PDF-report endpoint and no per-result permalink/id exists
          on the backend yet (VerificationResponse carries no credential id),
          so "Download Report" / "Copy Verification Link" were removed rather
          than left as dead buttons - add back once either endpoint exists. */}
      <button type="button" onClick={onBack} className="mb-4 w-full text-center text-[13px] font-semibold" style={{ color: "#005eb3" }}>
        ← Verify another certificate
      </button>
    </main>
  )
}

function CheckRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="material-symbols-outlined text-lg" style={{ color: "#0d9668" }}>check_circle</span>
      <span className="text-sm">{label}</span>
    </div>
  )
}

function InvalidResult({ result, onBack }: { result: VerificationResponse; onBack: () => void }) {
  const isRevoked = result.result === "REVOKED"
  return (
    <main className="mx-auto max-w-[600px] px-6 py-24 text-center">
      <span className="material-symbols-outlined mb-5 inline-block text-[72px]" style={{ color: "#C0392B" }}>block</span>
      <h1 className="font-heading m-0 mb-3 text-[34px] font-extrabold" style={{ color: "#C0392B" }}>
        {isRevoked ? "This Certificate Was Revoked" : "Certificate Not Found"}
      </h1>
      <p className="m-0 mb-7 text-base text-[#44474e]">
        {isRevoked
          ? "The issuing institution revoked this credential" + (result.revokedAt ? " on " + new Date(result.revokedAt).toLocaleDateString() + "." : ".") + " It was valid and authentic before that date, but should no longer be relied upon."
          : "We couldn't find a certificate matching that ID or link. Double-check it and try again."}
      </p>

      {isRevoked && result.revokeReason && (
        <div className="mb-5 rounded-lg border border-[#c5c6cf] bg-white px-6 py-5 text-left">
          <p className="m-0 text-sm text-[#44474e]">
            <strong className="text-[#191c1e]">Revocation reason on file:</strong> {result.revokeReason}
          </p>
        </div>
      )}

      <button type="button" onClick={onBack} className="mb-5 w-full rounded py-3.5 text-sm font-bold text-white" style={{ background: "#0462BA" }}>
        Back to Verification
      </button>

      <details className="rounded-lg border border-[#c5c6cf] bg-[#f7f9fb] p-5 text-left">
        <summary className="cursor-pointer text-[13px] font-semibold text-[#44474e]">
          This isn't the result you expected — other reasons a check can fail
        </summary>
        <div className="mt-3.5 flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-lg text-[#75777f]">edit</span>
            <span className="text-[13px] text-[#44474e]">The certificate ID or link was typed incorrectly.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-lg text-[#75777f]">domain_disabled</span>
            <span className="text-[13px] text-[#44474e]">The issuing institution is no longer accredited on CertiChain.</span>
          </div>
        </div>
      </details>
      {/* ponytail: no institution contact info (email/website) is returned by
          the verify endpoint, so there's nothing to link this to yet. */}
    </main>
  )
}
