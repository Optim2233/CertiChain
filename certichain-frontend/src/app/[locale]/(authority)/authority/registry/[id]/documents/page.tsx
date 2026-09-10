"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { InstitutionFacts, useInstitution, useInstitutionDocuments, useVerifyDocument } from "@/features/accreditation"
import type { InstitutionDetail } from "@/features/accreditation/types/types"
import { apiClient } from "@/shared/config/axioconfig"
import { Skeleton } from "@/shared/components/ui/skeleton"

function isPdf(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf")
}

/** Files uploaded via the remodeled form live encrypted in a private Supabase bucket,
 *  referenced by storage path (not a public URL) on the institution row - not as
 *  verifiable `institution_document` rows. They are still submitted documents, so they
 *  join the selectable list and preview via the same decrypt-on-fetch endpoint as
 *  InstitutionDocument rows. Informational only: they never block the Next step (no
 *  verified flag). */
function submittedUrlFiles(
  inst: InstitutionDetail | undefined,
  t: (key: string) => string,
): { key: string; label: string }[] {
  if (!inst) return []
  return [
    { key: "establishment", label: t("establishmentFile"), present: !!inst.establishmentDocUrl },
    { key: "dica", label: t("dicaFile"), present: !!inst.dicaCertificateUrl },
    { key: "tax", label: t("taxFile"), present: !!inst.taxClearanceUrl },
    { key: "mic", label: t("micFile"), present: !!inst.micPermitUrl },
  ].filter((f) => f.present).map(({ key, label }) => ({ key, label }))
}

