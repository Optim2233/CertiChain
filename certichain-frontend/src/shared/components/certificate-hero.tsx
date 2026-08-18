"use client"

import { useState } from "react"
import { toast } from "sonner"

function copyToClipboard(label: string, value: string) {
  navigator.clipboard.writeText(value)
  toast.success(label + " copied")
}

const QR_CELLS = "M0 0h3v3H0zM7 0h3v3H7zM0 7h3v3H0zM4 0h1v1H4zM4 2h1v2H4zM4 5h2v1H4zM4 7h1v3H4zM6 4h1v1H6zM8 4h2v1H8zM6 6h1v4H6zM8 8h2v2H8z"

/**
 * Full navy "certificate card" hero — exact scale from the design: 36/40px
 * padding, 16px radius, 28px/800-weight title, diagonal hatch watermark, a
 * 180px oversized workspace_premium icon, QR block, and registrar signature
 * strip.
 */
export function CertificateHero({
  title,
  institutionName,
  issuedTo,
  issuedAt,
  credentialId,
  hash,
  registrarName,
  registrarTitle,
  revoked,
  revokeReason,
}: {
  title: string
  institutionName?: string | null
  issuedTo?: string | null
  issuedAt?: string | null
  credentialId?: string | null
  hash?: string | null
  registrarName?: string | null
  registrarTitle?: string | null
  revoked?: boolean
  revokeReason?: string | null
}) {
  const [copyLabel, setCopyLabel] = useState("Copy Hash")
  const signOffLabel = (registrarTitle || "Registrar") + (institutionName ? ", " + institutionName : "")

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-9 text-white shadow-[0_12px_32px_rgba(2,39,90,0.3)] sm:p-10"
      style={{ background: "linear-gradient(135deg,#02275A,#0462BA)" }}
    >
      <svg width="100%" height="100%" className="pointer-events-none absolute inset-0" style={{ opacity: 0.12 }}>
        <defs>
          <pattern id="heroLines" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#heroLines)" />
      </svg>
      <span
        className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2"
        style={{ fontSize: 180, opacity: 0.08 }}
      >
        workspace_premium
      </span>

      <div className="relative mb-7 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "radial-gradient(circle at 32% 28%, #c9a85c, #8b6914 75%)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.35)",
            }}
          >
            <span className="material-symbols-outlined" style={{ color: "#0B1E3D" }}>account_balance</span>
          </div>
          <div>
            <p className="font-heading m-0 text-[15px] font-bold">{institutionName || "Issuing institution"}</p>
            <p className="m-0 mt-0.5 text-[11px]" style={{ color: "#d5e3ff", opacity: 0.8 }}>
              Accredited Institution
            </p>
          </div>
        </div>
        {revoked ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ background: "rgba(192,57,43,0.25)", color: "#ffb4a8" }}
          >
            <span className="material-symbols-outlined text-sm">cancel</span>
            Revoked
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ background: "rgba(16,185,129,0.2)", color: "#7ee6c5" }}
          >
            <span className="material-symbols-outlined text-sm">verified</span>
            Verified on Chain
          </span>
        )}
      </div>

      <div className="relative mb-8">
        <p className="font-heading m-0 mb-1.5 text-[28px] font-extrabold leading-tight tracking-tight">{title}</p>
        {issuedTo && (
          <p className="m-0 text-[15px]" style={{ color: "#d5e3ff" }}>
            Issued to {issuedTo}
          </p>
        )}
        {revoked && revokeReason && <p className="mt-2 text-sm text-red-300">Reason: {revokeReason}</p>}
      </div>

      <div className="relative flex items-end justify-between gap-6">
        <div className="flex flex-wrap gap-8">
          {issuedAt && (
            <div>
              <p className="m-0 mb-0.5 text-[11px] uppercase tracking-wide" style={{ color: "#a8c8ff" }}>
                Issue Date
              </p>
              <p className="m-0 text-[13px] font-semibold">{new Date(issuedAt).toLocaleDateString()}</p>
            </div>
          )}
          {credentialId && (
            <div>
              <p className="m-0 mb-0.5 text-[11px] uppercase tracking-wide" style={{ color: "#a8c8ff" }}>
                Credential ID
              </p>
              <p className="m-0 text-[13px] font-semibold">{credentialId}</p>
            </div>
          )}
          {hash && (
            <div>
              <p className="m-0 mb-0.5 whitespace-nowrap text-[11px] uppercase tracking-wide" style={{ color: "#a8c8ff" }}>
                Blockchain Hash
              </p>
              <p className="m-0 whitespace-nowrap font-mono text-xs">{hash}</p>
            </div>
          )}
        </div>
        <div className="shrink-0 rounded-md bg-white p-1.5" style={{ width: 56, height: 56 }}>
          <svg viewBox="0 0 10 10" width="100%" height="100%">
            <rect width="10" height="10" fill="#fff" />
            <path d={QR_CELLS} fill="#02275A" />
          </svg>
        </div>
      </div>

      {(registrarName || hash) && (
        <div className="relative mt-7 flex items-end justify-between border-t border-white/25 pt-3.5">
          <div>
            {registrarName && (
              <div
                className="mb-1 h-3.5 w-[120px] border-b italic"
                style={{ borderColor: "#a8c8ff", fontFamily: "Manrope,sans-serif", fontSize: 14, color: "#d5e3ff" }}
              >
                {registrarName}
              </div>
            )}
            <p className="m-0 text-[11px]" style={{ color: "#a8c8ff" }}>
              {signOffLabel}
            </p>
          </div>
          {hash && (
            <button
              type="button"
              onClick={() => {
                copyToClipboard("Hash", hash)
                setCopyLabel("Copied ✓")
                setTimeout(() => setCopyLabel("Copy Hash"), 1500)
              }}
              className="flex items-center gap-1.5 rounded border border-white/40 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white"
            >
              {copyLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
