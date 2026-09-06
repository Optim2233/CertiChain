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

export function translateDisputeReason(reason: string, t: ReasonLabel): string {
  const idx = reason.indexOf(":");
  const head = (idx < 0 ? reason : reason.slice(0, idx)).trim();
  const key = REASON_KEYS[head as keyof typeof REASON_KEYS];
  if (!key) return reason;
  const tail = idx < 0 ? "" : reason.slice(idx + 1).trim();
  return tail ? `${t(key)}: ${tail}` : t(key);
}
