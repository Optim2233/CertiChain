"use client"

import { useRef, useState } from "react"
import { useVerifyBulk } from "@/features/verifier"
import type { BulkVerifyRow } from "@/features/verifier"

const RESULT_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  VERIFIED: { bg: "rgba(16,185,129,0.1)", color: "#0d9668", icon: "check_circle", label: "Verified" },
  REVOKED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: "Revoked" },
  EXPIRED: { bg: "#fff3d6", color: "#a5730f", icon: "schedule", label: "Expired" },
  INVALID_NOT_FOUND: { bg: "#ffdad6", color: "#C0392B", icon: "error", label: "Not Found" },
  SHARE_REVOKED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: "Share Revoked" },
}

export default function BulkVerifyPage() {
  const verifyBulk = useVerifyBulk()
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<BulkVerifyRow[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setFileName(file.name)
    verifyBulk.mutate(file, { onSuccess: ({ data }) => setRows(data) })
  }

  const verifiedCount = rows?.filter((r) => r.result === "VERIFIED").length ?? 0
  const flaggedCount = (rows?.length ?? 0) - verifiedCount

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="m-0 mb-1.5 text-xs font-bold uppercase tracking-wide text-[#75777f]">For Employers &amp; Background Checkers</p>
          <h1 className="font-heading m-0 mb-2 text-[32px] font-extrabold">Bulk Verify Candidates</h1>
          <p className="m-0 max-w-[560px] text-[15px] text-[#44474e]">
            Upload a spreadsheet of candidate certificate IDs to verify an entire hiring pipeline at once.
          </p>
        </div>
        {/* ponytail: no API docs page exists (no OpenAPI/Swagger route mounted),
            so the button was removed rather than linking nowhere. */}
      </div>

      <div className="mb-6 rounded-lg border border-[#c5c6cf] bg-white p-8">
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-[#c5c6cf] bg-[#f7f9fb] p-10 text-center"
        >
          <div className="mb-3.5 flex size-14 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.08)]">
            <span className="material-symbols-outlined text-[28px]" style={{ color: "#02275A" }}>cloud_upload</span>
          </div>
          <h3 className="font-heading mb-1.5 text-lg font-semibold">Drag &amp; drop a candidate list</h3>
          <p className="m-0 mb-5 text-[13px] text-[#44474e]">.csv or .xlsx, one certificate ID or link per row, up to 500 rows.</p>
          <button type="button" className="rounded border-2 px-5 py-2.5 text-[13px] font-semibold" style={{ borderColor: "#02275A", color: "#02275A" }}>
            Browse Files
          </button>
          <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      </div>

      {fileName && rows && (
        <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
          <div className="flex items-center justify-between border-b border-[#c5c6cf] px-6 py-5">
            <div>
              <h3 className="font-heading m-0 text-lg font-semibold">Results: {fileName}</h3>
              <p className="m-0 mt-1 text-[13px] text-[#44474e]">
                {rows.length} of {rows.length} checked ·{" "}
                <span style={{ color: "#0d9668", fontWeight: 700 }}>{verifiedCount} verified</span> ·{" "}
                <span style={{ color: "#C0392B", fontWeight: 700 }}>{flaggedCount} flagged</span>
              </p>
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: "#02275A" }} className="text-xs uppercase tracking-wide text-white">
                <th className="px-6 py-3 text-left">Candidate ID</th>
                <th className="px-4 py-3 text-left">Credential</th>
                <th className="px-4 py-3 text-left">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const style = RESULT_STYLE[r.result]
                return (
                  <tr key={i} className="border-b border-[#c5c6cf]" style={{ background: r.result === "VERIFIED" ? "#fff" : "#fff6f5" }}>
                    <td className="px-6 py-3 font-mono text-[13px] text-[#44474e]">{r.input}</td>
                    <td className="px-4 py-3 text-[13px] text-[#44474e]">{r.credentialTitle ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: style.bg, color: style.color }}>
                        <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                        {style.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
