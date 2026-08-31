"use client"

const ICONS: Record<string, string> = { CERTIFICATE: "school", ACTIVITY_RECORD: "diversity_3" }

const DAY_MS = 86_400_000

export type AccentPattern = "hatch" | "dots" | "none"

// Curated deep tones, all contrast-safe as the second gradient stop against white
// card text. Used as the fallback when an institution has set no brand_color, so a
// graduate's cards from different issuers still look distinct.
const FALLBACK_ACCENTS = [
  "#123564", // navy (current default)
  "#1f4d3a", // forest
  "#5b2333", // burgundy
  "#3b2f63", // indigo
  "#134e4a", // deep teal
  "#5c3a1e", // umber
  "#4a2a52", // plum
  "#1e3a5f", // slate blue
]

/** Deterministic accent for an institution with no explicit brand colour - hash the
 * name into the curated palette so the same issuer always gets the same colour. */
export function institutionAccent(name: string | null | undefined): string {
  if (!name) return FALLBACK_ACCENTS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return FALLBACK_ACCENTS[Math.abs(hash) % FALLBACK_ACCENTS.length]
}

/** First letter of up to 3 words, uppercased - "University of Info Tech" -> "UIT". */
function monogram(name: string | null | undefined): string {
  if (!name) return ""
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

/** Falls back to the credential type when a title is missing - pre-existing rows and
 * anything issued outside the standard form may not carry one. */
export function credentialTitle(item: { title?: string | null; type: string }) {
  return item.title?.trim() || (item.type === "CERTIFICATE" ? "Certificate" : "Activity Record")
}

/** "Institution · 2026" - issuer first, since that is what a graduate recalls a
 * credential by; the year only disambiguates repeats from the same issuer. */
export function credentialSubtitle(item: { institutionName?: string | null; issuedAt: string }) {
  const year = new Date(item.issuedAt).getFullYear()
  return item.institutionName ? `${item.institutionName} · ${year}` : String(year)
}

/**
 * Revoked outranks expiry, and expiry outranks "all good" - a graduate needs to see the
 * one state that limits the credential, not the reassuring one. Expiry is derived here
 * rather than persisted, matching how the verify path treats it.
 */
function chipState(status: string, expiresAt: string | null | undefined) {
  if (status === "REVOKED") return { label: "Revoked", icon: "cancel", border: "rgba(163,38,56,0.5)", color: "#e8a5ad" }
  if (expiresAt) {
    const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY_MS)
    if (daysLeft <= 0) return { label: "Expired", icon: "event_busy", border: "rgba(163,38,56,0.5)", color: "#e8a5ad" }
    if (daysLeft <= 30) {
      const label = daysLeft === 1 ? "Expires tomorrow" : `Expires in ${daysLeft} days`
      return { label, icon: "schedule", border: "rgba(201,168,92,0.55)", color: "#e5c987" }
    }
  }
  return { label: "Verified", icon: "check_circle", border: "rgba(63,107,78,0.5)", color: "#9cc2ac" }
}

/**
 * Navy "certificate card" tile — same gradient, hatch watermark, and icon
 * chip language as CertificateHero, so the graduate portal reads as one
 * consistent system rather than two different card treatments.
 */
export function CredentialCard({
  id,
  type,
  title,
  subtitle,
  status,
  expiresAt,
  onClick,
  institutionName,
  brandColor,
  logoUrl,
  accentPattern = "hatch",
}: {
  id: string
  type: "CERTIFICATE" | "ACTIVITY_RECORD"
  title: string
  subtitle: string
  status: "ISSUED" | "REVOKED" | "PENDING_CLAIM"
  expiresAt?: string | null
  onClick?: () => void
  institutionName?: string | null
  brandColor?: string | null
  logoUrl?: string | null
  accentPattern?: AccentPattern
}) {
  const chip = chipState(status, expiresAt)
  const accent = brandColor || institutionAccent(institutionName)
  const initials = monogram(institutionName)

  return (
    <div
      onClick={onClick}
      className="relative flex min-h-[200px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl p-6 text-white shadow-[0_12px_32px_rgba(11,30,61,0.3)] transition hover:-translate-y-0.5"
      style={{ background: `linear-gradient(135deg,#0B1E3D,${accent})` }}
    >
      {accentPattern !== "none" && (
        <svg width="100%" height="100%" className="pointer-events-none absolute inset-0" style={{ opacity: 0.08 }}>
          <defs>
            {accentPattern === "dots" ? (
              <pattern id={"cardAccent-" + id} width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.4" fill="#ffffff" />
              </pattern>
            ) : (
              <pattern
                id={"cardAccent-" + id}
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(35)"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeWidth="1" />
              </pattern>
            )}
          </defs>
          <rect width="100%" height="100%" fill={"url(#cardAccent-" + id + ")"} />
        </svg>
      )}
      <span
        className="material-symbols-outlined pointer-events-none absolute -bottom-2 right-3"
        style={{ fontSize: 76, opacity: 0.12 }}
      >
        workspace_premium
      </span>

      <div className="relative flex items-start justify-between">
        <span
          className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{
            background: "radial-gradient(circle at 32% 28%, #c9a85c, #8b6914 75%)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.35)",
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-full object-cover" />
          ) : initials ? (
            <span className="text-[11px] font-extrabold" style={{ color: "#0B1E3D" }}>
              {initials}
            </span>
          ) : (
            <span className="material-symbols-outlined text-lg" style={{ color: "#0B1E3D" }}>
              {ICONS[type]}
            </span>
          )}
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold"
          style={{ borderColor: chip.border, color: chip.color }}
        >
          <span className="material-symbols-outlined text-sm">{chip.icon}</span>
          {chip.label}
        </span>
      </div>

      <div className="relative">
        {/* Titles are institution-supplied free text - clamp so a long degree name
            can't push the subtitle out of the card. */}
        <p className="font-heading m-0 mb-1 line-clamp-2 text-lg font-extrabold leading-tight tracking-tight">
          {title}
        </p>
        <p className="m-0 truncate text-[13px]" style={{ color: "#D6E0EA" }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}
