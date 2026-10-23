// Institution application lookups. `value` is the backend contract — never
// change it. `label` is display-only so raw codes never reach the UI.

export interface Lookup {
  value: string
  label: string
}

export const CATEGORIES: Lookup[] = [
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "degreeCollege", label: "Degree College" },
  { value: "institute", label: "Institute" },
  { value: "center", label: "Center" },
]

export const MINISTRIES: Lookup[] = [
  { value: "Ministry of Education", label: "Ministry of Education" },
  { value: "Ministry of Science and Technology", label: "Ministry of Science and Technology" },
  { value: "Ministry of Health", label: "Ministry of Health" },
  { value: "Ministry of Defence", label: "Ministry of Defence" },
  { value: "Ministry of Religious Affairs", label: "Ministry of Religious Affairs" },
]

export const DOC_TYPES: Lookup[] = [
  { value: "establishmentLaw", label: "Establishment Law" },
  { value: "establishmentAct", label: "Establishment Act" },
  { value: "governmentOrder", label: "Government Order" },
  { value: "governmentDecree", label: "Government Decree" },
  { value: "subDecree", label: "Sub-Decree" },
]

export function lookupLabel(list: Lookup[], value: string | undefined, fallback = "—"): string {
  if (!value) return fallback
  return list.find((l) => l.value === value)?.label ?? value
}
