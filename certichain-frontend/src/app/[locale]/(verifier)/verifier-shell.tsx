"use client"

import { Link } from "@/i18n/navigation"
import { usePathname } from "next/navigation"
import { CertiChainShield } from "@/shared/components/brand/CertiChainShield"
import type { VerifierNavItem } from "./layout"

export function VerifierShell({
  children,
  footer,
  nav,
}: {
  children: React.ReactNode
  footer: string
  nav: VerifierNavItem[]
}) {
  const pathname = usePathname()
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#f7f9fb", color: "#191c1e" }}>
      <header className="flex h-auto flex-col items-center justify-between gap-2 border-b border-[#c5c6cf] bg-white px-4 py-3 sm:h-16 sm:flex-row sm:gap-0 sm:px-8 sm:py-0">
        <Link href="/" className="flex items-center gap-2">
          <CertiChainShield size={26} />
          <span className="font-heading text-lg font-extrabold" style={{ color: "#02275A" }}>CertiChain</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 sm:justify-end sm:gap-7">
          {nav.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="text-sm font-bold hover:text-[#0462BA]"
                style={{ color: active ? "#0462BA" : "#44474e" }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-[#c5c6cf] p-6">
        <p className="m-0 text-center text-xs text-[#9aa0aa]">
          {footer}
        </p>
      </footer>
    </div>
  )
}
