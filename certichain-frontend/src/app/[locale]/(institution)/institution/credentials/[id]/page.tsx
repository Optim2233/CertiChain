"use client"

import { useParams, useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { useState, useEffect, Suspense } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { CertificateHero } from "@/shared/components/certificate-hero"
import {
  useCredential,
  useCredentialFields,
  useEditCredential,
  useUpholdDispute,
  useDisputes,
  useInstitutionMe,
} from "@/features/institution"
import { Skeleton } from "@/shared/components/ui/skeleton"

export default function CredentialDetailPage() {
  return (
    <Suspense>
      <CredentialDetailContent />
    </Suspense>
  )
}

function CredentialDetailContent() {
  const t = useTranslations("institution")
  const tc = useTranslations("common")
  const locale = useLocale()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const disputeId = useSearchParams().get("disputeId")

  const { data: credData } = useCredential(id)
  const credential = credData?.data
  const { data: fieldsData } = useCredentialFields(id)
  const fields = fieldsData?.data ?? []
  // The issuing institution is always the signed-in one here, so its branding comes
  // from /institution/me rather than being added to every credential response.
  const { data: me } = useInstitutionMe()
  const { data: disputesData } = useDisputes()
  const resolvingDispute = disputesData?.data.find((d) => d.id === disputeId)

  const editCredential = useEditCredential()
  const upholdDispute = useUpholdDispute()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (editing && fields.length > 0) {
      const next: Record<string, string> = {}
      fields.forEach((f) => { next[f.fieldName] = f.fieldValue })
      setForm(next)
    }
  }, [editing, fields])

  if (!credential)
    return (
      <main className="mx-auto max-w-[820px] p-6" aria-busy="true">
        <Skeleton className="mb-3 h-8 w-1/2" />
        <Skeleton className="mb-8 h-4 w-1/4" />
        <Skeleton className="mb-4 h-[200px] rounded-xl" />
        <Skeleton className="h-[140px] rounded-xl" />
      </main>
    )

  const requiredKeys = fields.map((f) => f.fieldName)
  const allValid = requiredKeys.length > 0 && requiredKeys.every((k) => form[k]?.trim())

  function save() {
    const nextTouched: Record<string, boolean> = {}
    requiredKeys.forEach((k) => { nextTouched[k] = true })
    setTouched(nextTouched)
    if (!allValid) return
    const fieldInputs = requiredKeys.map((k) => ({ name: k, value: form[k] }))
    editCredential.mutate(
      { id, fields: fieldInputs },
      {
        onSuccess: () => {
          if (resolvingDispute) {
            upholdDispute.mutate(
              { id: resolvingDispute.id, resolutionNote: "Corrected per dispute review.", action: "edit", fields: fieldInputs },
              { onSuccess: () => router.push("/institution/disputes") }
            )
          } else {
            setEditing(false)
          }
        },
      }
    )
  }

  return (
    <main className="w-full px-6 py-8">
      <Link href="/institution" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4" style={{ color: "#005eb3" }}>
        <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
        {t("backToDashboard")}
      </Link>

      <div className="mb-6">
        <CertificateHero
          title={fields.find((f) => f.fieldName === "title")?.fieldValue
            || (credential.type === "CERTIFICATE" ? tc("certificate") : tc("activityRecord"))}
          institutionName={me?.name}
          issuedTo={credential.graduateEmail}
          issuedAt={credential.issuedAt}
          credentialId={credential.id}
          hash={credential.merkleRoot ?? credential.signature}
          revoked={credential.status === "REVOKED"}
          revokeReason={credential.revokeReason}
          brandColor={me?.brandColor}
          secondaryBrandColor={me?.secondaryBrandColor}
          logoUrl={me?.profileImageUrl}
          accentPattern={me?.accentPattern ?? undefined}
          accentColor={me?.accentColor}
          patternScale={me?.patternScale}
          titleFont={me?.titleFont}
          watermarkIcon={me?.watermarkIcon ?? undefined}
        />
      </div>

      {credential.status === "REVOKED" && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-[rgba(192,57,43,0.3)] bg-[#ffdad6] px-5 py-4">
          <span className="material-symbols-outlined text-[#C0392B]">cancel</span>
          <p className="m-0 text-sm font-semibold text-[#C0392B]">{t("credRevokedBanner")}</p>
        </div>
      )}

      {editing ? (
        <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
          <h3 className="font-heading mb-1 text-lg font-bold">{t("editCred")}</h3>
          <p className="mb-5 text-[13px] text-[#44474e]">{t("editCredSub")}</p>

          {resolvingDispute && (
            <div className="mb-5 flex gap-2.5 rounded border border-[rgba(165,115,15,0.3)] bg-[#fff3d6] px-4 py-3">
              <span className="material-symbols-outlined text-[#a5730f]">gavel</span>
              <p className="m-0 text-[13px] text-[#6b4e0c]">
                {t("resolvingDispute", { reason: resolvingDispute.reason })}
              </p>
            </div>
          )}

          {requiredKeys.map((k) => (
            <div key={k} className="mb-4">
              <label className="mb-1.5 block text-sm font-bold capitalize">{k}</label>
              <input
                type="text"
                value={form[k] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
                className="w-full rounded border px-3.5 py-2.5 text-sm"
                style={{ borderColor: touched[k] && !form[k]?.trim() ? "#C0392B" : "#c5c6cf" }}
              />
              {touched[k] && !form[k]?.trim() && <p className="mt-1 text-xs text-[#C0392B]">{t("fieldRequired", { field: k })}</p>}
            </div>
          ))}

          <div className="mt-6 flex justify-end gap-3 border-t border-[#c5c6cf] pt-5">
            <button type="button" onClick={() => setEditing(false)} className="rounded border border-[#c5c6cf] bg-white px-5 py-2.5 text-sm font-semibold text-[#44474e]">
              {tc("cancel")}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={editCredential.isPending || upholdDispute.isPending}
              className="rounded px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#02275A" }}
            >
              {resolvingDispute ? t("saveResolve") : t("saveChangesBtn")}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[#c5c6cf] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading m-0 text-lg font-bold">{t("credDetails")}</h3>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded border px-4 py-2 text-[13px] font-semibold"
              style={{ borderColor: "#02275A", color: "#02275A" }}
            >
              <span className="material-symbols-outlined text-base">edit</span>
              {tc("edit")}
            </button>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="flex justify-between border-b border-[#eef0f3] pb-2.5 text-sm">
              <span className="text-[#75777f]">{t("recipientEmail")}</span>
              <span className="font-semibold">{credential.graduateEmail}</span>
            </div>
            <div className="flex justify-between border-b border-[#eef0f3] pb-2.5 text-sm">
              <span className="text-[#75777f]">{tc("type")}</span>
              <span className="font-semibold">{credential.type === "CERTIFICATE" ? tc("certificate") : tc("activityRecord")}</span>
            </div>
            <div className="flex justify-between border-b border-[#eef0f3] pb-2.5 text-sm">
              <span className="text-[#75777f]">{t("issueDateLbl")}</span>
              <span className="font-semibold">{new Date(credential.issuedAt).toLocaleDateString(locale)}</span>
            </div>
            {fields.map((f) => (
              <div key={f.id} className="flex justify-between border-b border-[#eef0f3] pb-2.5 text-sm last:border-0">
                <span className="capitalize text-[#75777f]">{f.fieldName}</span>
                <span className="font-semibold">{f.fieldValue}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
