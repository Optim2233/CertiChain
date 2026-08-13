import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
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
    </div>
  )
}
