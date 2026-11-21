import type { SyntheticEvent } from "react";

/**
 * Frontend counterpart of scripts/seed/seed-logos.sh's slugify(): lowercase, collapse
 * non-alphanumeric runs to a single dash, trim edge dashes. The seed script saves
 * logos to public/logos/{slug}.png using the same rule on the institution's own name,
 * so this derivation and that file name agree without any shared registry.
 */
export function institutionLogoSlug(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * onError chain for institution logos: stored Supabase URL -> local seed copy
 * (/logos/{slug}.png) -> default seal (/logos/default.svg). Attach to the <img> that
 * renders an institution's logo. Institutions without a seeded local copy fall
 * straight through to the seal.
 */
export function onInstitutionLogoError(
  event: SyntheticEvent<HTMLImageElement>,
  name: string | null | undefined,
): void {
  const img = event.currentTarget;
  const src = img.getAttribute("src") ?? "";
  if (src.startsWith("/logos/")) {
    if (src !== "/logos/default.svg") {
      // Local seed copy missed too: settle on the default seal. If even that fails,
      // this branch does nothing further, so the error loop stops naturally.
      img.src = "/logos/default.svg";
    }
    return;
  }
  img.src = `/logos/${institutionLogoSlug(name)}.png`;
}
