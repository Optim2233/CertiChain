"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { CredentialCard, credentialSubtitle, credentialTitle } from "@/shared/components/credential-card"
import { useTimeline } from "@/features/graduate"
import { Skeleton } from "@/shared/components/ui/skeleton"

export default function GraduateCredentialsPage() {
  const t = useTranslations("graduate")
  const tc = useTranslations("common")
  const [filter, setFilter] = useState<string>("ALL")
  const { data, isLoading } = useTimeline()
  const credentials = data?.data ?? []
  const visible = filter === "ALL" ? credentials : credentials.filter((c) => c.type === filter)

  const filters = [
    { label: tc("all"), value: "ALL" },
    { label: tc("certificate"), value: "CERTIFICATE" },
    { label: tc("activityRecord"), value: "ACTIVITY_RECORD" },
  ] as const

  return (
    <div className="p-6">
      <h1 className="font-heading text-xl font-bold">{t("myCredentials")}</h1>
      <p className="text-muted-foreground mb-4 text-sm">{t("credsSub")}</p>

      <div className="mb-5 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
              (filter === f.value
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-muted-foreground hover:border-primary/50")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px] rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noCredsCategory")}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <Link key={c.id} href={"/graduate/credentials/" + c.id}>
              <CredentialCard
                id={c.id}
                type={c.type}
                title={credentialTitle(c, c.type === "CERTIFICATE" ? tc("certificate") : tc("activityRecord"))}
                subtitle={credentialSubtitle(c)}
                status={c.status}
                expiresAt={c.expiresAt}
                institutionName={c.institutionName}
                brandColor={c.institutionBrandColor}
                secondaryBrandColor={c.institutionSecondaryBrandColor}
                logoUrl={c.institutionLogoUrl}
                accentPattern={c.institutionAccentPattern as "hatch" | "dots" | "none"}
                accentColor={c.institutionAccentColor}
                patternScale={c.institutionPatternScale}
                titleFont={c.institutionTitleFont}
                medalPosition={c.institutionMedalPosition}
                watermarkIcon={c.institutionWatermarkIcon}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
