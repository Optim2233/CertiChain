"use client"

import { useRef, useState } from "react"
import { useIssueBatch } from "@/features/institution"
import type { BatchIssueResult } from "@/features/institution"
import { API_BASE_URL } from "@/shared/config/axioconfig"

export default function BatchIssuancePage() {
  const issueBatch = useIssueBatch()
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [rowCount, setRowCount] = useState<number | null>(null)
  const [results, setResults] = useState<BatchIssueResult[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(file: File) {
    setResults(null)
    setPendingFile(file)
    // ponytail: only CSV can be row-counted without a parsing dependency -
    // .xlsx still uploads fine, it just skips the row-count preview.
    if (file.name.toLowerCase().endsWith(".csv")) {
      file.text().then((text) => {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
        setRowCount(Math.max(lines.length - 1, 0))
      })
    } else {
      setRowCount(null)
    }
  }

  function confirmIssue() {
    if (!pendingFile) return
    issueBatch.mutate(pendingFile, { onSuccess: (res) => setResults(res.data) })
  }

  function cancelPending() {
    setPendingFile(null)
    setRowCount(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const validCount = results?.filter((r) => r.status !== "error" && !r.error).length ?? 0
  const errorRows = results?.filter((r) => r.status === "error" || r.error) ?? []

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-[#44474e]">
        <span>Issue New</span><span>/</span><span className="font-bold text-[#191c1e]">Batch Issuance</span>
      </div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">Batch Issuance</h2>
          <p className="m-0 text-lg text-[#44474e]">
            Upload multiple credential records simultaneously using a standardized template.
          </p>
        </div>
        <a
          href={`${API_BASE_URL}/api/institution/credentials/batch/template`}
          download
          className="flex shrink-0 items-center gap-2 rounded border border-[#c5c6cf] bg-white px-4 py-2.5 text-sm font-semibold text-[#44474e]"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Download Template
        </a>
      </div>

      <div className="mb-6 rounded-lg border border-[#c5c6cf] bg-white p-8">
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-[#c5c6cf] bg-[#f2f4f6] p-12 text-center"
        >
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.08)]">
            <span className="material-symbols-outlined text-[32px]" style={{ color: "#02275A" }}>cloud_upload</span>
          </div>
          <h3 className="font-heading mb-2 text-xl font-semibold">Drag &amp; Drop your file here</h3>
          <p className="mb-6 text-sm text-[#44474e]">Support for .csv and .xlsx files up to 50MB.</p>
          <button type="button" className="rounded border-2 px-6 py-2.5 text-sm font-semibold" style={{ borderColor: "#02275A", color: "#02275A" }}>
            Browse Files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
          />
        </div>
      </div>

      {pendingFile && !results && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-[#c5c6cf] bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl" style={{ color: "#02275A" }}>description</span>
            <div>
              <p className="m-0 text-sm font-bold">{pendingFile.name}</p>
              <p className="m-0 mt-0.5 text-xs text-[#75777f]">
                {rowCount !== null ? `${rowCount} row${rowCount === 1 ? "" : "s"} detected — nothing issued yet.` : "Ready to upload — nothing issued yet."}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={cancelPending} className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]">
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmIssue}
              disabled={issueBatch.isPending}
              className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#0462BA" }}
            >
              {issueBatch.isPending ? "Issuing…" : "Confirm & Issue on Blockchain"}
            </button>
          </div>
        </div>
      )}

      {issueBatch.isError && (
        <div className="mb-6 flex items-center gap-2.5 rounded border border-[rgba(192,57,43,0.3)] bg-[rgba(192,57,43,0.08)] px-4 py-3.5">
          <span className="material-symbols-outlined" style={{ color: "#C0392B" }}>error</span>
          <p className="m-0 text-sm font-semibold" style={{ color: "#C0392B" }}>
            {issueBatch.error?.message || "Couldn't process this file. Please try again."}
          </p>
        </div>
      )}

      {results && (
        <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
          <div className="flex items-center justify-between border-b border-[#c5c6cf] p-6">
            <div>
              <h3 className="font-heading m-0 text-xl font-semibold">Results: {pendingFile?.name}</h3>
              <p className="m-0 mt-1 text-sm text-[#44474e]">
                {validCount} issued
                {errorRows.length > 0 && <span style={{ color: "#C0392B", fontWeight: 700 }}>, {errorRows.length} error found.</span>}
              </p>
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: "#02275A" }} className="text-xs uppercase tracking-wide text-white">
                <th className="px-4 py-3 text-left">Row</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const isError = r.status === "error" || !!r.error
                return (
                  <tr key={i} className="border-b border-[#c5c6cf]" style={{ background: isError ? "#fff6f5" : "#fff" }}>
                    <td className="px-4 py-2.5 text-xs text-[#44474e]">{r.row ?? i + 1}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={isError ? { background: "#ffdad6", color: "#C0392B" } : { background: "rgba(16,185,129,0.1)", color: "#0d9668" }}
                      >
                        <span className="material-symbols-outlined text-[14px]">{isError ? "error" : "check_circle"}</span>
                        {isError ? "Error" : "Issued"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-[#44474e]">{r.error ?? "Ready to issue"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-[#c5c6cf] bg-[#f7f9fb] p-6">
            <span className="text-sm text-[#44474e]">Showing {results.length} rows</span>
            <span className="flex items-center gap-2 text-sm font-bold" style={{ color: "#0d9668" }}>
              <span className="material-symbols-outlined text-lg">check_circle</span>
              {validCount} credentials issued on-chain
            </span>
          </div>
        </div>
      )}
    </main>
  )
}
