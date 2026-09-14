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
  // Issuer branding, so a verified credential renders in the institution's own colours
  // rather than falling back to a hash of its name. The backend has always sent these;
  // they were missing from this type, so every consumer silently dropped them.
  institutionBrandColor: string | null;
  institutionSecondaryBrandColor: string | null;
  institutionLogoUrl: string | null;
  institutionAccentPattern: string | null;
  institutionAccentColor: string | null;
  institutionWatermarkOpacity: number | null;
  institutionPatternScale: string | null;
  institutionCardRadius: string | null;
  institutionTitleFont: string | null;
  institutionLogoShape: string | null;
  institutionMedalStyle: string | null;
  institutionMedalShape: string | null;
  institutionMedalSize: string | null;
  institutionWatermarkIcon: string | null;
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
