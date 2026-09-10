"use client"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { institutionAccent } from "./credential-card"
const QR_CELLS = "M0 0h3v3H0zM7 0h3v3H7zM0 7h3v3H0zM4 0h1v1H4zM4 2h1v2H4zM4 5h2v1H4zM4 7h1v3H4zM6 4h1v1H6zM8 4h2v1H8zM6 6h1v4H6zM8 8h2v2H8z"

export function CertificateHero({
  title, institutionName, institutionStatus, issuedTo, issuedAt, credentialId, hash, registrarName, registrarTitle, revoked, revokeReason,
  brandColor, secondaryBrandColor, logoUrl, accentPattern="hatch", accentColor, patternScale, titleFont, watermarkIcon="workspace_premium",
}: {
  title: string; institutionName?: string|null; institutionStatus?: string|null; issuedTo?: string|null; issuedAt?: string|null; credentialId?: string|null; hash?: string|null; registrarName?: string|null; registrarTitle?: string|null; revoked?: boolean; revokeReason?: string|null
  brandColor?: string|null; secondaryBrandColor?: string|null; logoUrl?: string|null; accentPattern?: string; accentColor?: string|null; patternScale?: string|null; titleFont?: string|null; watermarkIcon?: string|null
}) {
  const t = useTranslations("common")
  const locale = useLocale()
  const [copied,setCopied]=useState(false)
  const copyLabel=copied?t("heroCopied"):t("heroCopyHash")
  function copyToClipboard(value: string) { navigator.clipboard.writeText(value); toast.success(t("copied")); setCopied(true); setTimeout(()=>setCopied(false),1500) }
  const signOffLabel=(registrarTitle||t("registrarFallback"))+(institutionName? ", "+institutionName:"")
  const initials=(institutionName||"").trim().split(/\s+/).slice(0,3).map(w=>w[0]?.toUpperCase()??"").join("")
  const accent=brandColor||institutionAccent(institutionName)
  const bg=secondaryBrandColor ? `linear-gradient(135deg,#02275A,${accent},${secondaryBrandColor})` : `linear-gradient(135deg,#02275A,${accent})`
  const radius="16px" as const
  const fontCls=titleFont==="serif"?"font-serif":titleFont==="mono"?"font-mono":"font-heading"
  // Gold reads far fainter than white/brand at the same opacity against the dark
  // hero background - bump it so the pattern is actually visible, not just present.
  const wmOp=accentColor==="gold"?0.11:0.04
  const wmColor=accentColor==="brand"&&brandColor?brandColor:accentColor==="gold"?"#c9a85c":"#ffffff"
  const showWatermark=accentPattern!=="none"
  const patW=patternScale==="sm"?6:patternScale==="lg"?10:6
  const wmIcon=watermarkIcon && watermarkIcon!=="none" ? watermarkIcon : null
  const medalBg="#02275A"
  const logoRnd="rounded-lg"
  const medalSizeCls="size-12"

  return (
    <div className="relative overflow-hidden p-9 text-white shadow-[0_12px_32px_rgba(2,39,90,0.3)] sm:p-10" style={{ background: bg, borderRadius: radius }}>
      {showWatermark && (
        <svg width="100%" height="100%" className="pointer-events-none absolute inset-0" style={{ opacity: wmOp }}>
          <defs>
            {accentPattern==="dots" ? (
              <pattern id="heroAccent" width={patW+4} height={patW+4} patternUnits="userSpaceOnUse"><circle cx={2} cy={2} r={1.4} fill={wmColor} /></pattern>
            ) : accentPattern==="grid" ? (
              <pattern id="heroAccent" width={12} height={12} patternUnits="userSpaceOnUse"><path d="M 12 0 H 0 V 12" stroke={wmColor} strokeWidth={0.7} fill="none" /></pattern>
            ) : accentPattern==="waves" ? (
              <pattern id="heroAccent" width={20} height={10} patternUnits="userSpaceOnUse"><path d="M0 5 Q5 0 10 5 T20 5" stroke={wmColor} strokeWidth={0.8} fill="none" /></pattern>
            ) : accentPattern==="circles" ? (
              <pattern id="heroAccent" width={14} height={14} patternUnits="userSpaceOnUse"><circle cx={7} cy={7} r={5} stroke={wmColor} strokeWidth={0.6} fill="none" /></pattern>
            ) : (
              <pattern id="heroAccent" width={patW} height={patW} patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2={patW} stroke={wmColor} strokeWidth={1} /></pattern>
            )}
          </defs>
          <rect width="100%" height="100%" fill="url(#heroAccent)" />
        </svg>
      )}
      {wmIcon && <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2" style={{ fontSize: 180, opacity: wmOp-0.02 }}>{wmIcon}</span>}

      <div className="relative mb-7 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex shrink-0 items-center justify-center overflow-hidden ${logoRnd} ${medalSizeCls} rounded-full`} style={{ background: medalBg, border: "2px solid #c9a85c" }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-full object-cover" />
            ) : initials ? (
              <span className="text-xs font-extrabold" style={{ color: "#c9a85c" }}>{initials}</span>
            ) : (
              <span className="material-symbols-outlined" style={{ color: "#c9a85c" }}>account_balance</span>
            )}
          </div>
          <div>
            <p className={`${fontCls} m-0 text-[15px] font-bold`}>{institutionName || t("heroIssuing")}</p>
            <p
              className="m-0 mt-0.5 text-[11px]"
              style={{ color: institutionStatus === "SUSPENDED" || institutionStatus === "REVOKED" ? "#ffcf9e" : "#d5e3ff", opacity: 0.9 }}
            >
              {institutionStatus === "SUSPENDED"
                ? t("heroIssuerSuspended")
                : institutionStatus === "REVOKED"
                  ? t("heroIssuerRevoked")
                  : t("heroAccredited")}
            </p>
          </div>
        </div>
        {revoked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "rgba(192,57,43,0.25)", color: "#ffb4a8" }}><span className="material-symbols-outlined text-sm">cancel</span>{t("revoked")}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "rgba(16,185,129,0.2)", color: "#7ee6c5" }}><span className="material-symbols-outlined text-sm">verified</span>{t("heroVerifiedChain")}</span>
        )}
      </div>

      <div className="relative mb-8">
        <p className={`${fontCls} m-0 mb-1.5 text-[28px] font-extrabold leading-tight tracking-tight`}>{title}</p>
        {issuedTo && <p className="m-0 text-[15px]" style={{ color: "#d5e3ff" }}>{t("heroIssuedTo", { name: issuedTo })}</p>}
        {revoked && revokeReason && <p className="mt-2 text-sm text-red-300">{t("heroReason", { reason: revokeReason })}</p>}
      </div>

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-1 flex-wrap gap-8">
          {issuedAt && <div><p className="m-0 mb-0.5 text-[11px] uppercase tracking-wide" style={{ color: "#a8c8ff" }}>{t("heroIssueDate")}</p><p className="m-0 text-[13px] font-semibold">{new Date(issuedAt).toLocaleDateString(locale)}</p></div>}
          {credentialId && <div><p className="m-0 mb-0.5 text-[11px] uppercase tracking-wide" style={{ color: "#a8c8ff" }}>{t("heroCredId")}</p><p className="m-0 text-[13px] font-semibold">{credentialId}</p></div>}
          {hash && <div className="min-w-0 max-w-full"><p className="m-0 mb-0.5 text-[11px] uppercase tracking-wide" style={{ color: "#a8c8ff" }}>{t("heroHash")}</p><p className="m-0 break-all font-mono text-xs">{hash}</p><p className="m-0 mt-1 text-[10px]" style={{ color: "#a8c8ff" }}>{t("heroHashNote")}</p></div>}
        </div>
        <div className="shrink-0 rounded-md bg-white p-1.5" style={{ width: 56, height: 56 }}>
          <svg viewBox="0 0 10 10" width="100%" height="100%"><rect width="10" height="10" fill="#fff" /><path d={QR_CELLS} fill="#02275A" /></svg>
        </div>
      </div>

      {(registrarName || hash) && (
        <div className="relative mt-7 flex items-end justify-between border-t border-white/25 pt-3.5">
          <div>
            {registrarName && <div className="mb-1 h-3.5 w-[120px] border-b italic" style={{ borderColor: "#a8c8ff", fontFamily: "Manrope,sans-serif", fontSize: 14, color: "#d5e3ff" }}>{registrarName}</div>}
            <p className="m-0 text-[11px]" style={{ color: "#a8c8ff" }}>{signOffLabel}</p>
          </div>
          {hash && <button type="button" onClick={()=>copyToClipboard(hash)} className="flex items-center gap-1.5 rounded border border-white/40 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white">{copyLabel}</button>}
        </div>
      )}
    </div>
  )
}
