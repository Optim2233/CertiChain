"use client"

import { useParams, useRouter } from "next/navigation"
import { useInstitution, useInstitutionDocuments } from "@/features/accreditation"

export default function ReviewDocumentsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: instData } = useInstitution(id)
  const institution = instData?.data
  const { data: docsData, isLoading, isError } = useInstitutionDocuments(id)
  const docs = docsData?.data ?? []
  const unverified = docs.filter((d) => !d.verified).length

  return (
    <main className="w-full px-6 py-8">
      <button
        type="button"
        onClick={() => router.push("/authority/registry")}
        className="mb-4 flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: "#005eb3" }}
      >
        <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
        Back to Registry
      </button>

      <div className="max-w-[800px] rounded-lg border border-[#c5c6cf] bg-white p-8">
        <h2 className="font-heading m-0 mb-4 text-2xl font-bold">Reviewing: {institution?.name ?? "…"}</h2>
        <div className="mb-2 flex h-1.5 overflow-hidden rounded-full" style={{ background: "#e0e3e5" }}>
          <div className="h-full" style={{ width: "50%", background: "#02275A" }} />
        </div>
        <p className="mb-5 text-xs font-bold uppercase tracking-wide text-[#44474e]">Step 1 of 2 — Documents</p>

        {isLoading ? (
          <p className="text-sm text-[#75777f]">Loading documents…</p>
        ) : isError ? (
          <p className="text-sm text-[#C0392B]">
            Couldn&apos;t load documents — you may be signed in with an account that doesn&apos;t have
            accreditation-authority access.
          </p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-[#75777f]">No documents submitted.</p>
        ) : (
          docs.map((d) => (
            <div
              key={d.id}
              className="mb-3 rounded border bg-[#f7f9fb] p-4"
              style={{ borderColor: "#c5c6cf", borderLeftWidth: d.verified ? "1px" : "4px", borderLeftColor: d.verified ? "#c5c6cf" : "#C0392B" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#44474e]">description</span>
                  <span className="font-mono text-sm">{d.fileName}</span>
                </div>
                <span
                  className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold"
                  style={d.verified ? { background: "#e0e3e5", color: "#44474e" } : { background: "#ffdad6", color: "#C0392B" }}
                >
                  <span className="material-symbols-outlined text-sm">{d.verified ? "check" : "priority_high"}</span>
                  {d.verified ? "verified" : "needs check"}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 border-t pt-2.5" style={{ borderColor: "#e2e5f5" }}>
                <span className="material-symbols-outlined text-[15px]" style={{ color: d.verified ? "#0d9668" : "#C0392B" }}>
                  {d.verified ? "check_circle" : "error"}
                </span>
                <span className="text-xs" style={{ color: d.verified ? "#0d9668" : "#C0392B" }}>
                  {d.verified ? "Matches ministry database record" : "No matching ministry record found — verify manually"}
                </span>
              </div>
            </div>
          ))
        )}

        <div className="mt-4 flex justify-end border-t border-[#c5c6cf] pt-4">
          <button
            type="button"
            onClick={() => router.push("/authority/registry/" + id + "/decision")}
            disabled={unverified > 0}
            className="flex items-center gap-2 rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "#02275A" }}
            title={unverified > 0 ? unverified + " document(s) still need verification" : undefined}
          >
            Next: Decision
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </main>
  )
}
