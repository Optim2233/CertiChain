import { describe, expect, it } from "vitest"
import { splitDisputeReason, translateDisputeReason } from "./dispute-reason"

// Stand-in for next-intl's t(): returns the key so assertions stay readable.
const t = (key: "incorrectDetails" | "notMine" | "other") => `T:${key}`

describe("splitDisputeReason", () => {
  it("splits a category from the graduate's free text", () => {
    expect(splitDisputeReason("Incorrect details: my GPA shows 3.1", t)).toEqual({
      category: "T:incorrectDetails",
      detail: "my GPA shows 3.1",
    })
  })

  it("returns an empty detail when only a category was picked", () => {
    expect(splitDisputeReason("Not my credential", t)).toEqual({
      category: "T:notMine",
      detail: "",
    })
  })

  it("keeps a colon inside the explanation with the detail", () => {
    expect(splitDisputeReason("Other: wrong date: should be 2025", t)).toEqual({
      category: "T:other",
      detail: "wrong date: should be 2025",
    })
  })

  it("passes an unrecognised category through verbatim rather than mangling it", () => {
    // Legacy or hand-written reasons must not be split into a bogus category.
    expect(splitDisputeReason("Something else entirely", t)).toEqual({
      category: "Something else entirely",
      detail: "",
    })
  })
})

describe("translateDisputeReason", () => {
  // Still used by the timeline and institution views, so the joined form must not drift.
  it("rejoins category and detail", () => {
    expect(translateDisputeReason("Incorrect details: my GPA shows 3.1", t)).toBe(
      "T:incorrectDetails: my GPA shows 3.1",
    )
  })

  it("returns the category alone when there is no detail", () => {
    expect(translateDisputeReason("Other", t)).toBe("T:other")
  })

  it("passes an unrecognised reason through unchanged", () => {
    expect(translateDisputeReason("Something else entirely", t)).toBe("Something else entirely")
  })
})
