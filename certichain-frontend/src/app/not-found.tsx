import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: "#f7f9fb" }}>
      <span className="material-symbols-outlined mb-4 text-5xl" style={{ color: "#75777f" }}>search_off</span>
      <h1 className="font-heading m-0 mb-2 text-3xl font-extrabold" style={{ color: "#02275A" }}>Page Not Found</h1>
      <p className="m-0 mb-7 max-w-[420px] text-sm text-[#44474e]">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link href="/" className="rounded px-6 py-3 text-sm font-bold text-white" style={{ background: "#0462BA" }}>
        Back to Home
      </Link>
    </main>
  )
}
