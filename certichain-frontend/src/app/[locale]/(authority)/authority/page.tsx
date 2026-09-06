"use client"

import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useInstitutions, useDisputedInstitutionIds } from "@/features/accreditation"

export default function AuthorityDashboardPage() {
  const t = useTranslations("authority")
  const locale = useLocale()
  const { data: pendingData, isError: pendingError } = useInstitutions("PENDING")
  const { data: approvedData, isError: approvedError } = useInstitutions("APPROVED")
  const { data: suspendedData, isError: suspendedError } = useInstitutions("SUSPENDED")
  const { data: revokedData, isError: revokedError } = useInstitutions("REVOKED")
  const { data: disputedIdsData } = useDisputedInstitutionIds()
  const isError = pendingError || approvedError || suspendedError || revokedError

  const pending = pendingData?.data.content ?? []
  const disputedIds = new Set(disputedIdsData?.data ?? [])
  const approvedFlagged = (approvedData?.data.content ?? []).filter((i) => disputedIds.has(i.id))

  const kpis = [
    { label: t("pendingReview"), value: pendingData?.data.totalElements ?? 0, icon: "schedule", iconBg: "#e0e3e5", iconColor: "#44474e" },
    { label: t("approved"), value: approvedData?.data.totalElements ?? 0, icon: "check_circle", iconBg: "#d5e3ff", iconColor: "#02275A" },
    { label: t("suspended"), value: suspendedData?.data.totalElements ?? 0, icon: "pause_circle", iconBg: "#eef0f3", iconColor: "#75777f" },
    { label: t("revoked"), value: revokedData?.data.totalElements ?? 0, icon: "cancel", iconBg: "#ffdad6", iconColor: "#C0392B" },
  ]

  const attention = [
    ...pending.map((i) => ({
      key: "pending-" + i.id,
      icon: "schedule", iconBg: "#e0e3e5", iconColor: "#44474e",
      title: i.name + " " + t("newApp"),
      sub: t("submittedDocs", { date: new Date(i.appliedAt).toLocaleDateString(locale) }),
      action: t("review"),
      href: "/authority/registry/" + i.id + "/documents",
    })),
    ...approvedFlagged.map((i) => ({
      key: "flag-" + i.id,
      icon: "flag", iconBg: "#ffdad6", iconColor: "#C0392B",
      title: i.name + " " + t("flagged"),
      sub: t("flaggedSub"),
      action: t("investigate"),
      href: "/authority/registry",
    })),
  ]

  return (
    <main className="w-full px-6 py-8">
      <h2 className="font-heading m-0 mb-1 text-[32px] font-bold">{t("overview")}</h2>
      <p className="m-0 mb-9 text-sm text-[#44474e]">{t("overviewSub")}</p>

      {isError && (
        <p className="mb-6 rounded-lg border border-[#ffdad6] bg-[#fff6f5] p-4 text-sm text-[#C0392B]">
          {t("loadFailed")}
        </p>
      )}

      <div className="mb-9 grid grid-cols-4 gap-6">
        {kpis.map((k) => (
          <Link key={k.label} href="/authority/registry" className="rounded-xl border border-[#c5c6cf] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
            <div className="mb-2.5 flex items-start justify-between">
              <p className="m-0 text-[13px] font-semibold text-[#44474e]">{k.label}</p>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: k.iconBg }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: k.iconColor }}>{k.icon}</span>
              </span>
            </div>
            <p className="font-heading m-0 text-[32px] font-extrabold">{k.value}</p>
          </Link>
        ))}
      </div>

      <h3 className="font-heading mb-4 text-xl font-bold">{t("needsAttention")}</h3>
      <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
        {attention.length === 0 ? (
          <p className="p-6 text-sm text-[#75777f]">{t("allClear")}</p>
        ) : (
          attention.map((a) => (
            <Link key={a.key} href={a.href} className="flex items-center justify-between gap-4 border-b border-[#c5c6cf] px-6 py-4 last:border-0">
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: a.iconBg }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: a.iconColor }}>{a.icon}</span>
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-sm font-bold">{a.title}</p>
                  <p className="m-0 mt-0.5 text-[13px] text-[#44474e]">{a.sub}</p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px] font-bold" style={{ color: "#02275A" }}>
                {a.action}
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </span>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}
