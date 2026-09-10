"use client"

import { useTranslations } from "next-intl"

const ICONS: Record<string, string> = { CERTIFICATE: "school", ACTIVITY_RECORD: "diversity_3" }
const DAY_MS = 86_400_000

export type AccentPattern = "hatch" | "dots" | "none" | "grid" | "waves" | "circles"
export type CardTheming = {
  brandColor?: string | null
  secondaryBrandColor?: string | null
  accentPattern?: AccentPattern
  accentColor?: string | null
  patternScale?: string | null
  titleFont?: string | null
  medalPosition?: string | null
  watermarkIcon?: string | null
}

const FALLBACK_ACCENTS = ["#123564","#1f4d3a","#5b2333","#3b2f63","#134e4a","#5c3a1e","#4a2a52","#1e3a5f"]
export function institutionAccent(name: string | null | undefined): string {
  if (!name) return FALLBACK_ACCENTS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return FALLBACK_ACCENTS[Math.abs(hash) % FALLBACK_ACCENTS.length]
}
function monogram(name: string | null | undefined): string {
  if (!name) return ""
  return name.trim().split(/\s+/).slice(0,3).map((w)=>w[0]?.toUpperCase()??"").join("")
}
export function credentialTitle(item: { title?: string | null; type: string }, typeLabel: string) {
  // ponytail: plain helper so no hooks; caller passes translated type label (tc("certificate") / tc("activityRecord")).
  return item.title?.trim() || typeLabel
}
export function credentialSubtitle(item: { institutionName?: string | null; issuedAt: string }) {
  const year = new Date(item.issuedAt).getFullYear()
  return item.institutionName ? `${item.institutionName} \u00B7 ${year}` : String(year)
}
type ChipKey = "revoked" | "expired" | "expiresTomorrow" | "expiresIn" | "verified"
function chipState(status: string, expiresAt: string | null | undefined): { key: ChipKey; n?: number; icon: string; border: string; color: string } {
  if (status === "REVOKED") return { key: "revoked", icon: "cancel", border: "rgba(163,38,56,0.5)", color: "#e8a5ad" }
  if (expiresAt) {
    const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY_MS)
    if (daysLeft <= 0) return { key: "expired", icon: "event_busy", border: "rgba(163,38,56,0.5)", color: "#e8a5ad" }
    if (daysLeft <= 30) {
      if (daysLeft === 1) return { key: "expiresTomorrow", icon: "schedule", border: "rgba(201,168,92,0.55)", color: "#e5c987" }
      return { key: "expiresIn", n: daysLeft, icon: "schedule", border: "rgba(201,168,92,0.55)", color: "#e5c987" }
    }
  }
  return { key: "verified", icon: "check_circle", border: "rgba(63,107,78,0.5)", color: "#9cc2ac" }
}

function titleFontClass(v?: string | null) {
  if (v==="serif") return "font-serif"
  if (v==="mono") return "font-mono"
  return "font-heading"
}

function watermarkSize(pattern: AccentPattern | string | undefined, scale?: string | null) {
  const base: Record<string, { w:number,h:number }> = {
    hatch: {w:6,h:6}, dots:{w:10,h:10}, grid:{w:12,h:12}, waves:{w:20,h:10}, circles:{w:14,h:14}
  }
  const b = base[pattern as string] ?? base.hatch
  const mult = scale==="sm"?0.7:scale==="lg"?1.4:1
  return { w: Math.round(b.w*mult), h: Math.round(b.h*mult) }
}

function watermarkColor(accentColor?: string | null, brand?: string | null) {
  if (accentColor==="brand" && brand) return brand
  if (accentColor==="gold") return "#c9a85c"
  return "#ffffff"
}
function medalGradient(brand?: string | null) {
  return { foil: false, bg: "#02275A", border: "2px solid #c9a85c" }
}
function resolveMedalIcon(type?: string) {
  return ICONS[type ?? "CERTIFICATE"] ?? "school"
}
function resolveWatermarkIcon(v?: string|null) {
  if (!v || v==="none") return null
  return v
}

