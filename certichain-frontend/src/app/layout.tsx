import type { Metadata } from "next"
import { Manrope, IBM_Plex_Sans, Noto_Sans_Myanmar } from "next/font/google"
import { Toaster } from "sonner"
import { Providers } from "./providers"
import "./globals.css"

// Self-hosted by next/font: removes the render-blocking fonts.googleapis.com
// round-trip that used to sit in globals.css, and pins the family names to CSS
// variables consumed by @theme.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
})

// Unicode Myanmar coverage (Manrope/IBM Plex are latin-only).
// Self-hosted by next/font; falls back in the --font-sans stack.
const notoSansMyanmar = Noto_Sans_Myanmar({
  subsets: ["myanmar", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-myanmar",
  display: "swap",
})

export const metadata: Metadata = {
  title: "CertiChain",
  description: "Cryptographically verified academic credentials",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`scroll-smooth ${manrope.variable} ${ibmPlexSans.variable} ${notoSansMyanmar.variable}`}>
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
