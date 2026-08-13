// Shared status enums used across all portals — see
// context_kit/wireframes-reference.md "Notes for implementation": one small
// set of well-named statuses, not per-portal reinventions.

export type InstitutionStatus =
  | "pending"
  | "approved"
  | "suspended"
  | "rejected"
  | "revoked";

export type CredentialStatus = "issued" | "revoked";

export type BatchRowStatus = "valid" | "error";

export type VerificationResult = "verified" | "revoked" | "invalid";
