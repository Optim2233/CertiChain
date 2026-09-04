"use client"

// ponytail: runs outside NextIntlClientProvider (root layout crashed), so no
// useTranslations here — locale comes from the URL segment (/en/… or /my/…).
const COPY = {
  en: { title: "Something went wrong", retry: "Try again" },
  my: { title: "အမှားတစ်ခု ဖြစ်ပွားခဲ့သည်", retry: "ထပ်ကြိုးစားပါ" },
} as const

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  if (typeof window !== "undefined") console.error(error)
  const seg = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "en"
  const t = COPY[seg === "my" ? "my" : "en"]
  return (
    <html lang={seg === "my" ? "my" : "en"}><body className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <button onClick={reset} className="mt-4 rounded bg-primary px-4 py-2 text-white">{t.retry}</button>
      </div>
    </body></html>
  )
}
