"use client"

import { useLocale, useTranslations } from "next-intl"
import type { Institution, InstitutionDetail } from "@/features/accreditation"

/** Compact read-only contact block shown alongside the review-flow steps. Takes
 *  the shared `Institution` shape; `contactEmail` is only present on the AA
 *  detail response (`InstitutionDetail`), so it's read defensively. */
export function InstitutionFacts({ institution }: { institution: Institution | InstitutionDetail }) {
  const t = useTranslations("authority")
  const locale = useLocale()
  const contactEmail = "contactEmail" in institution ? institution.contactEmail : null
  const site = institution.website?.replace(/^https?:\/\//, "")
  return (
    <div className="mb-5 flex flex-col gap-3.5 rounded border border-[#c5c6cf] bg-[#f7f9fb] p-4">
      <Fact label={t("contactEmail")} value={contactEmail ?? "—"} />
      <Fact label={t("phone")} value={institution.phone ?? "—"} />
      <Fact
        label={t("website")}
        value={
          site && institution.website ? (
            <a href={institution.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ color: "#005eb3" }}>
              {site}
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            </a>
          ) : "—"
        }
      />
      <Fact label={t("applied")} value={new Date(institution.appliedAt).toLocaleDateString(locale)} />
    </div>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 border-b border-[#eef0f3] pb-2.5 text-sm last:border-0">
      <span className="shrink-0 text-[#75777f]">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  )
}
