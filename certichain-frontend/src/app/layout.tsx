import type { Metadata } from "next"
import { Toaster } from "sonner"
import { Providers } from "./providers"

// Fonts ship as npm packages rather than next/font/google, which fetched them from
// fonts.gstatic.com at build time - an intermittently failing network call that could
// break `next build` entirely. Same families, same upstream files, same versions
// (Manrope v20, IBM Plex Sans v23, Noto Sans Myanmar v27); the build no longer touches
// the network. Matches @material-symbols/font-400, already vendored this way below.
// Only the weights actually used are imported. Fontsource sets font-display: swap.
import "@fontsource/manrope/400.css"
import "@fontsource/manrope/600.css"
import "@fontsource/manrope/700.css"
import "@fontsource/manrope/800.css"
import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/500.css"
import "@fontsource/ibm-plex-sans/600.css"
import "@fontsource/ibm-plex-sans/700.css"
// Unicode Myanmar coverage (Manrope/IBM Plex are latin-only).
import "@fontsource/noto-sans-myanmar/400.css"
import "@fontsource/noto-sans-myanmar/500.css"
import "@fontsource/noto-sans-myanmar/600.css"
import "@fontsource/noto-sans-myanmar/700.css"
import "./globals.css"

export const metadata: Metadata = {
  title: "CertiChain",
  description: "Cryptographically verified academic credentials",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      {/* suppressHydrationWarning: password-manager / form-fill extensions inject
          attributes into inputs (and thus mutate the tree) before React hydrates.
          Only suppresses attribute diffs directly on <body>, not deeper. */}
      <body className="flex min-h-screen flex-col antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
