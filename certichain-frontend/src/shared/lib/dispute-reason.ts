// Stored dispute reasons are always the English category picked in the
// raise-dispute modal ("Incorrect details" | "Not my credential" | "Other"),
// optionally followed by ": " + the graduate's free-text explanation.
// Only the category is translated; user-typed explanations stay as-is.
const REASON_KEYS = {
  "Incorrect details": "incorrectDetails",
  "Not my credential": "notMine",
  "Other": "other",
} as const;

type ReasonLabel = (key: "incorrectDetails" | "notMine" | "other") => string;

/**
 * Same parse as translateDisputeReason, but keeps the two halves apart so a table can put
 * the category on its own line and the graduate's free text underneath (where it can be
 * clamped) instead of running both together in one cell.
 */
export function splitDisputeReason(
  reason: string,
  t: ReasonLabel,
): { category: string; detail: string } {
  const idx = reason.indexOf(":");
  const head = (idx < 0 ? reason : reason.slice(0, idx)).trim();
  const key = REASON_KEYS[head as keyof typeof REASON_KEYS];
  // Unrecognised category (legacy or hand-written): show it verbatim, don't split it.
  if (!key) return { category: reason, detail: "" };
  return { category: t(key), detail: idx < 0 ? "" : reason.slice(idx + 1).trim() };
}

export function translateDisputeReason(reason: string, t: ReasonLabel): string {
  const { category, detail } = splitDisputeReason(reason, t);
  return detail ? `${category}: ${detail}` : category;
}
