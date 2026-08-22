import Link from "next/link"

// Standalone chrome for QR/link landing - deliberately not VerifierLayout's full nav.
// Someone who scanned a QR wants the result, not a menu; kept to logo + a single
// "Verify another" link back into the full verifier flow.
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#f7f9fb", color: "#191c1e" }}>
      <header className="flex h-14 items-center justify-between border-b border-[#c5c6cf] bg-white px-4 sm:px-8">
        <Link href="/verify" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg" style={{ color: "#02275A" }}>verified_user</span>
          <span className="font-heading text-base font-extrabold" style={{ color: "#02275A" }}>CertiChain</span>
        </Link>
        <Link href="/verify" className="text-xs font-bold text-[#0462BA]">
          Verify another
        </Link>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-[#c5c6cf] p-5">
        <p className="m-0 text-center text-xs text-[#9aa0aa]">
          CertiChain is a blockchain-backed credential network.
        </p>
      </footer>
    </div>
  )
}
