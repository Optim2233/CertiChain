"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { useInstitution, useInstitutionDocuments, useReinstateInstitution, useRevokeInstitution, useSuspendInstitution } from "@/features/accreditation"
import type { InstitutionDetail, RegistrationPerson } from "@/features/accreditation/types/types"
import { apiClient } from "@/shared/config/axioconfig"
import { Skeleton } from "@/shared/components/ui/skeleton"

function isPdf(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf")
}

function fmtDate(iso: string | null, locale: string) {
  return iso ? new Date(iso).toLocaleDateString(locale) : "—"
}

/** Parses the JSONB people columns (founders array / administrator object) defensively. */
function parsePeople(raw: string | null | undefined): RegistrationPerson[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as RegistrationPerson[]
    if (parsed && typeof parsed === "object") {
      const obj = parsed as RegistrationPerson
      return obj.fullName ? [obj] : []
    }
  } catch {
    // malformed JSON submitted pre-validation — show nothing rather than crash the dossier
  }
  return []
}

function joinAddress(parts: (string | null | undefined)[]) {
  const kept = parts.filter((p): p is string => !!p && p.trim().length > 0)
  return kept.length > 0 ? kept.join(", ") : null
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 border-b border-[#eef0f3] pb-2.5 text-sm last:border-0">
      <span className="shrink-0 text-[#75777f]">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t border-[#eef0f3] pt-6">
      <h3 className="font-heading m-0 mb-4 text-lg font-bold">{title}</h3>
      {children}
    </div>
  )
}

type TFn = (key: string) => string

/** Full application dossier from the remodeled registration form. Sections render
 *  only when the institution actually submitted that track's data. */
function ApplicationDossier({
  institution: inst,
  t,
  locale,
}: {
  institution: InstitutionDetail
  t: TFn
  locale: string
}) {
  const address = joinAddress([inst.street, inst.ward, inst.township, inst.district, inst.stateRegion, inst.postalCode])
  const founders = parsePeople(inst.founders)
  const admins = parsePeople(inst.administrator)
  const submittedFiles = [
    { label: t("establishmentFile"), url: inst.establishmentDocUrl },
    { label: t("dicaFile"), url: inst.dicaCertificateUrl },
    { label: t("taxFile"), url: inst.taxClearanceUrl },
    { label: t("micFile"), url: inst.micPermitUrl },
  ].filter((f): f is { label: string; url: string } => !!f.url)
  const hasApplication = inst.institutionType ?? inst.institutionNameMm ?? inst.institutionCategory ?? address
  const isPublic = inst.institutionType === "public"
  const hasEstablishment = inst.yearEstablished ?? inst.establishmentDocType ?? inst.establishmentDocTitle ?? inst.establishmentDocRef ?? inst.establishmentDocIssueDate
  const hasBusiness = inst.companyName ?? inst.dicaCertificateNumber ?? inst.mycoRegistrationNumber ?? inst.tinNumber ?? inst.incorporationDate ?? inst.ownershipStructure ?? inst.investmentAmount ?? inst.foreignInvolvement ?? inst.micPermitNumber

  return (
    <>
      {hasApplication && (
        <Section title={t("application")}>
          <div className="flex flex-col gap-3.5">
            <Row label={t("instType")} value={inst.institutionType ?? "—"} />
            {inst.institutionNameMm && <Row label={t("nameMm")} value={inst.institutionNameMm} />}
            {inst.institutionCategory && <Row label={t("category")} value={inst.institutionCategory} />}
            {address && <Row label={t("address")} value={address} />}
          </div>
        </Section>
      )}

      {isPublic && hasEstablishment && (
        <Section title={t("establishment")}>
          <div className="flex flex-col gap-3.5">
            {inst.yearEstablished != null && <Row label={t("yearEstablished")} value={String(inst.yearEstablished)} />}
            {inst.establishmentDocType && <Row label={t("docType")} value={inst.establishmentDocType} />}
            {inst.establishmentDocTitle && <Row label={t("docTitle")} value={inst.establishmentDocTitle} />}
            {inst.establishmentDocRef && <Row label={t("docRef")} value={inst.establishmentDocRef} />}
            {inst.establishmentDocIssueDate && <Row label={t("docIssueDate")} value={fmtDate(inst.establishmentDocIssueDate, locale)} />}
          </div>
        </Section>
      )}

      {!isPublic && hasBusiness && (
        <Section title={t("business")}>
          <div className="flex flex-col gap-3.5">
            {inst.companyName && <Row label={t("companyName")} value={inst.companyName} />}
            {inst.dicaCertificateNumber && <Row label={t("dicaNumber")} value={inst.dicaCertificateNumber} />}
            {inst.mycoRegistrationNumber && <Row label={t("mycoNumber")} value={inst.mycoRegistrationNumber} />}
            {inst.tinNumber && <Row label={t("tinNumber")} value={inst.tinNumber} />}
            {inst.incorporationDate && <Row label={t("incorporationDate")} value={fmtDate(inst.incorporationDate, locale)} />}
            {inst.ownershipStructure && <Row label={t("ownership")} value={inst.ownershipStructure} />}
            {inst.investmentAmount != null && <Row label={t("investment")} value={String(inst.investmentAmount)} />}
            {inst.foreignInvolvement != null && <Row label={t("foreignInvolvement")} value={inst.foreignInvolvement ? t("yes") : t("no")} />}
            {inst.micPermitNumber && <Row label={t("micPermit")} value={inst.micPermitNumber} />}
          </div>
        </Section>
      )}

      {(founders.length > 0 || admins.length > 0) && (
        <Section title={t("people")}>
          <div className="flex flex-col gap-3">
            {founders.length > 0 && (
              <div>
                <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide text-[#75777f]">{t("founders")}</p>
                <div className="flex flex-col gap-2">
                  {founders.map((p, i) => (
                    <PersonCard key={i} person={p} t={t} />
                  ))}
                </div>
              </div>
            )}
            {admins.length > 0 && (
              <div>
                <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide text-[#75777f]">{t("administrator")}</p>
                <div className="flex flex-col gap-2">
                  {admins.map((p, i) => (
                    <PersonCard key={i} person={p} t={t} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {submittedFiles.length > 0 && (
        <Section title={t("submittedFiles")}>
          <div className="flex flex-col gap-2.5">
            {submittedFiles.map((f) => (
              <a
                key={f.label}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded border border-[#c5c6cf] bg-[#f7f9fb] p-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="material-symbols-outlined shrink-0 text-[#44474e]">description</span>
                  <span className="font-semibold" style={{ color: "#005eb3" }}>{f.label}</span>
                </span>
                <span className="material-symbols-outlined shrink-0 text-[18px]" style={{ color: "#005eb3" }}>open_in_new</span>
              </a>
            ))}
          </div>
        </Section>
      )}
    </>
  )
}

function PersonCard({ person, t }: { person: RegistrationPerson; t: TFn }) {
  const sub = [person.nrcOrPassport, person.phone, person.email].filter(Boolean).join(" · ")
  return (
    <div className="rounded border border-[#eef0f3] bg-[#f7f9fb] p-3 text-sm">
      <p className="m-0 font-semibold">{person.fullName ?? t("unnamed")}</p>
      {person.fullNameMyanmar && <p className="m-0 mt-0.5 text-[#44474e]">{person.fullNameMyanmar}</p>}
      {sub && <p className="m-0 mt-1 font-mono text-xs text-[#44474e]">{sub}</p>}
      {person.educationalQualification && <p className="m-0 mt-1 text-xs text-[#75777f]">{person.educationalQualification}</p>}
    </div>
  )
}

export default function InstitutionDetailPage() {
  const t = useTranslations("authority")
  const tc = useTranslations("common")
  const locale = useLocale()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading } = useInstitution(id)
  const institution = data?.data
  const { data: docsData } = useInstitutionDocuments(id)
  const docs = docsData?.data ?? []

  const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
    PENDING: { bg: "#e0e3e5", color: "#44474e", icon: "schedule", label: t("pendingReview") },
    APPROVED: { bg: "#d8e2ff", color: "#02275A", icon: "check_circle", label: t("approved") },
    SUSPENDED: { bg: "#eef0f3", color: "#75777f", icon: "pause_circle", label: t("suspended") },
    REJECTED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: tc("rejected") },
    REVOKED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", label: t("revoked") },
  }

  const reinstate = useReinstateInstitution()
  const revoke = useRevokeInstitution()
  const suspend = useSuspendInstitution()

  const [modalType, setModalType] = useState<"revoke" | "suspend" | null>(null)
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const reasonValid = reason.trim().length > 0
  const showError = touched && !reasonValid

  const [copied, setCopied] = useState(false)

  // --- PDF preview (blob -> object URL -> iframe), lifted from the [id]/documents page ---
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function downloadDocument(documentId: string, fallbackName: string) {
    setDownloadingId(documentId)
    try {
      const { blob, fileName } = await apiClient.getBlob(`/api/aa/institutions/${id}/documents/${documentId}`)
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

  function selectDocument(documentId: string, fileName: string) {
    if (documentId === selectedId) return
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setSelectedId(documentId)
    setPreviewError(false)
    if (!isPdf(fileName)) return
    setPreviewLoading(true)
    apiClient
      .getBlob(`/api/aa/institutions/${id}/documents/${documentId}`)
      .then(({ blob }) => setPreviewUrl(URL.createObjectURL(blob)))
      .catch(() => setPreviewError(true))
      .finally(() => setPreviewLoading(false))
  }

  // Auto-select the first document so the preview isn't blank on arrival.
  useEffect(() => {
    if (selectedId === null && docs.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      selectDocument(docs[0].id, docs[0].fileName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs])

  // Object URLs aren't GC'd on their own - revoke on change/unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function confirmModalAction() {
    setTouched(true)
    if (!reasonValid) return
    const mutation = modalType === "suspend" ? suspend : revoke
    mutation.mutate({ id, reason }, { onSuccess: () => { setModalType(null); setReason(""); setTouched(false) } })
  }

  function copyKey(value: string) {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500) }
    try {
      navigator.clipboard.writeText(value).then(done, done)
    } catch {
      done()
    }
  }

  if (isLoading || !institution)
    return (
      <main className="w-full px-6 py-8" aria-busy="true">
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="flex items-start gap-6">
          <div className="w-full max-w-[520px] shrink-0">
            <Skeleton className="mb-3 h-8 w-2/3" />
            <Skeleton className="mb-8 h-4 w-1/3" />
            <Skeleton className="mb-4 h-[200px] rounded-lg" />
            <Skeleton className="h-[140px] rounded-lg" />
          </div>
          <Skeleton className="hidden h-[calc(100vh-8rem)] flex-1 rounded-lg lg:block" />
        </div>
      </main>
    )

  const style = STATUS_STYLE[institution.status]
  const hasDocs = docs.length > 0

  return (
    <main className="w-full px-6 py-8">
      <button type="button" onClick={() => router.push("/authority/registry")} className="mb-4 flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#005eb3" }}>
        <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
        {t("backToRegistry")}
      </button>

      <div className={hasDocs ? "flex items-start gap-6" : "mx-auto max-w-[760px]"}>
        {/* LEFT — dossier */}
        <div className={hasDocs ? "w-full max-w-[520px] shrink-0" : "w-full"}>
          <div className="rounded-lg border border-[#c5c6cf] bg-white p-8">
            {/* Identity header */}
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#02275A]">
                {institution.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={institution.profileImageUrl} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[26px] text-white">account_balance</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading m-0 mb-1 text-[28px] font-bold leading-tight">{institution.name}</h2>
                <p className="m-0 text-sm text-[#44474e]">{institution.ministry}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide" style={{ background: style.bg, color: style.color }}>
                  <span className="material-symbols-outlined text-sm">{style.icon}</span>
                  {style.label}
                </span>
              </div>
            </div>

            {institution.brandColor && (
              <div className="mt-4 flex items-center gap-2.5 text-sm">
                <span className="size-5 shrink-0 rounded border border-[#c5c6cf]" style={{ background: institution.brandColor }} />
                <span className="font-mono text-[#44474e]">{institution.brandColor}</span>
                <span className="text-[#75777f]">· {institution.accentPattern} watermark</span>
              </div>
            )}

            {/* Registration details */}
            <Section title={t("regDetails")}>
              <div className="flex flex-col gap-3.5">
                <Row label={t("ministryRef")} value={institution.ministry} />
                <Row label={t("contactEmail")} value={institution.contactEmail ?? "—"} />
                <Row label={t("phone")} value={institution.phone ?? "—"} />
                <Row
                  label={t("website")}
                  value={
                    institution.website ? (
                      <a href={institution.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ color: "#005eb3" }}>
                        {institution.website.replace(/^https?:\/\//, "")}
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      </a>
                    ) : "—"
                  }
                />
                <Row label={t("applied")} value={fmtDate(institution.appliedAt, locale)} />
                <Row label={t("decided")} value={fmtDate(institution.decidedAt, locale)} />
                {institution.contactSince && <Row label={t("accountCreated")} value={fmtDate(institution.contactSince, locale)} />}
              </div>
              {institution.statusReason && (
                <div className="mt-3.5 rounded border border-[#c5c6cf] bg-[#f7f9fb] p-4 text-sm">
                  <p className="m-0 mb-1 text-xs text-[#75777f]">{t("statusReason")}</p>
                  <p className="m-0 font-semibold">{institution.statusReason}</p>
                </div>
              )}
            </Section>

            {/* Remodeled application dossier (V18) — everything the institution submitted */}
            <ApplicationDossier institution={institution} t={t} locale={locale} />

            {/* Signing key */}
            {institution.publicKey && (
              <Section title={t("signingKey")}>
                <div className="flex flex-col gap-3.5">
                  <div className="border-b border-[#eef0f3] pb-2.5 text-sm">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[#75777f]">{t("publicKey")}</span>
                      <button
                        type="button"
                        onClick={() => copyKey(institution.publicKey!)}
                        className="flex items-center gap-1 rounded border border-[#c5c6cf] px-2 py-0.5 text-xs font-semibold text-[#44474e]"
                      >
                        <span className="material-symbols-outlined text-[13px]">{copied ? "check" : "content_copy"}</span>
                        {copied ? tc("copied") : tc("copy")}
                      </button>
                    </div>
                    <p className="m-0 break-all font-mono text-xs text-[#44474e]">{institution.publicKey}</p>
                  </div>
                  <Row label={t("algorithm")} value={institution.keyAlgorithm ?? "—"} />
                  <Row label={t("generated")} value={fmtDate(institution.keyGeneratedAt, locale)} />
                </div>
              </Section>
            )}

            {/* Submitted documents */}
            <Section title={t("documents")}>
              {!hasDocs ? (
                <p className="m-0 text-sm text-[#75777f]">{t("noDocuments")}</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {docs.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => selectDocument(d.id, d.fileName)}
                      className="flex items-center justify-between gap-3 rounded border bg-[#f7f9fb] p-3 text-left"
                      style={{ borderColor: d.id === selectedId ? "#02275A" : "#c5c6cf" }}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="material-symbols-outlined shrink-0 text-[#44474e]">description</span>
                        <span className="truncate font-mono text-sm" style={{ color: "#005eb3" }}>{d.fileName}</span>
                      </span>
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold"
                        style={d.verified ? { background: "#e0e3e5", color: "#44474e" } : { background: "#ffdad6", color: "#C0392B" }}
                      >
                        <span className="material-symbols-outlined text-sm">{d.verified ? "check" : "priority_high"}</span>
                        {d.verified ? t("verified") : t("needsCheck")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Section>

            {/* Actions */}
            {(institution.status === "SUSPENDED" || institution.status === "APPROVED") && (
              <div className="mt-6 flex justify-end gap-3 border-t border-[#eef0f3] pt-6">
                {institution.status === "SUSPENDED" && (
                  <button
                    type="button"
                    onClick={() => reinstate.mutate(id)}
                    disabled={reinstate.isPending}
                    className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "#0d9668" }}
                  >
                    {reinstate.isPending ? t("reinstating") : t("reinstate")}
                  </button>
                )}
                {institution.status === "APPROVED" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setModalType("suspend")}
                      className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]"
                    >
                      {t("suspend")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalType("revoke")}
                      className="rounded px-5 py-2.5 text-sm font-bold text-white"
                      style={{ background: "#C0392B" }}
                    >
                      {t("revokeAccreditation")}
                    </button>
                  </>
                )}
              </div>
            )}

            {institution.updatedAt && (
              <p className="mt-6 text-xs text-[#75777f]">
                {t("lastUpdated", { date: fmtDate(institution.updatedAt, locale), n: institution.version })}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — sticky PDF preview */}
        {hasDocs && (
          <div className="sticky top-8 flex h-[calc(100vh-8rem)] min-w-0 flex-1 flex-col rounded-lg border border-[#c5c6cf] bg-white">
            {!selectedDoc ? (
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
                    <div className="size-8 animate-spin rounded-full border-4 border-[#e0e3e5]" style={{ borderTopColor: "#02275A" }} />
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
        )}
      </div>

      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-8">
            <h3 className="font-heading mb-3 text-xl font-bold">
              {t("suspendTitle", { name: institution.name })}
            </h3>
            <p className="mb-5 text-sm text-[#44474e]">
              {modalType === "suspend" ? t("suspendWarn") : t("revokeWarn")}
            </p>
            <label className="mb-1.5 block text-[13px] font-bold">{t("reasonRequired")}</label>
            <textarea
              rows={3}
              placeholder={t("reasonPh")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-1 w-full resize-none rounded px-4 py-3 text-sm"
              style={{ background: "#f7f9fb", border: "1px solid " + (showError ? "#C0392B" : "#c5c6cf") }}
            />
            {showError && <p className="mb-3.5 text-xs text-[#C0392B]">{t("reasonNeeded")}</p>}
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setModalType(null); setReason(""); setTouched(false) }} className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]">
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={confirmModalAction}
                disabled={revoke.isPending || suspend.isPending}
                className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#C0392B" }}
              >
                {modalType === "suspend"
                  ? (suspend.isPending ? t("suspending") : t("suspend"))
                  : (revoke.isPending ? t("revoking") : t("revokeAccreditation"))}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
