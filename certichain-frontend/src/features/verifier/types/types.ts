export type VerificationResult = 'VERIFIED' | 'REVOKED' | 'EXPIRED' | 'INVALID_NOT_FOUND' | 'SHARE_REVOKED';

export interface DisclosedField {
  name: string;
  value: string;
}

export interface VerificationResponse {
  result: VerificationResult;
  credentialTitle: string | null;
  issuedTo: string | null;
  institutionName: string | null;
  institutionStatus: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  disclosedFields: DisclosedField[];
  signatureDetails: string | null;
  // Only present on SHARE_REVOKED - the backend returns a distinct
  // {result, message} shape for a revoked share *link* (vs a revoked credential).
  message?: string;
}

export type ShareRevokedResponse = { result: 'SHARE_REVOKED'; message: string };
export type ShareTimelineWrapper = { scope: string; results: VerificationResponse[] };
export type ShareVerificationResponse = VerificationResponse | VerificationResponse[] | ShareRevokedResponse | ShareTimelineWrapper;

/** Row of the unauthenticated directory (`GET /api/verify/institutions`).
 *  Narrower than the AA `Institution` - no keys, no PII, no branding knobs. */
export interface PublicInstitution {
  id: string;
  name: string;
  ministry: string | null;
  status: 'APPROVED' | 'SUSPENDED';
  institutionType: string | null;
  stateRegion: string | null;
  district: string | null;
  decidedAt: string | null;
  website: string | null;
  profileImageUrl: string | null;
  brandColor: string | null;
}

export interface TrustStats {
  institutionCount: number;
  verificationCount: number;
}

export interface BulkVerifyRow {
  input: string;
  result: VerificationResult;
  credentialTitle: string | null;
  issuedTo: string | null;
}

export interface VerifierState {
  lastResult: VerificationResponse | null;
  setLastResult: (result: VerificationResponse | null) => void;
  clearLastResult: () => void;
}
