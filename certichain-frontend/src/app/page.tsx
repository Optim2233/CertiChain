"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePublicInstitutions, useTrustStats } from "@/features/verifier"

const QR_PATH = "M0 0h3v3H0zM7 0h3v3H7zM0 7h3v3H0zM4 0h1v1H4zM4 2h1v2H4zM4 5h2v1H4zM4 7h1v3H4zM6 4h1v1H6zM8 4h2v1H8zM6 6h1v4H6zM8 8h2v2H8z"

export default function LandingPage() {
  const router = useRouter()
  const [certId, setCertId] = useState("")
  const [mode, setMode] = useState<"id" | "qr">("id")
  const { data: statsRes } = useTrustStats()
  const { data: institutionsRes } = usePublicInstitutions()
  const stats = statsRes?.data
  const institutions = institutionsRes?.data ?? []

  function goVerify() {
    if (mode === "qr") {
      router.push("/verify?mode=qr")
      return
    }
    if (certId.trim()) {
      router.push(`/verify?id=${encodeURIComponent(certId.trim())}`)
    } else {
      router.push("/verify")
    }
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#fff", color: "#191c1e" }}>
      <Navbar />
      <Hero />
      <RoleSection />
      <HowItWorks />
      <InstantVerification mode={mode} setMode={setMode} certId={certId} setCertId={setCertId} onVerify={goVerify} />
      <Features />
      <StatsBar stats={stats} />
      <Institutions institutions={institutions} />
      <CtaBanner />
      <Footer />
    </div>
  )
}

function Navbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white/95 px-6 backdrop-blur lg:px-10">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full" style={{ background: "#02275A" }}>
          <span className="material-symbols-outlined text-base text-white">verified_user</span>
        </div>
        <span className="font-heading text-lg font-extrabold" style={{ color: "#02275A" }}>CertiChain</span>
      </div>
      <nav className="hidden items-center gap-7 md:flex">
        <a href="#top" className="text-sm font-semibold text-[#191c1e] hover:text-[#0462BA]">Home</a>
        <a href="#how-it-works" className="text-sm font-semibold text-[#44474e] hover:text-[#0462BA]">How It Works</a>
        <a href="#features" className="text-sm font-semibold text-[#44474e] hover:text-[#0462BA]">Features</a>
        <a href="#institutions" className="text-sm font-semibold text-[#44474e] hover:text-[#0462BA]">Institutions</a>
        <Link href="/verify" className="text-sm font-semibold text-[#44474e] hover:text-[#0462BA]">Verify Credential</Link>
        <a href="#footer" className="text-sm font-semibold text-[#44474e] hover:text-[#0462BA]">Contact</a>
      </nav>
      <Link href="/login" className="rounded-md px-5 py-2.5 text-sm font-bold text-white" style={{ background: "#0462BA" }}>
        Login / Register
      </Link>
    </header>
  )
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-6 py-20 lg:px-10" style={{ background: "linear-gradient(160deg, #02275A, #031B42)" }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "repeating-linear-gradient(125deg, #fff 0px, #fff 1px, transparent 1px, transparent 7px)" }}
      />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-2">
        <div>
          <h1 className="font-heading m-0 mb-5 text-[44px] font-extrabold leading-[1.1] text-white lg:text-[52px]">
            Credentials You Can <span style={{ color: "#7ea6ff" }}>Trust.</span> Proof That Moves With You.
          </h1>
          <p className="m-0 mb-8 max-w-[480px] text-base leading-relaxed" style={{ color: "#c4d3ff" }}>
            A secure digital credential platform for institutions, graduates, and verifiers. Issue, manage, and
            verify academic achievements with confidence.
          </p>
          <div className="mb-9 flex flex-wrap gap-4">
            <Link href="/verify" className="flex items-center gap-2 rounded-md px-7 py-3.5 text-sm font-bold text-white" style={{ background: "#0462BA" }}>
              Verify a Credential
              <span className="material-symbols-outlined text-[18px]">search</span>
            </Link>
            <a href="#who-are-you" className="rounded-md border border-white/30 px-7 py-3.5 text-sm font-bold text-white">
              Explore the Platform
            </a>
          </div>
          <div className="flex flex-wrap gap-6">
            <TrustBadge icon="lock" label="Secure" sub="Digitally Signed" />
            <TrustBadge icon="verified" label="Trusted" sub="Accredited Institutions" />
            <TrustBadge icon="bolt" label="Instant" sub="Real-time Verification" />
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[420px]">
          <div
            className="relative rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
            style={{ transform: "rotate(2deg)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="m-0 text-[11px] font-bold uppercase tracking-wide" style={{ color: "#0462BA" }}>Verified Credential</p>
              <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: "#e6f7ef", color: "#0d9668" }}>
                <span className="material-symbols-outlined text-xs">check_circle</span>
                VERIFIED
              </span>
            </div>
            <div className="mb-4 flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: "#d5e3ff" }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: "#02275A" }}>account_balance</span>
              </div>
              <p className="font-heading m-0 text-base font-bold leading-tight">Bachelor of Science in Information Technology</p>
            </div>
            <p className="m-0 mb-0.5 text-[15px] font-bold">Sample Graduate</p>
            <p className="m-0 mb-3 text-xs text-[#75777f]">University of Information Technology</p>
            <div className="mb-4 flex items-center justify-between text-xs text-[#75777f]">
              <span>Graduated: May 2026</span>
              <span>Credential ID: CRD-2026-000124</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#eef0f3] pt-3.5">
              <div className="flex flex-col gap-1">
                <CheckLine label="Digitally Signed" />
                <CheckLine label="Institution Accredited" />
                <CheckLine label="Credential Valid" />
              </div>
              <div className="shrink-0 rounded-md p-1.5" style={{ background: "#f7f9fb" }}>
                <svg viewBox="0 0 10 10" width="44" height="44">
                  <rect width="10" height="10" fill="#f7f9fb" />
                  <path d={QR_PATH} fill="#02275A" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustBadge({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-lg" style={{ color: "#7ea6ff" }}>{icon}</span>
      <div>
        <p className="m-0 text-[13px] font-bold text-white">{label}</p>
        <p className="m-0 text-[11px]" style={{ color: "#9db3e8" }}>{sub}</p>
      </div>
    </div>
  )
}

function CheckLine({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#44474e" }}>
      <span className="material-symbols-outlined text-sm" style={{ color: "#0d9668" }}>check_circle</span>
      {label}
    </span>
  )
}

function RoleSection() {
  const roles = [
    {
      icon: "account_balance",
      title: "Institution",
      desc: "Issue, manage and verify certificates for your graduates.",
      cta: "Enter Portal",
      href: "/login",
      color: "#0462BA",
      bg: "#eaf1fb",
      image: "/images/roles/institution/2.jpg",
      images: [
        "/images/roles/institution/1.jpg",
        "/images/roles/institution/2.jpg",
        "/images/roles/institution/3.jpg",
      ],
      fit: "cover" as const,
      tilt: undefined as string | undefined,
      badge: undefined as { icon: string; label: string } | undefined,
    },
    {
      icon: "school",
      title: "Graduate",
      desc: "View, manage and share your digital credentials securely.",
      cta: "Open My Wallet",
      href: "/login",
      color: "#0d9668",
      bg: "#e9f8f1",
      image: "/images/roles/graduate.jpg",
      images: [] as string[],
      fit: "cover" as const,
      tilt: "-2.5deg",
      badge: { icon: "verified_user", label: "Secure Wallet" },
    },
    {
      icon: "search",
      title: "Verifier",
      desc: "Verify credentials instantly and ensure authenticity with confidence.",
      cta: "Verify Credential",
      href: "/verify",
      color: "#7c3aed",
      bg: "#f1ecfd",
      image: "/images/roles/verifier.png",
      images: [] as string[],
      fit: "contain" as const,
      tilt: undefined as string | undefined,
      badge: undefined as { icon: string; label: string } | undefined,
    },
    {
      icon: "gavel",
      title: "Accreditation Authority",
      desc: "Review, accredit and maintain the trust registry.",
      cta: "Authority Portal",
      href: "/login",
      color: "#d97706",
      bg: "#fdf1e2",
      image: "/images/roles/authority.jpg",
      images: [] as string[],
      fit: "cover" as const,
      tilt: undefined as string | undefined,
      badge: undefined as { icon: string; label: string } | undefined,
    },
  ]

  return (
    <section id="who-are-you" className="px-6 py-16 lg:px-10" style={{ background: "#f7f9fb" }}>
      <div className="mx-auto max-w-[1200px]">
        <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: "#0462BA" }}>Get Started</p>
        <h2 className="font-heading m-0 mb-1 text-[28px] font-extrabold">Who are you?</h2>
        <p className="m-0 mb-9 text-sm text-[#44474e]">Choose your role to access the right portal.</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <Link
              key={role.title}
              href={role.href}
              className="group flex flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white transition-shadow hover:shadow-[0_8px_24px_rgba(2,39,90,0.12)]"
            >
              <div
                className="relative h-72 shrink-0 overflow-hidden"
                style={{ backgroundColor: role.bg }}
              >
                {/* Photos are inset with visible margin, never bled to the card's edges - they
                    read as deliberately framed photos sitting on the role's pastel backdrop,
                    not a stretched/cropped background fill. */}
                {role.images.length > 1 ? (
                  <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
                    {role.images.map((src, i) => {
                      const layout = [
                        { top: "34%", left: "6%", width: "42%", rotate: "-7deg", z: 10 },
                        { top: "10%", left: "30%", width: "46%", rotate: "3deg", z: 30 },
                        { top: "40%", left: "52%", width: "42%", rotate: "8deg", z: 20 },
                      ][i % 3]
                      return (
                        <div
                          key={src}
                          className="absolute overflow-hidden rounded-lg border-[3px] border-white shadow-[0_8px_20px_rgba(2,39,90,0.25)]"
                          style={{ top: layout.top, left: layout.left, width: layout.width, transform: `rotate(${layout.rotate})`, zIndex: layout.z }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="block aspect-[4/3] w-full object-cover object-top" />
                        </div>
                      )
                    })}
                  </div>
                ) : role.fit === "contain" ? (
                  <div
                    className="absolute inset-0 bg-no-repeat transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url(${role.image})`, backgroundSize: "48%", backgroundPosition: "center" }}
                  />
                ) : (
                  <div
                    className="absolute inset-6 overflow-hidden rounded-lg shadow-[0_8px_20px_rgba(2,39,90,0.18)] transition-transform duration-300 group-hover:scale-105"
                    style={role.tilt ? { transform: `rotate(${role.tilt})` } : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={role.image} alt="" className="block h-full w-full object-cover object-top" />
                    {role.badge && (
                      <span
                        className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-sm"
                        style={{ background: role.color }}
                      >
                        <span className="material-symbols-outlined text-xs">{role.badge.icon}</span>
                        {role.badge.label}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className="absolute -bottom-4 left-6 flex size-12 items-center justify-center rounded-full border-4 border-white shadow-sm"
                  style={{ background: role.bg, zIndex: 50 }}
                >
                  <span className="material-symbols-outlined text-2xl" style={{ color: role.color }}>{role.icon}</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6 pt-12">
                <h3 className="font-heading m-0 mb-1.5 text-base font-bold">{role.title}</h3>
                <p className="m-0 mb-5 flex-1 text-[13px] leading-relaxed text-[#44474e]">{role.desc}</p>
                <span className="flex items-center gap-1 text-[13px] font-bold" style={{ color: role.color }}>
                  {role.cta}
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { icon: "account_balance", label: "Institution Issues", desc: "Institutions create and digitally sign credentials." },
    { icon: "wallet", label: "Graduate Receives", desc: "Graduates receive and store their credentials in a wallet." },
    { icon: "share", label: "Graduate Shares", desc: "Graduates share credentials with selective disclosure." },
    { icon: "fact_check", label: "Verifier Checks", desc: "Verifiers check authenticity and credential status." },
    { icon: "check_circle", label: "Verified", desc: "Trust is established. Credential is verified." },
  ]

  return (
    <section id="how-it-works" className="px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-[1200px]">
        <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: "#0462BA" }}>How It Works</p>
        <h2 className="font-heading m-0 mb-10 text-[28px] font-extrabold">Simple. Secure. Trusted.</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-col items-center text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-full" style={{ background: "#eaf1fb" }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: "#0462BA" }}>{step.icon}</span>
              </div>
              <p className="m-0 mb-1 text-[11px] font-bold" style={{ color: "#0462BA" }}>{String(i + 1).padStart(2, "0")}</p>
              <p className="m-0 mb-1.5 text-sm font-bold">{step.label}</p>
              <p className="m-0 text-xs leading-relaxed text-[#75777f]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function InstantVerification({
  mode,
  setMode,
  certId,
  setCertId,
  onVerify,
}: {
  mode: "id" | "qr"
  setMode: (m: "id" | "qr") => void
  certId: string
  setCertId: (v: string) => void
  onVerify: () => void
}) {
  return (
    <section className="px-6 py-16 lg:px-10" style={{ background: "linear-gradient(160deg, #02275A, #031B42)" }}>
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: "#7ea6ff" }}>Verify Any Credential</p>
          <h2 className="font-heading m-0 mb-3 text-[28px] font-extrabold text-white">Instant Verification</h2>
          <p className="m-0 mb-6 max-w-[420px] text-sm" style={{ color: "#c4d3ff" }}>
            Enter a credential ID or scan a QR code to verify authenticity in real-time.
          </p>

          <div className="rounded-xl bg-white p-2">
            <div className="mb-4 flex gap-1 p-1">
              <button
                type="button"
                onClick={() => setMode("id")}
                className="rounded px-3.5 py-2 text-sm font-semibold"
                style={{ background: mode === "id" ? "#0462BA" : "transparent", color: mode === "id" ? "#fff" : "#44474e" }}
              >
                Credential ID
              </button>
              <button
                type="button"
                onClick={() => setMode("qr")}
                className="rounded px-3.5 py-2 text-sm font-semibold"
                style={{ background: mode === "qr" ? "#0462BA" : "transparent", color: mode === "qr" ? "#fff" : "#44474e" }}
              >
                Scan QR Code
              </button>
            </div>

            {mode === "id" ? (
              <div className="flex gap-2 px-3 pb-3">
                <input
                  type="text"
                  value={certId}
                  onChange={(e) => setCertId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onVerify()}
                  placeholder="Enter Credential ID (e.g. CRD-2026-000124)"
                  className="flex-1 rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={onVerify}
                  className="flex shrink-0 items-center gap-1.5 rounded px-5 py-2.5 text-sm font-bold text-white"
                  style={{ background: "#0462BA" }}
                >
                  Verify Now
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            ) : (
              <div className="px-3 pb-3">
                <button
                  type="button"
                  onClick={onVerify}
                  className="flex w-full items-center justify-center gap-2 rounded border-2 border-dashed border-[#c5c6cf] bg-[#f7f9fb] py-4 text-sm font-semibold text-[#44474e]"
                >
                  <span className="material-symbols-outlined">qr_code_scanner</span>
                  Continue to QR scanner
                </button>
              </div>
            )}
          </div>
          <p className="m-0 mt-3 flex items-center gap-1.5 text-xs" style={{ color: "#9db3e8" }}>
            <span className="material-symbols-outlined text-sm">info</span>
            How verification works
          </p>
        </div>

        <div className="mx-auto w-full max-w-[360px] rounded-xl bg-white p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <span className="material-symbols-outlined mb-4 inline-block text-5xl" style={{ color: "#0d9668" }}>verified_user</span>
          <p className="font-heading m-0 mb-1 text-lg font-extrabold" style={{ color: "#0d9668" }}>CREDENTIAL VERIFIED</p>
          <p className="m-0 text-xs text-[#75777f]">Authentic · Valid · Trusted</p>
        </div>
      </div>
    </section>
  )
}

function Features() {
  const items = [
    { icon: "draw", title: "Digital Signatures", desc: "Cryptographically sign credentials to ensure authenticity and integrity." },
    { icon: "visibility_lock", title: "Selective Disclosure", desc: "Share only the necessary information while keeping the rest private." },
    { icon: "qr_code_2", title: "QR Verification", desc: "Verify credentials instantly using QR codes anywhere, anytime." },
    { icon: "account_balance", title: "Trust Registry", desc: "All institutions are verified and managed by the authority." },
    { icon: "block", title: "Revocation", desc: "Revoke or suspend credentials when necessary." },
    { icon: "history", title: "Activity Records", desc: "Issue verifiable activity records as digital credentials." },
  ]

  return (
    <section id="features" className="px-6 py-16 lg:px-10" style={{ background: "linear-gradient(135deg, #fafbfd 0%, #6f7ef0 100%)" }}>
      <div className="mx-auto max-w-[1200px]">
        <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: "#efe6ec" }}>Verify Any Credential</p>
        <h2 className="font-heading m-0 mb-9 text-[28px] font-extrabold text-white">Everything you need for trusted credentials</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="rounded-xl border border-[#e5e7eb] bg-white p-6">
              <div className="mb-3 flex size-11 items-center justify-center rounded-lg" style={{ background: "#02275A" }}>
                <span className="material-symbols-outlined text-xl text-white">{item.icon}</span>
              </div>
              <h3 className="font-heading m-0 mb-1.5 text-sm font-bold">{item.title}</h3>
              <p className="m-0 text-[13px] leading-relaxed text-[#75777f]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StatsBar({ stats }: { stats: { institutionCount: number; verificationCount: number } | undefined }) {
  const tiles = [
    { icon: "workspace_premium", value: stats ? `${stats.verificationCount.toLocaleString()}+` : "—", label: "Certificates Verified" },
    { icon: "account_balance", value: stats ? String(stats.institutionCount) : "—", label: "Trusted Institutions" },
    { icon: "verified", value: "100%", label: "Digitally Signed" },
    { icon: "schedule", value: "24/7", label: "System Availability" },
  ]

  return (
    <section className="px-6 py-10 lg:px-10" style={{ background: "linear-gradient(160deg, #02275A, #031B42)" }}>
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
              <span className="material-symbols-outlined text-xl" style={{ color: "#7ea6ff" }}>{tile.icon}</span>
            </div>
            <div>
              <p className="font-heading m-0 text-2xl font-extrabold text-white">{tile.value}</p>
              <p className="m-0 text-xs" style={{ color: "#9db3e8" }}>{tile.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Institutions({ institutions }: { institutions: Array<{ id: string; name: string; status: string }> }) {
  const shown = institutions.slice(0, 6)

  return (
    <section id="institutions" className="px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-[1200px]">
        <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: "#0462BA" }}>Trusted Institutions</p>
        <h2 className="font-heading m-0 mb-9 text-[28px] font-extrabold">Our Accredited Institutions</h2>

        {shown.length === 0 ? (
          <p className="m-0 text-sm text-[#75777f]">No institutions have been accredited yet.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((inst) => (
              <div key={inst.id} className="flex items-center gap-3.5 rounded-xl border border-[#e5e7eb] bg-white p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: "#eaf1fb" }}>
                  <span className="material-symbols-outlined text-lg" style={{ color: "#0462BA" }}>account_balance</span>
                </div>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-bold">{inst.name}</p>
                  <span
                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: inst.status === "APPROVED" ? "#0d9668" : "#8a5a00" }}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {inst.status === "APPROVED" ? "check_circle" : "pause_circle"}
                    </span>
                    {inst.status === "APPROVED" ? "Active" : "Suspended"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function CtaBanner() {
  return (
    <section className="px-6 py-14 lg:px-10" style={{ background: "linear-gradient(90deg, #0462BA, #7c3aed)" }}>
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <div className="flex items-center gap-4">
          <span className="hidden size-14 shrink-0 items-center justify-center rounded-full bg-white/15 md:flex">
            <span className="material-symbols-outlined text-3xl text-white">workspace_premium</span>
          </span>
          <div>
            <h2 className="font-heading m-0 mb-1 text-2xl font-extrabold text-white">Your Achievement Deserves Proof.</h2>
            <p className="m-0 text-sm text-white/85">Issue it. Own it. Share it. Verify it.</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-3">
          <Link href="/verify" className="rounded-md bg-white px-6 py-3 text-sm font-bold" style={{ color: "#0462BA" }}>
            Verify a Credential
          </Link>
          <Link href="/login" className="rounded-md border border-white/60 px-6 py-3 text-sm font-bold text-white">
            Access Your Portal
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer id="footer" className="px-6 py-12 lg:px-10" style={{ background: "#02275A" }}>
      <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-8 md:flex-row">
        <div className="max-w-[320px]">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-white">
              <span className="material-symbols-outlined text-base" style={{ color: "#02275A" }}>verified_user</span>
            </div>
            <span className="font-heading text-base font-extrabold text-white">CertiChain</span>
          </div>
          <p className="m-0 text-[13px] leading-relaxed" style={{ color: "#9db3e8" }}>
            Building a trusted future through secure digital credentials.
          </p>
        </div>
        <div>
          <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: "#7ea6ff" }}>Platform</p>
          <div className="flex flex-col gap-2">
            <a href="#how-it-works" className="text-[13px]" style={{ color: "#c4d3ff" }}>How It Works</a>
            <a href="#features" className="text-[13px]" style={{ color: "#c4d3ff" }}>Features</a>
            <a href="#institutions" className="text-[13px]" style={{ color: "#c4d3ff" }}>Institutions</a>
            <Link href="/verify" className="text-[13px]" style={{ color: "#c4d3ff" }}>Verify Credential</Link>
          </div>
        </div>
        <div>
          <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: "#7ea6ff" }}>Accounts</p>
          <div className="flex flex-col gap-2">
            <Link href="/login" className="text-[13px]" style={{ color: "#c4d3ff" }}>Log In</Link>
            <Link href="/register" className="text-[13px]" style={{ color: "#c4d3ff" }}>Register Your Institution</Link>
            <Link href="/register/graduate" className="text-[13px]" style={{ color: "#c4d3ff" }}>Create a Graduate Account</Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-[1200px] border-t pt-6" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <p className="m-0 text-xs" style={{ color: "#7f9bd6" }}>© 2026 CertiChain. All rights reserved.</p>
      </div>
    </footer>
  )
}