export function CredentialCard({
  id, type, title, subtitle, status, expiresAt, onClick, institutionName,
  brandColor, secondaryBrandColor, logoUrl, accentPattern="hatch",
  accentColor, patternScale, titleFont,
  medalPosition="top-left", watermarkIcon="workspace_premium",
}: {
  id: string; type: "CERTIFICATE"|"ACTIVITY_RECORD"; title: string; subtitle: string
  status: "ISSUED"|"REVOKED"|"PENDING_CLAIM"; expiresAt?: string|null; onClick?:()=>void
  institutionName?: string|null; brandColor?: string|null; secondaryBrandColor?: string|null; logoUrl?: string|null
  accentPattern?: AccentPattern; accentColor?: string|null; patternScale?: string|null
  titleFont?: string|null
  medalPosition?: string|null; watermarkIcon?: string|null
}) {
  const t = useTranslations("common")
  const chip = chipState(status, expiresAt)
  const chipLabel = chip.key === "expiresIn" ? t("expiresIn", { n: chip.n ?? 0 }) : t(chip.key)
  const initials = monogram(institutionName)
  const accent = brandColor || institutionAccent(institutionName)
  const bg = secondaryBrandColor ? `linear-gradient(135deg,#0B1E3D,${accent},${secondaryBrandColor})` : `linear-gradient(135deg,#0B1E3D,${accent})`
  const showWatermark = accentPattern!=="none"
  const wmIcon = resolveWatermarkIcon(watermarkIcon)
  // Gold reads far fainter than white/brand at the same opacity against the dark
  // card background - bump it so the pattern is actually visible, not just present.
  const wmOp = accentColor==="gold" ? 0.11 : 0.04
  const wmCol = watermarkColor(accentColor, brandColor)
  const patScale = watermarkSize(accentPattern as string, patternScale)
  const medal = medalGradient(brandColor)

  return (
    <div onClick={onClick} className={`relative flex min-h-[200px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl p-6 text-white shadow-[0_12px_32px_rgba(11,30,61,0.3)] transition hover:-translate-y-0.5`} style={{ background: bg }}>
      {showWatermark && (
        <svg width="100%" height="100%" className="pointer-events-none absolute inset-0" style={{ opacity: wmOp }}>
          <defs>
            {accentPattern==="dots" ? (
              <pattern id={"cardAccent-"+id} width={patScale.w} height={patScale.h} patternUnits="userSpaceOnUse">
                <circle cx={patScale.w/5} cy={patScale.h/5} r={patScale.w*0.14} fill={wmCol} />
              </pattern>
            ) : accentPattern==="grid" ? (
              <pattern id={"cardAccent-"+id} width={patScale.w} height={patScale.h} patternUnits="userSpaceOnUse">
                <path d={`M ${patScale.w} 0 H 0 V ${patScale.h}`} stroke={wmCol} strokeWidth={1.4} fill="none" />
              </pattern>
            ) : accentPattern==="waves" ? (
              <pattern id={"cardAccent-"+id} width={patScale.w} height={patScale.h} patternUnits="userSpaceOnUse">
                <path d={`M0 ${patScale.h/2} Q ${patScale.w/4} 0 ${patScale.w/2} ${patScale.h/2} T ${patScale.w} ${patScale.h/2}`} stroke={wmCol} strokeWidth={1.5} fill="none" />
              </pattern>
            ) : accentPattern==="circles" ? (
              <pattern id={"cardAccent-"+id} width={patScale.w} height={patScale.h} patternUnits="userSpaceOnUse">
                <circle cx={patScale.w/2} cy={patScale.h/2} r={patScale.w*0.35} stroke={wmCol} strokeWidth={1.2} fill="none" />
              </pattern>
            ) : (
              <pattern id={"cardAccent-"+id} width={patScale.w} height={patScale.h} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                <line x1="0" y1="0" x2="0" y2={patScale.h} stroke={wmCol} strokeWidth={1.8} />
              </pattern>
            )}
          </defs>
          <rect width="100%" height="100%" fill={`url(#cardAccent-${id})`} />
        </svg>
      )}
      {wmIcon && (
        <span className="material-symbols-outlined pointer-events-none absolute -bottom-2 right-3" style={{ fontSize: 76, opacity: wmOp+0.04 }}>{wmIcon}</span>
      )}

      <div className={`relative flex items-start justify-between ${medalPosition==="top-right" ? "flex-row-reverse" : ""}`}>
          <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg size-11`} style={{ background: medal.bg, border: medal.border as any }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" loading="lazy" className="size-full object-cover" />
            ) : initials ? (
              <span className="text-[11px] font-extrabold" style={{ color: "#c9a85c" }}>{initials}</span>
            ) : (
              <span className="material-symbols-outlined text-lg" style={{ color: "#c9a85c" }}>{resolveMedalIcon(type)}</span>
            )}
          </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ borderColor: chip.border, color: chip.color }}>
          <span className="material-symbols-outlined text-sm">{chip.icon}</span>{chipLabel}
        </span>
      </div>

      <div className="relative">
        <p className={`${titleFontClass(titleFont)} m-0 mb-1 line-clamp-2 text-lg font-extrabold leading-tight tracking-tight`}>{title}</p>
        <p className={`${titleFontClass(titleFont)} m-0 truncate text-[13px]`} style={{ color: "#D6E0EA" }}>{subtitle}</p>
      </div>
    </div>
  )
}
