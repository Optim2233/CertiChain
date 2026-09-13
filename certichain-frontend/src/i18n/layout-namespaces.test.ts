import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * Every namespace a page asks for via useTranslations("x") must be handed to the client by
 * the layout above it, or next-intl renders the raw key ("auth.newPassword") into the UI.
 *
 * This shipped: the graduate and authority settings pages both call useTranslations("auth")
 * for their change-password form, but neither layout passed `auth` to
 * NextIntlClientProvider - so the labels and the success toast rendered as literal key
 * strings. The keys existed in en.json/my.json the whole time; only the wiring was missing,
 * which is exactly the kind of gap a type-check can't see.
 */

const APP_DIR = join(process.cwd(), "src/app/[locale]")

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

/** Route groups "(x)" and dynamic segments don't nest namespaces differently - the nearest
 *  layouts up the tree all contribute, so collect every layout on the path. */
function layoutsAbove(file: string): string[] {
  const all = walk(APP_DIR).filter((f) => f.endsWith("layout.tsx"))
  return all.filter((layout) => file.startsWith(layout.replace(/layout\.tsx$/, "")))
}

function providedNamespaces(layout: string): string[] {
  const src = readFileSync(layout, "utf8")
  // messages={{ common, graduate, error, auth }}
  const match = src.match(/messages=\{\{([^}]*)\}\}/)
  if (!match) return []
  return match[1]
    .split(",")
    .map((s) => s.split(":")[0].trim())
    .filter(Boolean)
}

describe("i18n namespace wiring", () => {
  const pages = walk(APP_DIR).filter((f) => f.endsWith("page.tsx"))

  it("finds pages to check", () => {
    expect(pages.length).toBeGreaterThan(10)
  })

  it.each(pages.map((p) => [p.replace(APP_DIR, "").replace(/\\/g, "/"), p] as const))(
    "%s has every namespace it uses",
    (_label, page) => {
      const src = readFileSync(page, "utf8")
      const used = [...src.matchAll(/useTranslations\(\s*["'`]([a-zA-Z]+)["'`]\s*\)/g)].map((m) => m[1])
      if (used.length === 0) return

      const available = new Set(layoutsAbove(page).flatMap(providedNamespaces))
      const missing = [...new Set(used)].filter((ns) => !available.has(ns))

      expect(missing, `missing from the layouts above this page: ${missing.join(", ")}`).toEqual([])
    },
  )
})
