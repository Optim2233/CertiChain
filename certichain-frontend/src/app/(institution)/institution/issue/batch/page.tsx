"use client"

import { useRef, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { StatusBadge } from "@/shared/components/status-badge"
import { useIssueBatch } from "@/features/institution"

export default function BatchIssuePage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const issueBatch = useIssueBatch()

  function pickFile(f: File | null) {
    setFile(f)
    issueBatch.reset()
  }

  function handleSubmit() {
    if (!file) return
    issueBatch.mutate(file)
  }

  const results = issueBatch.data?.data ?? []
  const validCount = results.filter((r) => r.status !== "ERROR" && !r.error).length

  return (
    <div className="mx-auto max-w-2xl p-6">
      <p className="text-muted-foreground mb-1 text-xs">
        <a href="/institution/issue" className="hover:underline">Issue New</a> / Batch issuance
      </p>
      <h1 className="mb-4 font-heading text-xl font-bold">Batch issuance</h1>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const dropped = e.dataTransfer.files?.[0]
          if (dropped) pickFile(dropped)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-primary bg-accent" : "border-border bg-card"
        }`}
      >
        <span className="material-symbols-outlined text-3xl text-muted-foreground">cloud_upload</span>
        <p className="text-sm">
          {file ? file.name : "Drag & drop a CSV or XLSX file, or click to browse"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        {/* ponytail: no backend template endpoint yet, link is inert - wire once one exists */}
        <Button type="button" variant="outline" size="sm" disabled title="No template endpoint yet">
          Download Template
        </Button>
        {file && (
          <Button type="button" variant="ghost" size="sm" onClick={() => pickFile(null)}>
            Re-upload
          </Button>
        )}
      </div>

      {issueBatch.isError && (
        <p className="text-destructive mt-3 text-sm">
          {(issueBatch.error as { message?: string })?.message ?? "Batch upload failed"}
        </p>
      )}

      {results.length > 0 && (
        <div className="border-border bg-card mt-4 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => {
                const isError = r.status === "ERROR" || !!r.error
                return (
                  <TableRow key={r.row ?? i}>
                    <TableCell>{r.row ?? i + 1}</TableCell>
                    <TableCell>
                      <StatusBadge status={isError ? "error" : "valid"} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.error ?? "—"}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Button
        className="mt-4"
        onClick={handleSubmit}
        disabled={!file || issueBatch.isPending}
      >
        {issueBatch.isPending
          ? "Issuing…"
          : results.length > 0
            ? `Issued ${validCount}/${results.length} rows`
            : "Issue All Valid Rows"}
      </Button>
    </div>
  )
}