export default function ReviewDocumentsPage() {
  const t = useTranslations("authority")
  const tc = useTranslations("common")
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: instData } = useInstitution(id)
  const institution = instData?.data
  const { data: docsData, isLoading, isError } = useInstitutionDocuments(id)
  const docs = docsData?.data ?? []
  const unverified = docs.filter((d) => !d.verified).length

  const verifyDocument = useVerifyDocument()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const confirmingDoc = docs.find((d) => d.id === confirmingId) ?? null
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedUrlKey, setSelectedUrlKey] = useState<string | null>(null)
  const urlFiles = useMemo(() => submittedUrlFiles(institution, t), [institution, t])
  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null
  const selectedUrlFile = urlFiles.find((f) => f.key === selectedUrlKey) ?? null
  const hasAny = docs.length > 0 || urlFiles.length > 0
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  function confirmVerify() {
    if (!confirmingId) return
    verifyDocument.mutate(
      { institutionId: id, documentId: confirmingId },
      { onSuccess: () => setConfirmingId(null) }
    )
  }

  // Fetches the file as a Blob and saves it via a throwaway object URL, instead of a plain
  // <a href> - a navigable download URL is exactly what download-manager tools (IDM etc.)
  // hook into. A Blob URL created client-side from a fetch response isn't a network request
  // they see.
  async function downloadDocument(documentId: string, fallbackName: string) {
    setDownloadingId(documentId)
    try {
      const { blob, fileName } = await apiClient.getBlob(
        `/api/aa/institutions/${id}/documents/${documentId}`
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName ?? fallbackName
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setDownloadingId(null)
    }
  }

  // Selecting a PDF fetches it once for the preview pane; the resulting blob URL is only
  // ever used for the <iframe src> below, revoked by the cleanup effect whenever it changes.
  // URL files (Supabase-backed docs) go through the same decrypt-on-fetch endpoint -
  // they're encrypted at rest, so there's no plaintext URL to preview directly.
  function selectDocument(documentId: string, fileName: string) {
    if (documentId === selectedId) return // already showing - skip the redundant re-fetch
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setSelectedId(documentId)
    setSelectedUrlKey(null)
    setPreviewError(false)
    if (!isPdf(fileName)) return
    setPreviewLoading(true)
    apiClient
      .getBlob(`/api/aa/institutions/${id}/documents/${documentId}`)
      .then(({ blob }) => setPreviewUrl(URL.createObjectURL(blob)))
      .catch(() => setPreviewError(true))
      .finally(() => setPreviewLoading(false))
  }

  function selectUrlFile(key: string) {
    if (key === selectedUrlKey) return
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setSelectedUrlKey(key)
    setSelectedId(null)
    setPreviewError(false)
    setPreviewLoading(true)
    apiClient
      .getBlob(`/api/aa/institutions/${id}/documents/url/${key}`)
      .then(({ blob }) => setPreviewUrl(URL.createObjectURL(blob)))
      .catch(() => setPreviewError(true))
      .finally(() => setPreviewLoading(false))
  }

  async function downloadUrlFile(key: string, fallbackName: string) {
    setDownloadingId(key)
    try {
      const { blob, fileName } = await apiClient.getBlob(`/api/aa/institutions/${id}/documents/url/${key}`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName ?? fallbackName
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setDownloadingId(null)
    }
  }

  // Reviewing a document's submitted proof is the point of this page - show it immediately
  // rather than making the reviewer click the filename first.
  useEffect(() => {
    if (selectedId === null && selectedUrlKey === null) {
      if (docs.length > 0) selectDocument(docs[0].id, docs[0].fileName)
      else if (urlFiles.length > 0) selectUrlFile(urlFiles[0].key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, urlFiles])

  // Object URLs aren't garbage-collected on their own - without this, every document click
  // leaks a blob for the rest of the session.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <main className="w-full px-6 py-8">
      <button
        type="button"
        onClick={() => router.push("/authority/registry")}
        className="mb-4 flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: "#005eb3" }}
      >
        <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
        {t("backToRegistry")}
      </button>

      <div className="flex items-start gap-6">
        <div className="w-full max-w-[480px] shrink-0 rounded-lg border border-[#c5c6cf] bg-white p-8">
          <h2 className="font-heading m-0 mb-4 text-2xl font-bold">{t("reviewing", { name: institution?.name ?? "…" })}</h2>
          <div className="mb-2 flex h-1.5 overflow-hidden rounded-full" style={{ background: "#e0e3e5" }}>
            <div className="h-full" style={{ width: "50%", background: "#02275A" }} />
          </div>
          <p className="mb-5 text-xs font-bold uppercase tracking-wide text-[#44474e]">{t("stepDocs")}</p>

          {institution && <InstitutionFacts institution={institution} />}

          {isLoading ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-[#C0392B]">
              {t("loadFailed")}
            </p>
          ) : !hasAny ? (
            <p className="text-sm text-[#75777f]">{t("noDocuments")}</p>
          ) : (
            <>
            {docs.map((d) => (
              <div
                key={d.id}
                className="mb-3 rounded border bg-[#f7f9fb] p-4"
                style={{
                  borderColor: d.id === selectedId ? "#02275A" : "#c5c6cf",
                  borderLeftWidth: d.verified ? "1px" : "4px",
                  borderLeftColor: d.verified ? "#c5c6cf" : "#C0392B",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#44474e]">description</span>
                    <button
                      type="button"
                      onClick={() => selectDocument(d.id, d.fileName)}
                      className="font-mono text-sm underline"
                      style={{ color: "#005eb3" }}
                    >
                      {d.fileName}
                    </button>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold"
                    style={d.verified ? { background: "#e0e3e5", color: "#44474e" } : { background: "#ffdad6", color: "#C0392B" }}
                  >
                    <span className="material-symbols-outlined text-sm">{d.verified ? "check" : "priority_high"}</span>
                    {d.verified ? t("verified") : t("needsCheck")}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t pt-2.5" style={{ borderColor: "#e2e5f5" }}>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]" style={{ color: d.verified ? "#0d9668" : "#C0392B" }}>
                      {d.verified ? "check_circle" : "error"}
                    </span>
                    <span className="text-xs" style={{ color: d.verified ? "#0d9668" : "#C0392B" }}>
                      {d.verified ? t("ministryMatch") : t("ministryNoMatch")}
                    </span>
                  </div>
                  {!d.verified && (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(d.id)}
                      className="rounded border px-3 py-1 text-xs font-semibold"
                      style={{ borderColor: "#02275A", color: "#02275A" }}
                    >
                      {t("verify")}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {urlFiles.length > 0 && (
              <div className="mt-3">
                <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide text-[#75777f]">{t("submittedFiles")}</p>
                <div className="flex flex-col gap-2">
                  {urlFiles.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => selectUrlFile(f.key)}
                      className="flex items-center justify-between gap-3 rounded border bg-[#f7f9fb] p-3 text-left text-sm"
                      style={{ borderColor: f.key === selectedUrlKey ? "#02275A" : "#c5c6cf" }}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="material-symbols-outlined shrink-0 text-[#44474e]">description</span>
                        <span className="font-semibold" style={{ color: "#005eb3" }}>{f.label}</span>
                      </span>
                      <span className="material-symbols-outlined shrink-0 text-[18px]" style={{ color: "#005eb3" }}>
                        {f.key === selectedUrlKey ? "visibility" : "open_in_new"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            </>
          )}

          <div className="mt-4 flex justify-end border-t border-[#c5c6cf] pt-4">
            <button
              type="button"
              onClick={() => router.push("/authority/registry/" + id + "/decision")}
              disabled={unverified > 0}
              className="flex items-center gap-2 rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#02275A" }}
              title={unverified > 0 ? t("docsTooltip", { n: unverified }) : undefined}
            >
              {t("nextDecision")}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>

        <div className="sticky top-8 flex h-[calc(100vh-8rem)] min-w-0 flex-1 flex-col rounded-lg border border-[#c5c6cf] bg-white">
          {selectedUrlFile ? (
            <>
              <div className="flex items-center justify-between border-b border-[#c5c6cf] px-5 py-3">
                <span className="truncate font-mono text-sm text-[#191c1e]">{selectedUrlFile.label}</span>
                <button
                  type="button"
                  onClick={() => downloadUrlFile(selectedUrlFile.key, selectedUrlFile.label)}
                  disabled={downloadingId === selectedUrlFile.key}
                  className="flex shrink-0 items-center gap-1.5 rounded border border-[#c5c6cf] bg-white px-3 py-1.5 text-xs font-semibold text-[#44474e] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  {downloadingId === selectedUrlFile.key ? tc("downloading") : tc("download")}
                </button>
              </div>
              {previewLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <div
                    className="size-8 animate-spin rounded-full border-4 border-[#e0e3e5]"
                    style={{ borderTopColor: "#02275A" }}
                  />
                  <p className="m-0 text-sm text-[#75777f]">{t("previewLoading")}</p>
                </div>
              ) : previewError ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <p className="m-0 text-sm text-[#C0392B]">{t("previewFailed")}</p>
                </div>
              ) : previewUrl ? (
                <iframe src={previewUrl} title={selectedUrlFile.label} className="min-h-0 flex-1 rounded-b-lg" />
              ) : null}
            </>
          ) : !selectedDoc ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <p className="m-0 text-sm text-[#75777f]">{t("selectDocPreview")}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[#c5c6cf] px-5 py-3">
                <span className="truncate font-mono text-sm text-[#191c1e]">{selectedDoc.fileName}</span>
                <button
                  type="button"
                  onClick={() => downloadDocument(selectedDoc.id, selectedDoc.fileName)}
                  disabled={downloadingId === selectedDoc.id}
                  className="flex shrink-0 items-center gap-1.5 rounded border border-[#c5c6cf] bg-white px-3 py-1.5 text-xs font-semibold text-[#44474e] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  {downloadingId === selectedDoc.id ? tc("downloading") : tc("download")}
                </button>
              </div>

              {!isPdf(selectedDoc.fileName) ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-[#75777f]">visibility_off</span>
                  <p className="m-0 text-sm text-[#75777f]">
                    {t("previewUnavailable")}
                  </p>
                </div>
              ) : previewLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <div
                    className="size-8 animate-spin rounded-full border-4 border-[#e0e3e5]"
                    style={{ borderTopColor: "#02275A" }}
                  />
                  <p className="m-0 text-sm text-[#75777f]">{t("previewLoading")}</p>
                </div>
              ) : previewError ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <p className="m-0 text-sm text-[#C0392B]">{t("previewFailed")}</p>
                </div>
              ) : previewUrl ? (
                <iframe src={previewUrl} title={selectedDoc.fileName} className="min-h-0 flex-1 rounded-b-lg" />
              ) : null}
            </>
          )}
        </div>
      </div>

      {confirmingDoc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">{t("verifyDocTitle")}</h3>
            <p className="mb-5 text-sm text-[#44474e]">
              {t("verifyDocWarn", { file: confirmingDoc.fileName })}
            </p>
            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingId(null)}
                className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={confirmVerify}
                disabled={verifyDocument.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#02275A" }}
              >
                {verifyDocument.isPending ? t("verifying") : t("verify")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
