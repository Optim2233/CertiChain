"use client"

import { useRef, useState } from "react"
import { useIssueBatch } from "@/features/institution"
import type { BatchIssueResult } from "@/features/institution"
import { apiClient } from "@/shared/config/axioconfig"
import { SpreadsheetPreview } from "@/shared/components/spreadsheet-preview"

export default function BatchIssuancePage() {
  const issueBatch = useIssueBatch()
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [rowCount, setRowCount] = useState<number | null>(null)
  const [results, setResults] = useState<BatchIssueResult[] | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetches the template as a Blob and saves it via a throwaway object URL, instead of a
  // plain <a href download> - a navigable download URL is exactly what download-manager
  // tools (IDM etc.) hook into. A Blob URL created client-side from a fetch response isn't
  // a network request they see.
  async function downloadTemplate() {
    setDownloadingTemplate(true)
    try {
      const { blob, fileName } = await apiClient.getBlob("/api/institution/credentials/batch/template")
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName ?? "batch-template.csv"
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingTemplate(false)
    }
  }

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
      <div className="mb-6">
        <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">Batch Issuance</h2>
        <p className="m-0 text-lg text-[#44474e]">
          Upload multiple credential records simultaneously using a standardized template.
        </p>
      </div>

      <div className="mb-6 rounded-lg border-2 p-6" style={{ borderColor: "#0462BA", background: "#eef5fc" }}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading m-0 mb-1 text-xl font-bold" style={{ color: "#02275A" }}>
              Expected file format
            </h3>
            <p className="m-0 text-sm text-[#44474e]">
              Each row issues one credential — a certificate or an activity record, set per row via an
              optional <code className="rounded bg-white px-1 py-0.5 font-mono">type</code> column. The first
              column must be <code className="rounded bg-white px-1 py-0.5 font-mono">graduate_email</code> —
              every other column becomes a credential field, named exactly as its header.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            disabled={downloadingTemplate}
            className="flex shrink-0 items-center gap-2 rounded px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "#0462BA" }}
          >
            <span className="material-symbols-outlined text-lg">download</span>
            {downloadingTemplate ? "Downloading…" : "Download Template"}
          </button>
        </div>

        <ul className="mb-5 list-disc space-y-1 pl-5 text-sm text-[#44474e]">
          <li><code className="rounded bg-white px-1 py-0.5 font-mono">graduate_email</code> is required in every row — one recipient per row.</li>
          <li>
            <code className="rounded bg-white px-1 py-0.5 font-mono">type</code> is optional —
            {" "}<code className="rounded bg-white px-1 py-0.5 font-mono">certificate</code> or{" "}
            <code className="rounded bg-white px-1 py-0.5 font-mono">activity_record</code>, per row. Leave it out
            (or blank) and the row is issued as a certificate.
          </li>
          <li>Any other column header becomes a credential field; the header text is used as the field name exactly as typed (case-sensitive).</li>
          <li>At least one field column besides <code className="rounded bg-white px-1 py-0.5 font-mono">graduate_email</code> and <code className="rounded bg-white px-1 py-0.5 font-mono">type</code> is required.</li>
          <li>
            <code className="rounded bg-white px-1 py-0.5 font-mono">expires_at</code> is optional —
            a date (<code className="rounded bg-white px-1 py-0.5 font-mono">YYYY-MM-DD</code>) after which the
            credential is no longer valid. Leave it blank and the credential never expires.
          </li>
          <li>Column headers must be non-empty and unique — if a header repeats, only the last one is kept.</li>
          <li>A cell can be left blank if that field doesn&apos;t apply to a particular row — it&apos;s issued as an empty value, the row isn&apos;t rejected.</li>
          <li>Avoid commas inside cell values — quoted values aren&apos;t supported yet.</li>
        </ul>

        <div className="space-y-5">
          <div>
            <p className="m-0 mb-1.5 text-xs font-semibold text-[#44474e]">Example 1 — standard degree certificate</p>
            <SpreadsheetPreview
              columns={["graduate_email", "degree", "graduationDate"]}
              rows={[
                ["thura.htet@example.edu", "BSc Computer Science", "2026-06-01"],
                ["mya.thin@example.edu", "BEng Civil Engineering", "2026-06-01"],
              ]}
            />
          </div>
          <div>
            <p className="m-0 mb-1.5 text-xs font-semibold text-[#44474e]">
              Example 2 — degree with an extra honors field (row 2&apos;s honors is left blank — that&apos;s fine)
            </p>
            <SpreadsheetPreview
              columns={["graduate_email", "degree", "graduationDate", "honors"]}
              rows={[
                ["aung.htoo@example.edu", "BSc Data Science", "2026-06-01", "Summa Cum Laude"],
                ["su.su@example.edu", "BSc Data Science", "2026-06-01", ""],
              ]}
            />
          </div>
          <div>
            <p className="m-0 mb-1.5 text-xs font-semibold text-[#44474e]">
              Example 2b — activity record with an optional expiry (leadership role that lapses)
            </p>
            <SpreadsheetPreview
              columns={["graduate_email", "type", "activity", "date", "expires_at"]}
              rows={[
                ["thiha.zaw@example.edu", "activity_record", "Student Council President", "2026-01-10", "2026-12-31"],
              ]}
            />
          </div>
          <div>
            <p className="m-0 mb-1.5 text-xs font-semibold text-[#44474e]">Example 3 — professional certification (different field set)</p>
            <SpreadsheetPreview
              columns={["graduate_email", "certification_name", "issuedDate", "score"]}
              rows={[
                ["zin.ko@example.edu", "Certified Network Associate", "2026-05-15", "92"],
              ]}
            />
          </div>
          <div>
            <p className="m-0 mb-1.5 text-xs font-semibold text-[#44474e]">
              Example 4 — mixing certificates and activity records in one file via the type column
            </p>
            <SpreadsheetPreview
              columns={["graduate_email", "type", "degree", "activity", "date"]}
              rows={[
                ["hla.hla@example.edu", "certificate", "BSc Mechanical Engineering", "", ""],
                ["hla.hla@example.edu", "activity_record", "", "Dean's List — Fall 2026", "2026-12-15"],
              ]}
            />
          </div>
        </div>
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
