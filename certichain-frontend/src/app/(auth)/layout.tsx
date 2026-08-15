import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-6">
      <Link href="/" className="font-heading text-xl font-bold">
        CertiChain
      </Link>
      {children}
    </div>
  )
}
