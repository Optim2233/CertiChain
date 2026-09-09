"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePublicInstitutions } from "@/features/verifier"
import type { PublicInstitution } from "@/features/verifier"

const GRID_COLS = "3fr 2fr 1.2fr 1.5fr 1.4fr 1.4fr 1.4fr"

/** Fallback avatar when an institution has no logo: initials on its brand colour. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}

export default function AccreditedInstitutionsPage() {
  const t = useTranslations("institutions")
  const tc = useTranslations("common")
  const locale = useLocale()
  const [search, setSearch] = useState("")

  const { data, isLoading, isError } = usePublicInstitutions()
  const all = useMemo<PublicInstitution[]>(() => data?.data ?? [], [data])

  // The directory is a single small payload, so filtering client-side beats a
  // round trip per keystroke — no debounce needed.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter((r) =>
      [r.name, r.ministry, r.stateRegion, r.district].some((f) => f?.toLowerCase().includes(q))
    )
  }, [all, search])

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-10">
      <h1 className="font-heading m-0 text-[32px] font-extrabold">{t("title")}</h1>
      <p className="m-0 mb-6 mt-2 text-sm text-[#44474e]">{t("subtitle")}</p>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#75777f]">
            search
          </span>
          <input
            type="search"
            name="institution-search"
            autoComplete="off"
            aria-label={t("searchPh")}
            placeholder={t("searchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-[380px] rounded-lg border border-[#c5c6cf] bg-white py-2.5 pl-10 pr-3.5 text-sm"
          />
        </div>
        <span className="shrink-0 text-sm text-[#75777f]">
          {t("count", { n: rows.length, total: all.length })}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#c5c6cf] bg-white">
        <div className="min-w-[900px]">
          <div
            className="grid gap-4 px-6 py-3.5"
            style={{ gridTemplateColumns: GRID_COLS, background: "#f2f4f6", borderBottom: "1px solid #c5c6cf" }}
          >
            {["institution", "ministry", "type", "location", "status", "accreditedSince", "website"].map((k) => (
              <span key={k} className="text-[12px] font-bold uppercase tracking-wide text-[#44474e]">
                {t(`col.${k}`)}
              </span>
            ))}
          </div>

          {isLoading ? (
            <p className="p-6 text-sm text-[#75777f]">{tc("loading")}</p>
          ) : isError ? (
            <p className="p-6 text-sm text-[#C0392B]">{t("loadFailed")}</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-[#75777f]">{search ? t("noMatch", { q: search }) : t("empty")}</p>
          ) : (
            rows.map((r) => {
              const suspended = r.status === "SUSPENDED"
              return (
                <div
                  key={r.id}
                  className="grid items-center gap-4 px-6 py-4"
                  style={{ gridTemplateColumns: GRID_COLS, borderBottom: "1px solid #e5e7eb" }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {r.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.profileImageUrl}
                        alt=""
                        className="size-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                        style={{ background: r.brandColor || "#0462BA" }}
                      >
                        {initials(r.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-bold">{r.name}</p>
                      {r.institutionType ? (
                        <p className="m-0 truncate text-xs text-[#75777f]">{r.institutionType}</p>
                      ) : null}
                    </div>
                  </div>

                  <span className="truncate text-sm text-[#44474e]">{r.ministry || "—"}</span>
                  <span className="truncate text-sm text-[#44474e]">{r.institutionType || "—"}</span>
                  <span className="truncate text-sm text-[#44474e]">{r.stateRegion || r.district || "—"}</span>

                  <span
                    className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                    style={
                      suspended
                        ? { background: "#fdf0d5", color: "#8a5a00" }
                        : { background: "#d9f2e6", color: "#0d6b4b" }
                    }
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {suspended ? "pause_circle" : "check_circle"}
                    </span>
                    {suspended ? t("suspended") : t("accredited")}
                  </span>

                  <span className="text-sm text-[#44474e]">
                    {r.decidedAt ? new Date(r.decidedAt).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </span>

                  {r.website ? (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold"
                      style={{ color: "#0462BA" }}
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      {t("visitWebsite")}
                    </a>
                  ) : (
                    <span className="text-sm text-[#9aa0aa]">—</span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
