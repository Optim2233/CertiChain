import Link from "next/link"

export default function VerifierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#f7f9fb", color: "#191c1e" }}>
      <header className="flex h-16 items-center justify-between border-b border-[#c5c6cf] bg-white px-8">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ color: "#02275A" }}>verified_user</span>
          <span className="font-heading text-lg font-extrabold" style={{ color: "#02275A" }}>CertiChain</span>
        </div>
        <nav className="flex items-center gap-7">
          <Link href="/verify" className="text-sm font-bold text-[#44474e] hover:text-[#0462BA]">Verify a Certificate</Link>
          <Link href="/verify/bulk" className="text-sm font-bold text-[#44474e] hover:text-[#0462BA]">For Employers</Link>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-[#c5c6cf] p-6">
        <p className="m-0 text-center text-xs text-[#9aa0aa]">
          CertiChain is a blockchain-backed credential network. Institutions are reviewed and accredited before they can issue certificates.
        </p>
      </footer>
    </div>
  )
}
