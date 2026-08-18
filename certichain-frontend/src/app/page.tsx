import Link from "next/link"
import { AuthBrandPanel } from "@/features/auth/components/AuthBrandPanel"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel
        icon="verified_user"
        heading="One record, trusted everywhere."
        body="Institutions issue tamper-proof certificates on-chain, graduates control who sees them, and anyone can verify one in seconds — no account required."
        footer="Trusted by 40+ accredited institutions"
      />
      <main className="flex flex-1 flex-col items-center justify-center px-6" style={{ background: "#f7f9fb" }}>
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <span className="material-symbols-outlined text-4xl" style={{ color: "#02275A" }}>verified_user</span>
          <h1 className="font-heading m-0 text-4xl font-extrabold" style={{ color: "#02275A" }}>CertiChain</h1>
        </div>
        <h2 className="font-heading m-0 mb-3 hidden max-w-[480px] text-center text-2xl font-extrabold lg:block" style={{ color: "#02275A" }}>
          Welcome to CertiChain
        </h2>
        <p className="mb-10 max-w-[480px] text-center text-base text-[#44474e]">
          A blockchain-backed credential network. Verify a certificate, log in to your portal, or register your
          institution to start issuing.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/verify" className="rounded px-7 py-3.5 text-sm font-bold text-white" style={{ background: "#0462BA" }}>
            Verify a Certificate
          </Link>
          <Link href="/login" className="rounded border px-7 py-3.5 text-sm font-bold" style={{ borderColor: "#02275A", color: "#02275A" }}>
            Log In
          </Link>
          <Link href="/register" className="rounded border border-[#c5c6cf] bg-white px-7 py-3.5 text-sm font-semibold text-[#44474e]">
            Register Your Institution
          </Link>
        </div>
        <p className="mt-6 text-sm text-[#44474e]">
          Graduate?{" "}
          <Link href="/register/graduate" className="font-semibold" style={{ color: "#005eb3" }}>
            Create an account
          </Link>
        </p>
      </main>
    </div>
  )
}
