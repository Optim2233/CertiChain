import Link from "next/link"

// ponytail: dev-only sitemap, gated on NODE_ENV so it never ships in a
// production build - a real per-role nav replaces this once portals are wired
// end to end. Dynamic routes are noted, not linked (need a real id).
const DEV_SITEMAP: { portal: string; pages: { label: string; href?: string }[] }[] = [
  {
    portal: "Institution",
    pages: [
      { label: "Dashboard", href: "/institution" },
      { label: "Issue Certificate", href: "/institution/issue" },
      { label: "Batch Issuance", href: "/institution/issue/batch" },
      { label: "Activity Records", href: "/institution/activity-records" },
      { label: "Issue Activity Record", href: "/institution/activity-records/new" },
      { label: "Settings", href: "/institution/settings" },
      { label: "Registration", href: "/register/institution" },
    ],
  },
  {
    portal: "Accreditation Authority",
    pages: [
      { label: "Registry", href: "/authority" },
      { label: "Review (dynamic — open via Registry)" },
      { label: "Audit Log", href: "/authority/audit-log" },
      { label: "Settings", href: "/authority/settings" },
    ],
  },
  {
    portal: "Verifier",
    pages: [
      { label: "Verify Form", href: "/verify" },
      { label: "Verify Result (dynamic — open via Verify Form)" },
      { label: "Institutions Directory", href: "/institutions" },
    ],
  },
  {
    portal: "Graduate",
    pages: [
      { label: "Overview", href: "/graduate" },
      { label: "My Shares", href: "/graduate/shares" },
      { label: "Create Share (dynamic — open via Overview)" },
      { label: "Settings", href: "/graduate/settings" },
      { label: "Sign Up", href: "/register/graduate" },
    ],
  },
  {
    portal: "Auth",
    pages: [{ label: "Login", href: "/login" }],
  },
]

export default function LandingPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center gap-6 p-6 pt-16 text-center">
      <h1 className="text-2xl font-semibold">CertiChain</h1>
      <p className="text-muted-foreground text-sm">
        Academic credential verification, backed by a trust registry and
        selective disclosure.
      </p>
      <div className="flex gap-3">
        <Link href="/verify" className="text-primary text-sm underline underline-offset-4">
          Verify a credential
        </Link>
        <Link href="/institutions" className="text-primary text-sm underline underline-offset-4">
          Browse accredited institutions
        </Link>
        <Link href="/login" className="text-primary text-sm underline underline-offset-4">
          Log in
        </Link>
      </div>
      <div className="flex gap-3 text-xs">
        <Link href="/register/graduate" className="text-muted-foreground underline underline-offset-4">
          Sign up as a graduate
        </Link>
        <Link href="/register/institution" className="text-muted-foreground underline underline-offset-4">
          Apply as an institution
        </Link>
      </div>

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 grid w-full gap-4 text-left sm:grid-cols-2">
          {DEV_SITEMAP.map((group) => (
            <div key={group.portal} className="border-border bg-card rounded-lg border p-4">
              <h2 className="font-heading mb-2 text-sm font-bold">{group.portal}</h2>
              <ul className="flex flex-col gap-1">
                {group.pages.map((page) => (
                  <li key={page.label} className="text-sm">
                    {page.href ? (
                      <Link href={page.href} className="text-primary underline underline-offset-4">
                        {page.label}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{page.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
